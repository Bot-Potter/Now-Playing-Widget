// server.js
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

/* ---------------- Helpers ---------------- */
const TOKEN_FILE = path.join(process.cwd(), "refresh_token.json");
const noStore = (res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  res.set("Pragma", "no-cache");
};

/* ---------------- Server-side OAuth state (cookie-fritt) ---------------- */
const pendingStates = new Map();           // state -> expiresAt (ms)
const STATE_TTL_MS = 10 * 60 * 1000;       // 10 min
const newState = () => crypto.randomBytes(16).toString("hex");
const addState = (st) => pendingStates.set(st, Date.now() + STATE_TTL_MS);
const consumeState = (st) => {
  const exp = pendingStates.get(st);
  if (!exp) return false;
  pendingStates.delete(st);
  return exp > Date.now();
};
setInterval(() => {
  const now = Date.now();
  for (const [k, exp] of pendingStates.entries()) if (exp <= now) pendingStates.delete(k);
}, 60_000);

/* ---------------- Refresh token hantering ---------------- */
let OVERRIDE_REFRESH = null; // kan sättas via /admin/set-refresh
const loadRefresh = () => {
  if (OVERRIDE_REFRESH) return OVERRIDE_REFRESH;
  if (process.env.REFRESH_TOKEN) return process.env.REFRESH_TOKEN;
  try { return JSON.parse(fs.readFileSync(TOKEN_FILE, "utf8")).refresh_token; } catch { return null; }
};

/* ---------------- Spotify OAuth ---------------- */
app.get("/login", (_req, res) => {
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET || !SPOTIFY_REDIRECT_URI) {
    return res.status(500).send("Missing Spotify ENV vars");
  }
  const scopes = [
    "user-read-currently-playing",
    "user-read-playback-state",
    // OBS: vi hämtar inte längre recently-played från Spotify – scope kvar för säkerhets skull
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
    if (!rt) {
      return res.status(400).send("Ingen refresh_token i svaret. Ta bort access i Spotify Account > Apps och prova igen.");
    }

    try { fs.writeFileSync(TOKEN_FILE, JSON.stringify({ refresh_token: rt }, null, 2)); } catch {}
    res.send(`
      <style>body{font-family:system-ui;padding:24px}</style>
      <h2>Klart!</h2>
      <p>Kopiera refresh tokenen och lägg den som <code>REFRESH_TOKEN</code> i Render (eller använd /admin/set-refresh).</p>
      <pre style="background:#111;color:#0f0;padding:12px;border-radius:8px">${rt}</pre>
      <p>Testa sedan <a href="/whoami">/whoami</a></p>
    `);
  } catch (e) {
    res.status(500).send("Callback error: " + e.message);
  }
});

/* ---------------- Spotify Access Token via refresh ---------------- */
async function getAccessToken() {
  const refresh_token = loadRefresh();
  if (!refresh_token) return null;

  const auth = "Basic " + Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64");
  const body = new URLSearchParams({ grant_type: "refresh_token", refresh_token });

  const r = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST", headers: { Authorization: auth, "Content-Type": "application/x-www-form-urlencoded" }, body
  });
  if (!r.ok) return null;
  const data = await r.json();
  return data.access_token || null;
}

/* ==========================================================
   STATE: snapshot + lokal recent byggd endast från now-playing
   ========================================================== */

// snapshot för paus/overlay
let lastTrackSnapshot = null;
let lastTrackSeenAt = 0;
const SNAPSHOT_TTL_MS = 2 * 60 * 1000;

// 2 Hz cache för now-playing
const NOW_MIN_INTERVAL_MS = 500;
let nowCache = { payload: { playing:false }, ts: 0 };

// "Aktuell låt" och starttid (estimerad som now - progress)
let currentNow = { playing: false, id: null, start_ts: null, payload: null };

// Lokal historik (nyast först), fylls ENDAST när vi detekterar spårsbyte
let localRecent = [];      // [{id,title,artists,image,url,played_at}]
const HISTORY_MAX = 100;

function pushToLocalRecent(entry){
  if (!entry?.id) return;
  localRecent.unshift(entry);
  // valfri dedupe på id (behåll senaste förekomst)
  const seen = new Set();
  localRecent = localRecent.filter(it => {
    if (seen.has(it.id)) return false;
    seen.add(it.id); return true;
  }).slice(0, HISTORY_MAX);
}

/* ---------------- /now-playing (med cache och lokal-recent) ---------------- */
app.get("/now-playing", async (_req, res) => {
  noStore(res);
  try {
    // 1) server-cache 500 ms
    const age = Date.now() - nowCache.ts;
    if (age < NOW_MIN_INTERVAL_MS) {
      return res.json(nowCache.payload);
    }

    const at = await getAccessToken();
    if (!at) {
      const payload = { playing:false };
      nowCache = { payload, ts: Date.now() };
      return res.json(payload);
    }

    const r = await fetch("https://api.spotify.com/v1/me/player/currently-playing?additional_types=track", {
      headers: { Authorization: `Bearer ${at}` }
    });

    if (r.status === 204) {
      const payload = { playing:false };
      nowCache = { payload, ts: Date.now() };
      return res.json(payload);
    }
    if (!r.ok) {
      const payload = { playing:false };
      nowCache = { payload, ts: Date.now() };
      return res.json(payload);
    }

    const json = await r.json();
    if (!json?.is_playing) {
      const payload = { playing:false };
      nowCache = { payload, ts: Date.now() };
      return res.json(payload);
    }

    const item = json.item || {};
    const img = item.album?.images?.[0]?.url || "";
    const payload = {
      playing: true,
      type: "track",
      id: item.id || "",
      title: item.name || "",
      artists: (item.artists||[]).map(a => a.name),
      album: item.album?.name || "",
      url: item.external_urls?.spotify || "",
      image: img,
      progress_ms: json.progress_ms || 0,
      duration_ms: item.duration_ms || 0
    };

    // --- Lokal recentlogik: om spår-id byts, skjut in förra spåret i historiken ---
    const nowTs = Date.now();
    const estStartTs = nowTs - (payload.progress_ms || 0);

    if (currentNow?.id && currentNow.id !== payload.id) {
      // lägg in tidigare spår med dess starttid
      pushToLocalRecent({
        id: currentNow.payload.id,
        title: currentNow.payload.title,
        artists: currentNow.payload.artists,
        image: currentNow.payload.image,
        url: currentNow.payload.url,
        played_at: new Date(currentNow.start_ts || nowTs).toISOString()
      });
    }

    // uppdatera nuvarande spår
    currentNow = { playing: true, id: payload.id, start_ts: estStartTs, payload };

    // snapshot för pausvy/overlay
    lastTrackSnapshot = payload;
    lastTrackSeenAt = Date.now();

    nowCache = { payload, ts: Date.now() };
    res.json(payload);
  } catch (e) {
    const payload = { playing:false, error:e.message };
    nowCache = { payload, ts: Date.now() };
    res.json(payload);
  }
});

