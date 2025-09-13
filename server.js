// server.js (recent byggs av now-playing snapshots + pausflagga till client)
import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import tmi from "tmi.js";

dotenv.config();

const app = express();
app.use(express.static("public"));
app.use(express.json());

const {
  SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET,
  SPOTIFY_REDIRECT_URI,
  PORT = process.env.PORT || 3000,
  TWITCH_USERNAME,
  TWITCH_OAUTH_TOKEN,
  TWITCH_CHANNEL,
  ADMIN_SECRET
} = process.env;

/* --------------------------------- Helpers -------------------------------- */
const DATA_DIR = process.cwd();
const TOKEN_FILE = path.join(DATA_DIR, "refresh_token.json");
const PLAYS_FILE = path.join(DATA_DIR, "plays.log.jsonl");  // JSON Lines
const noStore = (res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  res.set("Pragma", "no-cache");
};
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const toMs = (iso) => new Date(iso).getTime() || 0;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

/* ----------------------- OAuth state (cookie-less) ------------------------ */
const STATE_TTL_MS = 10 * 60 * 1000;
const pendingStates = new Map();
const newState = () => crypto.randomBytes(16).toString("hex");
const addState = (s) => pendingStates.set(s, Date.now() + STATE_TTL_MS);
const consumeState = (s) => {
  const exp = pendingStates.get(s);
  if (!exp) return false;
  pendingStates.delete(s);
  return exp > Date.now();
};
setInterval(() => {
  const now = Date.now();
  for (const [k, exp] of pendingStates.entries()) if (exp <= now) pendingStates.delete(k);
}, 60_000);

/* --------------------------- Refresh-token källor ------------------------- */
let OVERRIDE_REFRESH = null;
const loadRefresh = () => {
  if (OVERRIDE_REFRESH) return OVERRIDE_REFRESH;
  if (process.env.REFRESH_TOKEN) return process.env.REFRESH_TOKEN;
  try { return JSON.parse(fs.readFileSync(TOKEN_FILE, "utf8")).refresh_token; } catch { return null; }
};

/* ------------------------------ Spotify OAuth ----------------------------- */
app.get("/login", (_req, res) => {
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET || !SPOTIFY_REDIRECT_URI) {
    return res.status(500).send("Missing Spotify ENV vars");
  }
  const scopes = [
    "user-read-currently-playing",
    "user-read-playback-state",
    "user-read-recently-played"
  ].join(" ");

  const state = newState();
  addState(state);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: SPOTIFY_CLIENT_ID,
    scope: scopes,
    redirect_uri: SPOTIFY_REDIRECT_URI,
    state
  });
  res.redirect("https://accounts.spotify.com/authorize?" + params.toString());
});

app.get("/callback", async (req, res) => {
  const { code, state, error } = req.query;
  if (error) return res.status(400).send("Spotify error: " + error);
  if (!state || !consumeState(state)) return res.status(400).send("State mismatch/expired");
  if (!code) return res.status(400).send("Missing code");

  try {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: SPOTIFY_REDIRECT_URI
    });
    const auth = "Basic " + Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64");

    const r = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/x-www-form-urlencoded" },
      body
    });

    const text = await r.text();
    let data = null; try { data = JSON.parse(text); } catch {}
    if (!r.ok || !data) return res.status(400).send("Token error: " + text);

    const rt = data.refresh_token;
    if (!rt) return res.status(400).send("Ingen refresh_token i svaret. Ta bort access i Spotify Account > Apps och prova igen.");

    try { fs.writeFileSync(TOKEN_FILE, JSON.stringify({ refresh_token: rt }, null, 2)); } catch {}

    res.send(`
      <style>body{font-family:system-ui;padding:24px;line-height:1.45}</style>
      <h2>Klart!</h2>
      <p>Lägg denna som <code>REFRESH_TOKEN</code> i Render (eller POST:a till <code>/admin/set-refresh</code>):</p>
      <pre style="background:#111;color:#0f0;padding:12px;border-radius:8px">${rt}</pre>
      <p>Scopes beviljade:</p>
      <pre>${(data.scope||"").split(" ").join("\\n")}</pre>
      <p>Testa sedan <a href="/whoami">/whoami</a>.</p>
    `);
  } catch (e) {
    res.status(500).send("Callback error: " + e.message);
  }
});

