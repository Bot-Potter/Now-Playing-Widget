// server.js
import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import cookieParser from "cookie-parser";
import crypto from "crypto";
import tmi from "tmi.js";

dotenv.config();

const app = express();
app.use(express.static("public"));
app.use(cookieParser(process.env.SESSION_SECRET || "secret"));

const {
  SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET,
  SPOTIFY_REDIRECT_URI,
  PORT = process.env.PORT || 3000,
  TWITCH_USERNAME,
  TWITCH_OAUTH_TOKEN,
  TWITCH_CHANNEL
} = process.env;

const TOKEN_FILE = path.join(process.cwd(), "refresh_token.json");

/* ---------- Helpers ---------- */
const getState = () => crypto.randomBytes(16).toString("hex");
const saveLocalRefresh = (rt) => { try { fs.writeFileSync(TOKEN_FILE, JSON.stringify({ refresh_token: rt }, null, 2)); } catch {} };
const loadRefresh = () => {
  if (process.env.REFRESH_TOKEN) return process.env.REFRESH_TOKEN;
  try { return JSON.parse(fs.readFileSync(TOKEN_FILE, "utf8")).refresh_token; } catch { return null; }
};
const noStore = (res) => { res.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0"); res.set("Pragma", "no-cache"); };
const toMs = (iso) => new Date(iso).getTime() || 0;

/* ---------- OAuth ---------- */
app.get("/login", (req, res) => {
  const scopes = [
    "user-read-currently-playing",
    "user-read-playback-state",
    "user-read-recently-played"
  ].join(" ");
  const state = getState();
  res.cookie("spotify_auth_state", state, { httpOnly: true, sameSite: "lax" });
  const p = new URLSearchParams({
    response_type: "code",
    client_id: SPOTIFY_CLIENT_ID,
    scope: scopes,
    redirect_uri: SPOTIFY_REDIRECT_URI,
    state
  });
  res.redirect("https://accounts.spotify.com/authorize?" + p.toString());
});

app.get("/callback", async (req, res) => {
  const { code, state } = req.query;
  const stored = req.cookies.spotify_auth_state;
  if (!state || state !== stored) return res.status(400).send("State mismatch");
  res.clearCookie("spotify_auth_state");

  const body = new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: SPOTIFY_REDIRECT_URI });
  const auth = "Basic " + Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64");

  const r = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST", headers: { Authorization: auth, "Content-Type": "application/x-www-form-urlencoded" }, body
  });
  const data = await r.json();
  if (!r.ok) return res.status(400).send("Token error: " + JSON.stringify(data));

  const rt = data.refresh_token;
  if (rt) {
    saveLocalRefresh(rt);
    console.log("\n=== COPY THIS REFRESH TOKEN TO Render ENV (REFRESH_TOKEN) ===\n", rt, "\n");
    return res.send(`<h2>Klart!</h2><p>Lägg in refresh token som REFRESH_TOKEN i Render och redeploya.</p><pre>${rt}</pre>`);
  }
  res.redirect("/");
});

/* ---------- Access token ---------- */
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
   STATE: now + optimistic bridge + history buffer
   ========================================================== */
let lastNow = { playing: false };
let optimisticQueue = [];
const OPTIMISTIC_TTL_MS = 30000;

let historyBuffer = [];
let lastSpotifyCursorMs = 0;
const HISTORY_MAX = 50;

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

function addToHistoryFromApi(items) {
  items.sort((a,b) => toMs(b.played_at) - toMs(a.played_at));
  const next = [...items, ...historyBuffer];
  const seenKey = new Set();
  const out = [];
  for (const it of next) {
    const key = `${it.id}@${it.played_at}`;
    if (seenKey.has(key)) continue;
    seenKey.add(key);
    out.push(it);
    if (out.length >= HISTORY_MAX) break;
  }
  historyBuffer = out.sort((a,b) => toMs(b.played_at) - toMs(a.played_at));
  const topPlayedAtMs = historyBuffer.length ? toMs(historyBuffer[0].played_at) : 0;
  if (topPlayedAtMs > lastSpotifyCursorMs) lastSpotifyCursorMs = topPlayedAtMs;
}