/* ---------------- /now-snapshot (fallback för paus) ---------------- */
app.get("/now-snapshot", (_req, res) => {
  noStore(res);
  const fresh = lastTrackSnapshot && (Date.now() - lastTrackSeenAt) < SNAPSHOT_TTL_MS;
  if (fresh) return res.json({ ...lastTrackSnapshot, snapshot: true });
  return res.json({ playing: false });
});

/* ---------------- /recent (LOKAL – ej Spotify) ---------------- */
app.get("/recent", (req, res) => {
  noStore(res);
  try {
    const excludeId = (req.query.exclude_id || "").trim() || null;

    // Basera listan enbart på localRecent (nyast först). currentNow exkluderas separat.
    let list = localRecent;
    if (excludeId) list = list.filter(x => x.id !== excludeId);

    // Top 3 är lagom
    const items = list.slice(0, 3);

    res.json({ items });
  } catch (e) {
    res.json({ items: [], error: String(e) });
  }
});

/* ---------------- Extra debug (frivilligt) ---------------- */
app.get("/recent-debug", (_req, res) => {
  noStore(res);
  res.json({
    now: { id: currentNow.id, playing: currentNow.playing, start_ts: currentNow.start_ts ? new Date(currentNow.start_ts).toISOString() : null },
    history_count: localRecent.length,
    top5: localRecent.slice(0,5)
  });
});

/* ---------------- SSE för overlay ---------------- */
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
  for (const client of sseClients) {
    if (!client.writableEnded) client.write(data);
  }
}

/* ---------------- Twitch listener (tmi.js) ---------------- */
if (TWITCH_USERNAME && TWITCH_OAUTH_TOKEN && TWITCH_CHANNEL) {
  const tmiClient = new tmi.Client({
    identity: { username: TWITCH_USERNAME, password: TWITCH_OAUTH_TOKEN },
    channels: [ TWITCH_CHANNEL ]
  });
  tmiClient.connect().then(() =>
    console.log(`[tmi] Connected to #${TWITCH_CHANNEL}`)
  ).catch(err => console.error("[tmi] connect error", err));

  const SONG_CMD = /^(?:!song|!låt)\b/i;
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

/* ---------------- Admin & Debug ---------------- */
app.get("/env-check", (_req, res) => {
  const fromEnv = !!process.env.REFRESH_TOKEN;
  const len = process.env.REFRESH_TOKEN ? process.env.REFRESH_TOKEN.length : 0;
  res.json({ has_env_refresh: fromEnv, env_refresh_len: len, has_override: !!OVERRIDE_REFRESH });
});

app.get("/whoami", async (_req, res) => {
  noStore(res);
  try {
    const at = await getAccessToken();
    if (!at) return res.status(400).json({ ok:false, error:"no_access_token" });

    const r = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${at}` }
    });

    const ct = r.headers.get("content-type") || "";
    const bodyText = await r.text();
    let bodyJson = null;
    try { bodyJson = JSON.parse(bodyText); } catch {}

    if (!r.ok) {
      return res.status(r.status).json({
        ok:false,
        status:r.status,
        content_type: ct,
        error: bodyJson || bodyText.slice(0,200)
      });
    }

    if (bodyJson) {
      return res.json({
        ok:true,
        id: bodyJson.id,
        display_name: bodyJson.display_name,
        product: bodyJson.product,
        country: bodyJson.country
      });
    } else {
      return res.json({
        ok:false,
        status:r.status,
        content_type: ct,
        error: "non_json_response",
        snippet: bodyText.slice(0,200)
      });
    }
  } catch (e) {
    return res.status(500).json({ ok:false, error:String(e) });
  }
});

app.post("/admin/set-refresh", express.text({ type: "*/*" }), (req, res) => {
  if (!ADMIN_SECRET || req.headers["x-admin-secret"] !== ADMIN_SECRET) {
    return res.status(401).send("unauthorized");
  }
  const rt = (req.body || "").trim();
  if (!rt) return res.status(400).send("missing token");
  OVERRIDE_REFRESH = rt;
  console.log("[admin] REFRESH_TOKEN override set (len=%d)", rt.length);
  res.send("ok");
});

/* ---------------- Health ---------------- */
app.get("/healthz", (_req, res) => res.send("ok"));

app.listen(PORT, () => {
  console.log("Listening on :" + PORT);
  console.log("ENV REFRESH_TOKEN length:", process.env.REFRESH_TOKEN ? process.env.REFRESH_TOKEN.length : 0);
});
