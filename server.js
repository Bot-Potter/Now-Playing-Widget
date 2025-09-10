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

/* ---------------- State store för OAuth ---------------- */
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
    if (!r.ok || !data) {
      return res.status(400).send("Token error: " + text);
    }

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

/* ---------------- Global state ---------------- */
let lastNow = { playing: false };
let lastTrackSnapshot = null;
let lastTrackSeenAt = 0;
const SNAPSHOT_TTL_MS = 2 * 60 * 1000;
let optimisticQueue = [];
const OPTIMISTIC_TTL_MS = 30000;
let historyBuffer = [];
let lastSpotifyCursorMs = 0;
const HISTORY_MAX = 50;

/* ---------------- now-playing ---------------- */
app.get("/now-playing", async (_req, res) => {
  noStore(res);
  try {
    const at = await getAccessToken();
    if (!at) return res.json({ playing:false });

    const r = await fetch("https://api.spotify.com/v1/me/player/currently-playing?additional_types=track", {
      headers: { Authorization: `Bearer ${at}` }
    });

    if (r.status === 204) return res.json({ playing:false });
    if (!r.ok) return res.json({ playing:false });

    const json = await r.json();
    if (!json?.is_playing) return res.json({ playing:false });

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
  } catch {
    res.json({ playing:false });
  }
});

/* ---------------- snapshot ---------------- */
app.get("/now-snapshot", (_req, res) => {
  noStore(res);
  const fresh = lastTrackSnapshot && (Date.now() - lastTrackSeenAt) < SNAPSHOT_TTL_MS;
  if (fresh) return res.json({ ...lastTrackSnapshot, snapshot:true });
  return res.json({ playing:false });
});

/* ---------------- recent ---------------- */
app.get("/recent", async (req, res) => {
  noStore(res);
  const excludeId = (req.query.exclude_id || "").trim() || null;
  try {
    const at = await getAccessToken();
    if (!at) return res.json({ items:[] });

    const url = new URL("https://api.spotify.com/v1/me/player/recently-played");
    url.searchParams.set("limit","10");
    const r = await fetch(url.toString(), { headers: { Authorization: `Bearer ${at}` } });
    if (!r.ok) return res.json({ items:[] });
    const json = await r.json();

    const items = (json.items||[]).map(it=>({
      id: it.track.id,
      title: it.track.name,
      artists: it.track.artists.map(a=>a.name),
      image: it.track.album?.images?.[0]?.url || "",
      url: it.track.external_urls?.spotify || "",
      played_at: it.played_at
    }));

    const out = excludeId ? items.filter(x=>x.id !== excludeId) : items;
    res.json({ items: out.slice(0,3) });
  } catch {
    res.json({ items:[] });
  }
});

/* ---------------- SSE ---------------- */
const sseClients = new Set();
app.get("/events", (req,res)=>{
  res.setHeader("Content-Type","text/event-stream");
  res.setHeader("Cache-Control","no-store");
  res.setHeader("Connection","keep-alive");
  res.flushHeaders?.();
  res.write(`: connected\n\n`);
  sseClients.add(res);
  req.on("close",()=>sseClients.delete(res));
});
function broadcastSSE(type,payload){
  const data = `event: ${type}\n` + `data: ${JSON.stringify(payload)}\n\n`;
  for (const c of sseClients) if (!c.writableEnded) c.write(data);
}

/* ---------------- Twitch listener ---------------- */
if (TWITCH_USERNAME && TWITCH_OAUTH_TOKEN && TWITCH_CHANNEL) {
  const tmiClient = new tmi.Client({
    identity:{ username:TWITCH_USERNAME, password:TWITCH_OAUTH_TOKEN },
    channels:[TWITCH_CHANNEL]
  });
  tmiClient.connect().then(()=>console.log(`[tmi] Connected to #${TWITCH_CHANNEL}`));
  const SONG_CMD = /^(?:!song|!låt)\b/i;
  tmiClient.on("message",(_ch,u,m,self)=>{
    if(self) return;
    if(SONG_CMD.test(m)){
      const by = u["display-name"]||u.username||"someone";
      broadcastSSE("song",{by,at:Date.now()});
      console.log(`[tmi] !song by ${by}`);
    }
  });
}

/* ---------------- Admin/debug ---------------- */
app.get("/env-check",(_req,res)=>{
  const fromEnv = !!process.env.REFRESH_TOKEN;
  res.json({ has_env_refresh:fromEnv, len:process.env.REFRESH_TOKEN?.length||0, has_override:!!OVERRIDE_REFRESH });
});

app.get("/whoami", async (_req,res)=>{
  noStore(res);
  try {
    const at = await getAccessToken();
    if (!at) return res.json({ ok:false, error:"no_access_token" });
    const r = await fetch("https://api.spotify.com/v1/me",{headers:{Authorization:`Bearer ${at}`}});
    const text = await r.text();
    let data=null; try{data=JSON.parse(text);}catch{}
    if(!r.ok) return res.json({ ok:false, status:r.status, body:text.slice(0,200) });
    if(!data) return res.json({ ok:false, error:"non_json", snippet:text.slice(0,200) });
    res.json({ ok:true, id:data.id, display_name:data.display_name, product:data.product, country:data.country });
  } catch(e) {
    res.json({ ok:false, error:String(e) });
  }
});

app.post("/admin/set-refresh", express.text({type:"*/*"}), (req,res)=>{
  if(!ADMIN_SECRET || req.headers["x-admin-secret"]!==ADMIN_SECRET) return res.status(401).send("unauthorized");
  const rt = (req.body||"").trim();
  if(!rt) return res.status(400).send("missing token");
  OVERRIDE_REFRESH = rt;
  console.log("[admin] REFRESH_TOKEN override set len=%d", rt.length);
  res.send("ok");
});

/* ---------------- Health ---------------- */
app.get("/healthz",(_req,res)=>res.send("ok"));

app.listen(PORT,()=>console.log("Listening on :"+PORT));