/* --------------------------- Access token via RT -------------------------- */
async function getAccessToken() {
  const refresh_token = loadRefresh();
  if (!refresh_token) return null;

  const auth = "Basic " + Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64");
  const body = new URLSearchParams({ grant_type: "refresh_token", refresh_token });

  const r = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/x-www-form-urlencoded" },
    body
  });
  if (!r.ok) return null;
  const data = await r.json();
  return data.access_token || null;
}

/* ============================ Playback-snapshot =========================== */
const MIN_LISTEN_MS = 5000;
const PLAYS_MAX = 500;
const PLAYS_RETENTION_DAYS = 14;
const POLL_INTERVAL_MS = 1000;

let plays = [];           // nyast först
const seenKeys = new Set();
function prunePlays() {
  const cutoff = Date.now() - PLAYS_RETENTION_DAYS*24*3600*1000;
  plays = plays.filter(p => toMs(p.started_at) >= cutoff).slice(0, PLAYS_MAX);
  seenKeys.clear();
  for (const p of plays) seenKeys.add(`${p.id}@${p.started_at}`);
}
function loadPlaysFromDisk() {
  try {
    if (!fs.existsSync(PLAYS_FILE)) return;
    const rows = fs.readFileSync(PLAYS_FILE, "utf8").trim().split("\n").filter(Boolean);
    const acc = [];
    for (const line of rows.slice(-1000)) { try { acc.push(JSON.parse(line)); } catch {} }
    acc.sort((a,b)=> toMs(b.started_at)-toMs(a.started_at));
    plays = acc.slice(0, PLAYS_MAX);
    for (const p of plays) seenKeys.add(`${p.id}@${p.started_at}`);
    prunePlays();
    console.log("[plays] loaded", plays.length);
  } catch (e) { console.warn("[plays] load error", e.message); }
}
function appendPlay(p) {
  const key = `${p.id}@${p.started_at}`;
  if (seenKeys.has(key)) return;
  seenKeys.add(key);
  plays.unshift(p);
  prunePlays();
  try { fs.appendFileSync(PLAYS_FILE, JSON.stringify(p) + "\n"); } catch {}
}

let lastNow = { playing:false };   // exponeras via /now-playing
let lastTrack = null;              // internt

let pollingStarted = false;
let backoffUntil = 0;

