// server.js
import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import tmi from "tmi.js";
import { twitchAuthRouter } from "./twitch-auth.js";

dotenv.config();

const app = express();
app.use(express.static("public"));
app.use(express.json());
app.use(twitchAuthRouter());

const {
  SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET,
  SPOTIFY_REDIRECT_URI,
  PORT = process.env.PORT || 3000,
  ADMIN_SECRET,

  // Twitch
  TWITCH_USERNAME,
  TWITCH_OAUTH_TOKEN,      // format: "oauth:xxxxxxxxxxxxxxxxxxxx"
  TWITCH_CHANNEL           // t.ex. "maccanzz" (lowercase)
} = process.env;

/* ---------------- Helpers ---------------- */
const TOKEN_FILE = path.join(process.cwd(), "refresh_token.json");
const toMs = (iso) => new Date(iso).getTime() || 0;
const noStore = (res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  res.set("Pragma", "no-cache");
};

/* ---------------- OAuth state ---------------- */
const pendingStates = new Map();           // state -> expiresAt (ms)
const STATE_TTL_MS = 10 * 60 * 1000;
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

/* ---------------- Refresh token ---------------- */
let OVERRIDE_REFRESH = null;
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
  "user-modify-playback-state"
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

/* ---------------- Access token via refresh ---------------- */
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

/* ==========================================================
   STATE: now + snapshot + local recent + 500ms tick
   ========================================================== */
let lastNow = { playing: false };
let rawIsPlaying = false;           // senaste Spotify-status (spelar/paus)
let lastTrackSnapshot = null;       // senast aktiva track (för paus)
let lastTrackSeenAt = 0;
const SNAPSHOT_TTL_MS = 2 * 60 * 1000;

let localRecent = [];               // byggs av spårbyten
const LOCAL_RECENT_MAX = 50;

function simplifyTrack(json) {
  const item = json?.item || {};
  return {
    playing: !!json?.is_playing,
    type: "track",
    id: item?.id || "",
    title: item?.name || "",
    artists: (item?.artists || []).map(a => a?.name).filter(Boolean),
    album: item?.album?.name || "",
    url: item?.external_urls?.spotify || "",
    image: item?.album?.images?.[0]?.url || "",
    progress_ms: json?.progress_ms ?? 0,
    duration_ms: item?.duration_ms ?? 0
  };
}

function pushLocalRecentFrom(prevTrack) {
  if (!prevTrack?.id) return;
  const entry = {
    id: prevTrack.id,
    title: prevTrack.title || "",
    artists: prevTrack.artists || [],
    image: prevTrack.image || "",
    url: prevTrack.url || "",
    played_at: new Date().toISOString()
  };
  if (localRecent[0]?.id === entry.id) return; // undvik dubbletter i rad
  localRecent.unshift(entry);
  if (localRecent.length > LOCAL_RECENT_MAX) localRecent.length = LOCAL_RECENT_MAX;
}

/* --------- Spotify fetch (var 500 ms) --------- */
async function refreshFromSpotify() {
  try {
    const at = await getAccessToken();
    if (!at) { rawIsPlaying = false; lastNow = { playing:false }; return; }

    const r = await fetch("https://api.spotify.com/v1/me/player/currently-playing?additional_types=track", {
      headers: { Authorization: `Bearer ${at}` }
    });

    if (r.status === 204) { rawIsPlaying = false; lastNow = { playing:false }; return; }
    if (!r.ok)          { rawIsPlaying = false; lastNow = { playing:false }; return; }

    const json = await r.json();
    const isPlaying = !!json?.is_playing;
    rawIsPlaying = isPlaying;

    if (!isPlaying) { lastNow = { playing:false }; return; }

    const payload = simplifyTrack(json);

    // Trackbyte? – lägg tidigare i localRecent
    if (lastTrackSnapshot?.id && lastTrackSnapshot.id !== payload.id) {
      pushLocalRecentFrom(lastTrackSnapshot);
    }

    lastNow = payload;
    lastTrackSnapshot = { ...payload };
    lastTrackSeenAt = Date.now();

  } catch {
    // nätverksfel ignoreras – ticken fortsätter endast när playing=true
  }
}

