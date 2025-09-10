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
   STATE: now + snapshot + optimistic bridge + history buffer
   ========================================================== */
let lastNow = { playing: false };

let lastTrackSnapshot = null; // senaste playing:true payload
let lastTrackSeenAt = 0;
const SNAPSHOT_TTL_MS = 2 * 60 * 1000;

let optimisticQueue = []; // {id,title,artists[],image,url,played_at}
const OPTIMISTIC_TTL_MS = 30000;

// Recent buffer
let historyBuffer = [];   // newest-first; unique by id@played_at
const HISTORY_MAX = 50;

// Spotify "Recently Played" cursor + fetch-timers
let recentCursor = null;              // Spotify-respons: cursors.after (string ms)
let lastRecentFetchTs = 0;
const RECENT_FETCH_MIN_MS = 1500;     // snällare för att undvika 429
let recentBackoffUntil = 0;           // backoff vid 429

function pushOptimisticFromNow(nowObj) {
  if (!nowObj || !nowObj.id) return;
  optimisticQueue.unshift({
    id: nowObj.id,
    title: nowObj.title || "",
    artists: nowObj.artists || [],
    image: nowObj.image || "",
    url: nowObj.url || "",
    played_at: new Date().toISOString()
  });
  const seen = new Set();
  const nowTs = Date.now();
  optimisticQueue = optimisticQueue.filter(x => {
    const fresh = (nowTs - toMs(x.played_at)) < OPTIMISTIC_TTL_MS;
    const key = x.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return fresh;
  });
}

/* ---------------- /now-playing ---------------- */
app.get("/now-playing", async (_req, res) => {
  noStore(res);
  try {
    const at = await getAccessToken();
    if (!at) { lastNow = { playing:false }; return res.json({ playing:false }); }

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

    // snapshot så overlay kan falla tillbaka
    lastTrackSnapshot = payload;
    lastTrackSeenAt = Date.now();

    // tryck in föregående i optimistic-kö om track bytts
    if (lastNow?.playing && lastNow?.id && lastNow.id !== payload.id) {
      pushOptimisticFromNow(lastNow);
    }
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

/* ---------------- Spotify Recent helpers (cursor + reset + backoff) ---------------- */
async function fetchSpotifyRecentPage(afterCursor) {
  const at = await getAccessToken();
  if (!at) return { items: null, cursor: null, status: 401 };

  const url = new URL("https://api.spotify.com/v1/me/player/recently-played");
  url.searchParams.set("limit", "50");
  if (afterCursor) url.searchParams.set("after", String(afterCursor));

  const r = await fetch(url.toString(), { headers: { Authorization: `Bearer ${at}` } });
  const status = r.status;

  if (status === 429) {
    const ra = Number(r.headers.get("retry-after") || 2);
    recentBackoffUntil = Date.now() + ra * 1000;
    return { items: null, cursor: null, status };
  }
  if (!r.ok) return { items: null, cursor: null, status };

  const json = await r.json();

  const items = (json.items || [])
    .filter(it => it?.track?.id && it?.played_at)
    .map(it => ({
      id: it.track.id,
      title: it.track.name || "",
      artists: (it.track.artists || []).map(a => a.name),
      image: it.track.album?.images?.[0]?.url || "",
      url: it.track.external_urls?.spotify || "",
      played_at: it.played_at
    }));

  const cursor = json.cursors?.after ? String(json.cursors.after) : null;
  return { items, cursor, status: 200 };
}

async function refreshRecent() {
  const now = Date.now();
  if (now < recentBackoffUntil) return; // under backoff
  if (now - lastRecentFetchTs < RECENT_FETCH_MIN_MS) return;
  lastRecentFetchTs = now;

  // 1) Försök med cursor (incremental)
  let page = await fetchSpotifyRecentPage(recentCursor);

  // 2) Om inget nytt → reset (full fetch)
  if (page.status === 200 && (!page.items || page.items.length === 0)) {
    page = await fetchSpotifyRecentPage(null);
  }
  if (page.status === 429) return; // backoff satt
  if (page.status !== 200 || !page.items) return;

  const merged = [...page.items, ...historyBuffer];
  const seen = new Set();
  const next = [];
  for (const it of merged.sort((a,b)=> toMs(b.played_at) - toMs(a.played_at))) {
    const key = `${it.id}@${it.played_at}`;
    if (seen.has(key)) continue;
    seen.add(key);
    next.push(it);
    if (next.length >= HISTORY_MAX) break;
  }
  historyBuffer = next;

  if (page.cursor) recentCursor = page.cursor;
}

/* ---------------- /recent (stabil) ---------------- */
app.get("/recent", async (req, res) => {
  noStore(res);
  try {
    await refreshRecent();

    const excludeId = (req.query.exclude_id || "").trim() || null;
    const nowTs = Date.now();
    const freshOptimistic = optimisticQueue.filter(o => (nowTs - toMs(o.played_at)) < OPTIMISTIC_TTL_MS);

    // slå ihop optimistic + buffer, sortera och filtrera
    const merged = [...freshOptimistic, ...historyBuffer]
      .filter(x => (excludeId ? x.id !== excludeId : true))
      .sort((a,b) => toMs(b.played_at) - toMs(a.played_at));

    // topp 3, unik på track-id (vill du visa dubbla spelningar – ta bort seenId)
    const out = [];
    const seenId = new Set();
    for (const it of merged) {
      if (seenId.has(it.id)) continue;
      seenId.add(it.id);
      out.push(it);
      if (out.length >= 3) break;
    }

    res.json({ items: out });
  } catch (e) {
    res.json({ items: [], error: String(e) });
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