async function pollLoop() {
  if (pollingStarted) return;
  pollingStarted = true;

  for (;;) {
    const now = Date.now();
    if (now < backoffUntil) {
      await sleep(backoffUntil - now);
      continue;
    }
    try {
      const at = await getAccessToken();
      if (!at) {
        lastNow = { playing:false };
        await sleep(2000);
        continue;
      }

      const r = await fetch("https://api.spotify.com/v1/me/player/currently-playing?additional_types=track", {
        headers: { Authorization: `Bearer ${at}` }
      });

      if (r.status === 429) {
        const ra = Number(r.headers.get("retry-after") || 5);
        backoffUntil = Date.now() + clamp(ra, 1, 3600) * 1000;
        continue;
      }

      if (r.status === 204) {
        // inget spelas och ingen paus-info – stäng kortet
        lastNow = { playing:false };
        await sleep(POLL_INTERVAL_MS);
        continue;
      }

      if (!r.ok) {
        await sleep(POLL_INTERVAL_MS);
        continue;
      }

      const json = await r.json();
      const item = json?.item || null;
      const isPlaying = !!json?.is_playing;

      if (!item) {
        // ingen item – visa tomt
        lastNow = { playing:false };
        await sleep(POLL_INTERVAL_MS);
        continue;
      }

      const progress_ms = json.progress_ms || 0;
      const duration_ms = item.duration_ms || 0;
      const start_ts = Date.now() - progress_ms;

      const current = {
        id: item.id || "",
        title: item.name || "",
        artists: (item.artists||[]).map(a=>a.name),
        album: item.album?.name || "",
        url: item.external_urls?.spotify || "",
        image: item.album?.images?.[0]?.url || "",
        duration_ms,
        progress_ms,
        start_ts,
        last_seen_ts: Date.now()
      };

      // Låtbyte?
      if (lastTrack?.id && current.id !== lastTrack.id) {
        const listened = (lastTrack.last_seen_ts || Date.now()) - (lastTrack.start_ts || Date.now());
        if (listened >= MIN_LISTEN_MS) {
          appendPlay({
            id: lastTrack.id,
            title: lastTrack.title,
            artists: lastTrack.artists,
            image: lastTrack.image,
            url: lastTrack.url,
            started_at: new Date(lastTrack.start_ts).toISOString(),
            ended_at: new Date((lastTrack.start_ts || Date.now()) + (lastTrack.duration_ms || listened)).toISOString(),
            listened_ms: listened
          });
        }
      } else if (lastTrack?.id === current.id) {
        if (typeof lastTrack.progress_ms === "number" && progress_ms + 1500 < lastTrack.progress_ms) {
          current.start_ts = Date.now() - progress_ms;
        } else {
          current.start_ts = Math.min(current.start_ts, lastTrack.start_ts || current.start_ts);
        }
      }
      lastTrack = current;

      // Publikt snapshot:
      if (isPlaying) {
        lastNow = {
          playing: true,
          paused: false,
          type: "track",
          id: current.id,
          title: current.title,
          artists: current.artists,
          album: current.album,
          url: current.url,
          image: current.image,
          progress_ms,
          duration_ms
        };
      } else {
        // PAUS: behåll kortet med pausad tid
        lastNow = {
          playing: false,
          paused: true,
          type: "track",
          id: current.id,
          title: current.title,
          artists: current.artists,
          album: current.album,
          url: current.url,
          image: current.image,
          progress_ms,
          duration_ms
        };
      }

    } catch (e) {
      // ignore
    }

    await sleep(POLL_INTERVAL_MS);
  }
}

loadPlaysFromDisk();
pollLoop();

/* ----------------------------- Publika endpoints -------------------------- */
app.get("/now-playing", (req, res) => {
  noStore(res);
  res.json(lastNow || { playing:false });
});

// recent byggt av plays-loggen
app.get("/recent", (req, res) => {
  noStore(res);
  const clampNum=(v,min,max)=>Math.max(min,Math.min(max, v|0));
  let limit = clampNum(parseInt(req.query.limit || "3", 10) || 3, 1, 50);
  const allowDupes = String(req.query.dupes||"").toLowerCase() === "1" || String(req.query.distinct||"") === "0";
  const excludeId = (req.query.exclude_id || "").trim();

  const items = [...plays].sort((a,b)=> toMs(b.started_at)-toMs(a.started_at));
  const out = [];
  const seen = new Set();
  for (const p of items) {
    if (!p.id) continue;
    if (excludeId && p.id === excludeId) continue;
    if (!allowDupes) { if (seen.has(p.id)) continue; seen.add(p.id); }
    out.push({
      id: p.id, title: p.title, artists: p.artists, image: p.image, url: p.url, played_at: p.started_at
    });
    if (out.length >= limit) break;
  }
  res.json({ items: out });
});

app.get("/recent/raw", (_req, res) => {
  noStore(res);
  res.json({ count: plays.length, items: plays.slice(0, 50) });
});