/* --------- 500 ms tick: öka progress lokalt när playing ---------- */
const TICK_MS = 500;
setInterval(() => {
  if (!rawIsPlaying) return;
  if (!lastTrackSnapshot?.id) return;
  if (typeof lastTrackSnapshot.progress_ms === "number" && typeof lastTrackSnapshot.duration_ms === "number") {
    const next = Math.min(lastTrackSnapshot.duration_ms, (lastTrackSnapshot.progress_ms || 0) + TICK_MS);
    lastTrackSnapshot.progress_ms = next;
    if (lastNow?.id === lastTrackSnapshot.id && lastNow.playing) {
      lastNow.progress_ms = next;
    }
  }
}, TICK_MS);

/* --------- Kör Spotify-fetch var 500 ms --------- */
setInterval(refreshFromSpotify, 500);

/* ---------------- API Endpoints ---------------- */

// Nu spelas
app.get("/now-playing", (_req, res) => {
  noStore(res);
  if (lastNow?.playing && lastTrackSnapshot?.id === lastNow.id) {
    return res.json({ ...lastNow });
  }
  return res.json({ playing:false });
});

// Snapshot/paus
app.get("/now-snapshot", (_req, res) => {
  noStore(res);
  const fresh = lastTrackSnapshot && (Date.now() - lastTrackSeenAt) < SNAPSHOT_TTL_MS;
  if (!fresh) return res.json({ playing:false });
  return res.json({ ...lastTrackSnapshot, snapshot:true, playing:false, paused:true });
});

// Recent från lokalt minne
app.get("/recent", (req, res) => {
  noStore(res);
  const excludeId = (req.query.exclude_id || "").trim() || null;

  const out = [];
  const seen = new Set();
  for (const it of localRecent) {
    if (excludeId && it.id === excludeId) continue;
    if (seen.has(it.id)) continue;
    seen.add(it.id);
    out.push(it);
    if (out.length >= 3) break;
  }
  res.json({ items: out });
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
  tmiClient.connect()
    .then(() => console.log(`[tmi] Connected to #${TWITCH_CHANNEL}`))
    .catch(err => console.error("[tmi] connect error", err));

  const SONG_CMD = /^(?:!song|!låt)\b/i;
  tmiClient.on("message", (_channel, userstate, message, self) => {
  if (self) return;
  if (SONG_CMD.test(message)) {
    const by = userstate["display-name"] || userstate.username || "someone";
    const tag = "@" + (userstate.username || by).replace(/\s+/g, ""); // säkert tag

    broadcastSSE("song", { by, at: Date.now() });
    console.log(`[tmi] !song by ${by}`);

    // Kolla ENV innan vi svarar i chatten
    if (process.env.TWITCH_REPLY_ON_COMMAND === "true") {
      try {
        let reply = "";
        if (lastNow?.playing && lastNow?.title) {
          const artists = (lastNow.artists || []).join(", ");
          const url = lastNow.url ? ` ${lastNow.url}` : "";
          reply = `${tag} Spelas nu: ${lastNow.title} – ${artists}.${url}`;
        } else {
          const fresh = lastTrackSnapshot && (Date.now() - lastTrackSeenAt) < SNAPSHOT_TTL_MS;
          if (fresh && lastTrackSnapshot.title) {
            const artists = (lastTrackSnapshot.artists || []).join(", ");
            const url = lastTrackSnapshot.url ? ` ${lastTrackSnapshot.url}` : "";
            reply = `${tag} Pausat/nyss spelat: ${lastTrackSnapshot.title} – ${artists}.${url}`;
          } else {
            reply = `${tag} Ingen låt spelas just nu.`;
          }
        }
        tmiClient.say(_channel, reply).catch(() => {});
      } catch {
        // svälj fel så vi inte krossar chat-listenern
      }
    }
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
    let bodyJson = null; try { bodyJson = JSON.parse(bodyText); } catch {}

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