/* ---------- /now-playing ---------- */
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
      artists: (item.artists||[]).map(a=>a.name),
      album: item.album?.name || "",
      url: item.external_urls?.spotify || "",
      image: img,
      progress_ms: json.progress_ms || 0,
      duration_ms: item.duration_ms || 0
    };

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

/* ---------- /recent ---------- */
const RECENT_FETCH_MIN_MS = 1200;
let lastRecentFetchTs = 0;

async function fetchSpotifyRecent(afterMs) {
  const at = await getAccessToken();
  if (!at) return null;
  const url = new URL("https://api.spotify.com/v1/me/player/recently-played");
  url.searchParams.set("limit","50");
  if (afterMs && Number.isFinite(afterMs) && afterMs>0) url.searchParams.set("after", String(afterMs));
  const r = await fetch(url.toString(), { headers:{Authorization:`Bearer ${at}`} });
  if (!r.ok) return null;
  const json = await r.json();
  const normalized = (json.items||[])
    .filter(x => x.track && x.track.id && x.played_at)
    .map(it=>({
      id: it.track.id,
      title: it.track.name,
      artists: it.track.artists.map(a=>a.name),
      image: it.track.album?.images?.[0]?.url || "",
      url: it.track.external_urls?.spotify || "",
      played_at: it.played_at
    }));
  return normalized;
}

app.get("/recent", async (req, res) => {
  noStore(res);
  const excludeId = (req.query.exclude_id||"").trim()||null;
  try {
    const now = Date.now();
    if (now - lastRecentFetchTs >= RECENT_FETCH_MIN_MS) {
      lastRecentFetchTs = now;
      const pack = await fetchSpotifyRecent(lastSpotifyCursorMs);
      if (pack) addToHistoryFromApi(pack);
    }
    const nowTs = Date.now();
    const freshOptimistic = optimisticQueue.filter(o => (nowTs - toMs(o.played_at)) < OPTIMISTIC_TTL_MS);
    const merged = [...freshOptimistic, ...historyBuffer]
      .filter(x => (excludeId ? x.id !== excludeId : true))
      .sort((a,b) => toMs(b.played_at)-toMs(a.played_at));
    const seen=new Set(); const out=[];
    for(const it of merged){ if(seen.has(it.id)) continue; seen.add(it.id); out.push(it); if(out.length>=3) break; }
    return res.json({ items: out });
  } catch { return res.json({ items: [] }); }
});

/* ---------- SSE för overlay ---------- */
const sseClients = new Set();
app.get("/events",(req,res)=>{
  res.setHeader("Content-Type","text/event-stream");
  res.setHeader("Cache-Control","no-store");
  res.setHeader("Connection","keep-alive");
  res.flushHeaders?.();
  res.write(`: connected\n\n`);
  sseClients.add(res);
  const keep=setInterval(()=>{ if(res.writableEnded) return clearInterval(keep); res.write(`: ping ${Date.now()}\n\n`); },15000);
  req.on("close",()=>{clearInterval(keep);sseClients.delete(res);});
});
function broadcastSSE(type,payload){
  const data=`event: ${type}\n`+`data: ${JSON.stringify(payload)}\n\n`;
  for(const client of sseClients){ if(!client.writableEnded) client.write(data); }
}

/* ---------- Twitch listener ---------- */
if(TWITCH_USERNAME && TWITCH_OAUTH_TOKEN && TWITCH_CHANNEL){
  const tmiClient=new tmi.Client({
    identity:{username:TWITCH_USERNAME,password:TWITCH_OAUTH_TOKEN},
    channels:[TWITCH_CHANNEL]
  });
  tmiClient.connect().then(()=>console.log(`[tmi] Connected to #${TWITCH_CHANNEL}`));
  const SONG_CMD=/^(?:!song|!låt)\b/i;
  tmiClient.on("message",(channel,userstate,message,self)=>{
    if(self) return;
    if(SONG_CMD.test(message)){
      const by=userstate["display-name"]||userstate.username||"anon";
      broadcastSSE("song",{by,at:Date.now()});
      console.log(`[tmi] !song by ${by}`);
    }
  });
}else{
  console.warn("[tmi] Twitch-variabler saknas, hoppar över chat-listener");
}

/* ---------- Health ---------- */
app.get("/healthz",(_req,res)=>res.send("ok"));

app.listen(PORT,()=>console.log("Listening on :"+PORT));