app.get("/whoami", async (_req, res) => {
  noStore(res);
  try {
    const at = await getAccessToken();
    if (!at) return res.status(400).json({ ok:false, error:"no_access_token" });
    const r = await fetch("https://api.spotify.com/v1/me", { headers: { Authorization: `Bearer ${at}` }});
    const ct = r.headers.get("content-type") || "";
    const bodyText = await r.text();
    let bodyJson = null; try { bodyJson = JSON.parse(bodyText); } catch {}
    if (!r.ok) return res.status(r.status).json({ ok:false, status:r.status, content_type: ct, error: bodyJson || bodyText.slice(0,200) });
    return res.json({ ok:true, id: bodyJson.id, display_name: bodyJson.display_name, product: bodyJson.product, country: bodyJson.country });
  } catch (e) { return res.status(500).json({ ok:false, error:String(e) }); }
});

/* ------------------------------ Admin utils ------------------------------- */
app.get("/env-check", (_req, res) => {
  const fromEnv = !!process.env.REFRESH_TOKEN;
  const len = process.env.REFRESH_TOKEN ? process.env.REFRESH_TOKEN.length : 0;
  res.json({ has_env_refresh: fromEnv, env_refresh_len: len, has_override: !!OVERRIDE_REFRESH });
});

app.post("/admin/set-refresh", express.text({ type: "*/*" }), (req, res) => {
  if (!ADMIN_SECRET || req.headers["x-admin-secret"] !== ADMIN_SECRET) return res.status(401).send("unauthorized");
  const rt = (req.body || "").trim();
  if (!rt) return res.status(400).send("missing token");
  OVERRIDE_REFRESH = rt;
  console.log("[admin] REFRESH_TOKEN override set (len=%d)", rt.length);
  res.send("ok");
});

app.post("/admin/clear-plays", (req, res) => {
  if (!ADMIN_SECRET || req.headers["x-admin-secret"] !== ADMIN_SECRET) return res.status(401).send("unauthorized");
  plays = [];
  seenKeys.clear();
  try { fs.unlinkSync(PLAYS_FILE); } catch {}
  res.json({ ok:true, cleared:true });
});

/* --------------------------- SSE (Twitch/Overlay) ------------------------- */
const sseClients = new Set();
app.get("/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();
  res.write(`: connected\n\n`);
  sseClients.add(res);
  const keep = setInterval(() => {
    if (res.writableEnded) return clearInterval(keep);
    res.write(`: ping ${Date.now()}\n\n`);
  }, 15000);
  req.on("close", () => { clearInterval(keep); sseClients.delete(res); });
});
function broadcastSSE(type, payload) {
  const data = `event: ${type}\n` + `data: ${JSON.stringify(payload)}\n\n`;
  for (const client of sseClients) if (!client.writableEnded) client.write(data);
}

/* ------------------------------ Twitch listener --------------------------- */
if (TWITCH_USERNAME && TWITCH_OAUTH_TOKEN && TWITCH_CHANNEL) {
  const tmiClient = new tmi.Client({
    identity: { username: TWITCH_USERNAME, password: TWITCH_OAUTH_TOKEN },
    channels: [ TWITCH_CHANNEL ]
  });
  tmiClient.connect().then(() =>
    console.log(`[tmi] Connected to #${TWITCH_CHANNEL}`)
  ).catch(err => console.error("[tmi] connect error", err));

  const SONG_CMD = /^(?:!song|!l\u00E5t)\b/i;
  tmiClient.on("message", (_channel, userstate, message, self) => {
    if (self) return;
    if (SONG_CMD.test(message)) {
      const by = userstate["display-name"] || userstate.username || "someone";
      broadcastSSE("song", { by, at: Date.now() });
      console.log(`[tmi] !song by ${by}`);
    }
  });
} else {
  console.warn("[tmi] Twitch vars missing, skipping chat listener");
}

/* --------------------------------- Health --------------------------------- */
app.get("/healthz", (_req, res) => res.send("ok"));

app.listen(PORT, () => {
  console.log("Listening on :" + PORT);
  console.log("ENV REFRESH_TOKEN length:", process.env.REFRESH_TOKEN ? process.env.REFRESH_TOKEN.length : 0);
});
