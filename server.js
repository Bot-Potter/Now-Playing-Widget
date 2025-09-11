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

  // Twitch (valfritt – för overlay-triggers)
  TWITCH_USERNAME,
  TWITCH_OAUTH_TOKEN,
  TWITCH_CHANNEL,

  // Admin
  ADMIN_SECRET,

  // Server-side styrning (valfritt)
  RECENT_LIMIT = "10" // hur många vi hämtar från Spotify innan vi skär ned till 3
} = process.env;

/* ---------------- Helpers ---------------- */
const TOKEN_FILE = path.join(process.cwd(), "refresh_token.json");
const toMs = (iso) => new Date(iso).getTime() || 0;
const noStore = (res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  res.set("Pragma", "no-cache");
};

/* ---------------- Server-side OAuth state (cookie-fritt) ---------------- */
const pendingStates = new Map();           // state -> expiresAt (ms)
const STATE_TTL_MS = 10 * 60 * 1000;       // 10 min

function newState() { return crypto.randomBytes(16).toString("hex"); }
function addState(st) { pendingStates.set(st, Date.now() + STATE_TTL_MS); }
function consumeState(st) {
  const exp = pendingStates.get(st);
  if (!exp) return false;
  pendingStates.delete(st);
  return exp > Date.now();
}
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
app.get("/login", (req, res) => {
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
   NOW + SNAPSHOT
   ========================================================== */
let lastNow = { playing: false };
let lastTrackSnapshot = null; // senaste playing:true payload
let lastTrackSeenAt = 0;
const SNAPSHOT_TTL_MS = 2 * 60 * 1000;

/* ---------------- /now-playing ---------------- */
app.get("/now-playing", async (_req, res) => {
  noStore(res);
  try {
    const at = await getAccessToken();
    if (!at) { lastNow = { playing:false }; return res.json({ playing:false }); }

    // Obs: Spotify kan svara 204 No Content även när låt spelas (känt fenomen).
    // Vi hanterar det genom att svara playing:false i så fall. :contentReference[oaicite:1]{index=1}
    const r = await fetch("https://api.spotify.com/v1/me/player/currently-playing?additional_types=track", {
      headers: { Authorization: `Bearer ${at}` }
    });

    if (r.status === 204) { lastNow = { playing:false }; return res.json({ playing:false }); }
    if (!r.ok) { lastNow = { playing:false }; return res.json({ playing:false }); }

    const json = await r.json();
    if (!json?.is_playing) { lastNow = { playing:false }; return res.json({ playing:false }); }

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

    lastTrackSnapshot = payload;
    lastTrackSeenAt = Date.now();
    lastNow = payload;
    res.json(payload);
  } catch (e) {
    lastNow = { playing:false };
    res.json({ playing:false, error:e.message });
  }
});

/* ---------------- /now-snapshot (fallback för overlay) ---------------- */
app.get("/now-snapshot", (_req, res) => {
  noStore(res);
  const fresh = lastTrackSnapshot && (Date.now() - lastTrackSeenAt) < SNAPSHOT_TTL_MS;
  if (fresh) return res.json({ ...lastTrackSnapshot, snapshot: true });
  return res.json({ playing: false });
});

/* ==========================================================
   RECENT (enkel & robust)
   - Hämtar alltid senaste N (RECENT_LIMIT, default 10) från Spotify
   - Sorterar på played_at desc
   - Deduperar på track-id (ändra om du vill visa dubbla spelningar)
   - Respekterar 429 Retry-After och serverar cache under backoff
   ========================================================== */
let recentCache = { items: [], updatedAt: 0 };
let recentBackoffUntil = 0; // epoch ms

const mapRecentItems = (json) => (json.items || [])
  .filter(it => it?.track?.id && it?.played_at)
  .map(it => ({
    id: it.track.id,
    title: it.track.name || "",
    artists: (it.track.artists || []).map(a => a.name),
    image: it.track.album?.images?.[0]?.url || "",
    url: it.track.external_urls?.spotify || "",
    played_at: it.played_at
  }));

app.get("/recent", async (req, res) => {
  noStore(res);

  const excludeId = (req.query.exclude_id || "").trim() || null;
  const now = Date.now();

  // Under pågående backoff → svara cache
  if (now < recentBackoffUntil && recentCache.items.length) {
    const out = recentCache.items
      .filter(x => (excludeId ? x.id !== excludeId : true))
      .slice(0, 3);
    return res.json({ items: out });
  }

  try {
    const at = await getAccessToken();
    if (!at) {
      const out = recentCache.items
        .filter(x => (excludeId ? x.id !== excludeId : true))
        .slice(0, 3);
      return res.json({ items: out });
    }

    const url = new URL("https://api.spotify.com/v1/me/player/recently-played");
    // Officiell limit: 1..50 — vi tar t.ex. 10 för att vara snälla. :contentReference[oaicite:2]{index=2}
    url.searchParams.set("limit", String(Math.min(50, Math.max(1, parseInt(RECENT_LIMIT, 10) || 10))));

    const r = await fetch(url.toString(), { headers: { Authorization: `Bearer ${at}` } });

    // Hantera rate limit enligt docs (Retry-After i sekunder). :contentReference[oaicite:3]{index=3}
    if (r.status === 429) {
      const ra = Number(r.headers.get("retry-after") || 2);
      recentBackoffUntil = now + ra * 1000;
      const out = recentCache.items
        .filter(x => (excludeId ? x.id !== excludeId : true))
        .slice(0, 3);
      return res.json({ items: out });
    }

    if (!r.ok) {
      const out = recentCache.items
        .filter(x => (excludeId ? x.id !== excludeId : true))
        .slice(0, 3);
      return res.json({ items: out });
    }

    const json = await r.json();
    // Sortera på played_at desc; dedupera på track-id (vill du visa upprepningar: ta bort dedup)
    const mapped = mapRecentItems(json)
      .sort((a, b) => toMs(b.played_at) - toMs(a.played_at));

    const seen = new Set();
    const deduped = [];
    for (const it of mapped) {
      if (seen.has(it.id)) continue;
      seen.add(it.id);
      deduped.push(it);
      if (deduped.length >= 10) break;
    }

    recentCache = { items: deduped, updatedAt: now };

    const out = deduped
      .filter(x => (excludeId ? x.id !== excludeId : true))
      .slice(0, 3);

    res.json({ items: out });
  } catch (e) {
    const out = recentCache.items
      .filter(x => (excludeId ? x.id !== excludeId : true))
      .slice(0, 3);
    res.json({ items: out, error: String(e) });
  }
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
