// server.js
import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import crypto from "crypto";

dotenv.config();

const app = express();
app.use(express.static("public"));
app.use(express.json());

const {
  SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET,
  SPOTIFY_REDIRECT_URI,
  PORT = process.env.PORT || 3000,
  ADMIN_SECRET
} = process.env;

/* ---------------- Helpers ---------------- */
const TOKEN_FILE = path.join(process.cwd(), "refresh_token.json");
const toMs = (iso) => new Date(iso).getTime() || 0;
const noStore = (res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  res.set("Pragma", "no-cache");
};

/* ---------------- Server-side OAuth state ---------------- */
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
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/x-www-form-urlencoded" },
    body
  });
  if (!r.ok) return null;
  const data = await r.json();
  return data.access_token || null;
}

/* ==========================================================
   STATE: now + snapshot + local recent + 500ms "tick"
   ========================================================== */
let lastNow = { playing: false };          // senaste "nu spelas" vi visar utåt
let rawIsPlaying = false;                  // vad Spotify sa senaste fetch
let lastFetchTs = 0;

let lastTrackSnapshot = null;              // senaste aktiva track (för pausvy)
let lastTrackSeenAt = 0;                   // när vi senast uppdaterade snapshot
const SNAPSHOT_TTL_MS = 2 * 60 * 1000;     // snapshot giltighet

// Lokal recent-historik: fylls endast när låt byts (via now playing)
let localRecent = [];                      // newest-first, objekt: {id,title,artists,image,url,played_at}
const LOCAL_RECENT_MAX = 50;

/* Utilities */
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
  // undvik dubbletter i rad på samma id
  if (localRecent[0]?.id === entry.id) return;
  localRecent.unshift(entry);
  if (localRecent.length > LOCAL_RECENT_MAX) localRecent.length = LOCAL_RECENT_MAX;
}

/* --------- Spotify fetch (ca 1 Hz) --------- */
async function refreshFromSpotify() {
  try {
    const at = await getAccessToken();
    if (!at) { rawIsPlaying = false; return; }

    const r = await fetch("https://api.spotify.com/v1/me/player/currently-playing?additional_types=track", {
      headers: { Authorization: `Bearer ${at}` }
    });
    lastFetchTs = Date.now();

    if (r.status === 204) {
      // inget spelas
      rawIsPlaying = false;
      lastNow = { playing:false };
      return;
    }
    if (!r.ok) {
      rawIsPlaying = false;
      lastNow = { playing:false };
      return;
    }

    const json = await r.json();
    const isPlaying = !!json?.is_playing;
    rawIsPlaying = isPlaying;

    if (!isPlaying) {
      // Spelas inte → lastNow sätts till playing:false,
      // men vi behåller snapshot separat (för pausvy) i endpoints.
      lastNow = { playing:false };
      return;
    }

    const payload = simplifyTrack(json);

    // Trackbyte? Skjut in föregående i localRecent
    if (lastTrackSnapshot?.id && lastTrackSnapshot.id !== payload.id) {
      pushLocalRecentFrom(lastTrackSnapshot);
    }

    // Uppdatera "lastNow" (serverns sanna nu-låt)
    lastNow = payload;

    // Uppdatera snapshot till senaste aktiva låt
    lastTrackSnapshot = { ...payload };
    lastTrackSeenAt = Date.now();

  } catch (e) {
    // nätverksfel → gör inget; tick-loopen sköter progress om playing
  }
}

/* --------- 500ms tick för progress ---------
   När rawIsPlaying = true (enligt senaste fetch), "tackar" vi upp progress_ms
   lokalt mellan Spotify-förfrågningar för att klienten ska få 2 Hz uppdateringar.
------------------------------------------------*/
const TICK_MS = 500;
setInterval(() => {
  if (!rawIsPlaying) return;
  if (!lastTrackSnapshot?.id) return;
  // öka progress i snapshot
  if (typeof lastTrackSnapshot.progress_ms === "number" && typeof lastTrackSnapshot.duration_ms === "number") {
    const next = Math.min(
      lastTrackSnapshot.duration_ms,
      (lastTrackSnapshot.progress_ms || 0) + TICK_MS
    );
    lastTrackSnapshot.progress_ms = next;

    // spegla även i lastNow om det är samma spår
    if (lastNow?.id === lastTrackSnapshot.id) {
      lastNow.progress_ms = next;
    }
  }
}, TICK_MS);

/* --------- Kör Spotify-fetch ca 1 Hz --------- */
setInterval(refreshFromSpotify, 1000);

/* ---------------- Endpoints ---------------- */

// Stabil "nu spelas"
app.get("/now-playing", (_req, res) => {
  noStore(res);
  if (lastNow?.playing && lastTrackSnapshot?.id === lastNow.id) {
    // returnera upp-tickad version
    return res.json({ ...lastNow });
  }
  // inte playing just nu
  return res.json({ playing:false });
});

// Snapshot för pausvy
app.get("/now-snapshot", (_req, res) => {
  noStore(res);
  const fresh = lastTrackSnapshot && (Date.now() - lastTrackSeenAt) < SNAPSHOT_TTL_MS;
  if (!fresh) return res.json({ playing:false });
  // snapshot "spelas" = true så klienten kan visa kortet; progress fryser när servern inte tickar
  return res.json({ ...lastTrackSnapshot, snapshot:true, playing:true });
});

// Recent från lokalt minne (endast byggt av track-byten)
app.get("/recent", (req, res) => {
  noStore(res);
  const excludeId = (req.query.exclude_id || "").trim() || null;

  const out = [];
  const seen = new Set();
  for (const it of localRecent) {
    if (excludeId && it.id === excludeId) continue;
    if (seen.has(it.id)) continue; // unik per track-id
    seen.add(it.id);
    out.push(it);
    if (out.length >= 3) break;
  }
  res.json({ items: out });
});

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
