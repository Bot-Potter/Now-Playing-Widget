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
const toMs = (iso) => new Date(iso).getTime() || 0;

/* ---------------- Server-side OAuth state ---------------- */
const pendingStates = new Map();
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
let OVERRIDE_REFRESH = null;
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
      <p>Scopes beviljade:</p>
      <pre>${(data.scope||"").split(" ").join("\n")}</pre>
      <p>Testa sedan <a href="/whoami">/whoami</a></p>
    `);
  } catch (e) {
    res.status(500).send("Callback error: " + e.message);
  }
});

/* ---------------- Spotify Access Token ---------------- */
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

/* ---------------- Now Playing ---------------- */
let lastNow = { playing: false };

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

    lastNow = payload;
    res.json(payload);
  } catch (e) {
    lastNow = { playing:false };
    res.json({ playing:false, error:e.message });
  }
});

/* ---------------- Recent Played: färskt varje gång ---------------- */
// Hjälpfunktion: hämta raw recent från Spotify
async function fetchRecentRaw(limit = 50) {
  const at = await getAccessToken();
  if (!at) return { ok:false, status:401, headers:{}, body:null };

  const url = new URL("https://api.spotify.com/v1/me/player/recently-played");
  url.searchParams.set("limit", String(Math.min(Math.max(limit, 1), 50)));

  const r = await fetch(url.toString(), { headers: { Authorization: `Bearer ${at}` } });
  const ct = r.headers.get("content-type") || "";
  const headers = {
    date: r.headers.get("date"),
    content_type: ct,
    cache_control: r.headers.get("cache-control"),
    retry_after: r.headers.get("retry-after"),
    spotify_trace_id: r.headers.get("spotify-trace-id")
  };

  const text = await r.text();
  let body = null;
  try { body = JSON.parse(text); } catch { body = text; }

  return { ok: r.ok, status: r.status, headers, body };
}

// /recent – topp 3 (unik per låt som default). ?dupes=1 för att TILLÅTA dubbletter (renaste “3 senaste spelningar”)
app.get("/recent", async (req, res) => {
  noStore(res);
  try {
    const allowDupes = String(req.query.dupes||"").toLowerCase() === "1" || String(req.query.distinct||"") === "0";
    const excludeId = (req.query.exclude_id || "").trim();

    const out = await fetchRecentRaw(50);
    if (!out.ok || !out.body || !Array.isArray(out.body.items)) {
      return res.status(out.status || 500).json({ items: [], error: out.body || "recent_fetch_failed", meta: out.headers });
    }

    const mapped = out.body.items
      .filter(it => it?.track?.id && it?.played_at)
      .map(it => ({
        id: it.track.id,
        title: it.track.name || "",
        artists: (it.track.artists || []).map(a => a.name),
        image: it.track.album?.images?.[0]?.url || "",
        url: it.track.external_urls?.spotify || "",
        played_at: it.played_at
      }))
      .sort((a, b) => toMs(b.played_at) - toMs(a.played_at));

    const result = [];
    const seen = new Set();
    for (const it of mapped) {
      if (excludeId && it.id === excludeId) continue;
      if (!allowDupes) {
        if (seen.has(it.id)) continue;
        seen.add(it.id);
      }
      result.push(it);
      if (result.length >= 3) break;
    }
    return res.json({ items: result });
  } catch (e) {
    return res.json({ items: [], error: String(e) });
  }
});

// /recent/raw – råsvar från Spotify (för felsökning)
app.get("/recent/raw", async (_req, res) => {
  noStore(res);
  const out = await fetchRecentRaw(20);
  // Skicka tillbaka som ärligt JSON-objekt med metadata
  return res.status(out.status || 500).json(out);
});

// /recent/diagnose – kort sammanfattning med tider
app.get("/recent/diagnose", async (_req, res) => {
  noStore(res);
  try {
    const who = await (async () => {
      const at = await getAccessToken();
      if (!at) return null;
      const r = await fetch("https://api.spotify.com/v1/me", { headers: { Authorization: `Bearer ${at}` } });
      if (!r.ok) return null;
      return r.json();
    })();

    const now = lastNow;
    const out = await fetchRecentRaw(10);
    const items = Array.isArray(out.body?.items) ? out.body.items : [];

    const mapped = items
      .filter(it => it?.track?.id && it?.played_at)
      .map(it => ({
        id: it.track.id,
        title: it.track.name,
        artists: (it.track.artists||[]).map(a=>a.name),
        played_at: it.played_at,
        ago_s: Math.round((Date.now() - toMs(it.played_at)) / 1000)
      }))
      .sort((a,b)=> toMs(b.played_at)-toMs(a.played_at));

    const nowInRecent = now?.playing ? mapped.some(x => x.id === now.id) : false;

    res.json({
      ok: true,
      whoami: who ? { id: who.id, name: who.display_name, product: who.product } : null,
      now,
      now_in_recent: nowInRecent,
      recent_count: mapped.length,
      recent_top: mapped.slice(0,10),
      raw_meta: { status: out.status, headers: out.headers }
    });
  } catch (e) {
    res.status(500).json({ ok:false, error:String(e) });
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

/* ---------------- Twitch listener ---------------- */
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

app.get("/env-check", (_req, res) => {
  const fromEnv = !!process.env.REFRESH_TOKEN;
  const len = process.env.REFRESH_TOKEN ? process.env.REFRESH_TOKEN.length : 0;
  res.json({ has_env_refresh: fromEnv, env_refresh_len: len, has_override: !!OVERRIDE_REFRESH });
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
