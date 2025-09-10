import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import cookieParser from "cookie-parser";
import crypto from "crypto";
dotenv.config();

const app = express();
app.use(express.static("public"));
app.use(cookieParser(process.env.SESSION_SECRET || "secret"));

const {
  SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET,
  SPOTIFY_REDIRECT_URI,
  REFRESH_TOKEN,
  PORT = process.env.PORT || 3000
} = process.env;

const TOKEN_FILE = path.join(process.cwd(), "refresh_token.json");

/* ---------- Helpers ---------- */
const getState = () => crypto.randomBytes(16).toString("hex");
const saveLocalRefresh = (rt) => { try { fs.writeFileSync(TOKEN_FILE, JSON.stringify({ refresh_token: rt }, null, 2)); } catch {} };
const loadRefresh = () => {
  if (process.env.REFRESH_TOKEN) return process.env.REFRESH_TOKEN;
  try { return JSON.parse(fs.readFileSync(TOKEN_FILE, "utf8")).refresh_token; } catch { return null; }
};
function noStore(res) {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  res.set("Pragma", "no-cache");
}

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
  if (!state || state !== req.cookies.spotify_auth_state) return res.status(400).send("State mismatch");
  res.clearCookie("spotify_auth_state");

  const body = new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: SPOTIFY_REDIRECT_URI });
  const auth = "Basic " + Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64");

  const r = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/x-www-form-urlencoded" },
    body
  });
  const data = await r.json();

  if (!r.ok) return res.status(400).send("Token error: " + JSON.stringify(data));

  const rt = data.refresh_token;
  if (rt) {
    saveLocalRefresh(rt);
    console.log("\n=== COPY THIS REFRESH TOKEN TO Render ENV (REFRESH_TOKEN) ===\n", rt, "\n");
    return res.send(`
      <style>body{font-family:system-ui;padding:24px}</style>
      <h2>Klart!</h2>
      <p>Kopiera din <b>refresh token</b> och lägg den som miljövariabel <code>REFRESH_TOKEN</code> i Render.</p>
      <pre style="background:#111;color:#0f0;padding:12px;border-radius:8px;white-space:break-spaces">${rt}</pre>
      <p>När den är sparad: <b>Redeploy</b>.</p>
    `);
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
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/x-www-form-urlencoded" },
    body
  });
  if (!r.ok) return null;
  const data = await r.json();
  return data.access_token || null;
}

/* ---------- /now-playing ---------- */
app.get("/now-playing", async (_req, res) => {
  noStore(res);
  try {
    const at = await getAccessToken();
    if (!at) return res.json({ playing: false, message: "Ingen användare kopplad än." });

    const r = await fetch("https://api.spotify.com/v1/me/player/currently-playing?additional_types=track,episode", {
      headers: { Authorization: `Bearer ${at}` }
    });

    if (r.status === 204) return res.json({ playing: false });
    if (!r.ok) return res.json({ playing: false });

    const json = await r.json();
    if (!json?.is_playing) return res.json({ playing: false });

    const isEpisode = json.currently_playing_type === "episode";
    const item = json.item || {};
    const img = (isEpisode ? item.images : item.album?.images)?.[0]?.url || "";

    res.json({
      playing: true,
      type: isEpisode ? "episode" : "track",
      id: item.id || "",
      title: item.name || "",
      artists: isEpisode ? (item.show?.publisher ? [item.show.publisher] : []) : (item.artists?.map(a => a.name) || []),
      album: isEpisode ? (item.show?.name || "") : (item.album?.name || ""),
      url: item.external_urls?.spotify || "",
      image: img,
      progress_ms: json.progress_ms || 0,
      duration_ms: item.duration_ms || 0
    });
  } catch (e) {
    res.json({ playing: false, error: e.message });
  }
});

/* ---------- /recent med 5s server-cache & 429-hantering ---------- */
const RECENT_CACHE_MS = 5000;
let recentCache = { ts: 0, payload: { items: [] } };

app.get("/recent", async (_req, res) => {
  noStore(res);
  try {
    const now = Date.now();
    if (now - recentCache.ts < RECENT_CACHE_MS) {
      return res.json(recentCache.payload);
    }

    const at = await getAccessToken();
    if (!at) return res.json({ items: [], error: "no_token" });

    const r = await fetch("https://api.spotify.com/v1/me/player/recently-played?limit=25", {
      headers: { Authorization: `Bearer ${at}` }
    });

    if (r.status === 429) {
      // Respektera backoff om vi får den
      const retry = parseInt(r.headers.get("retry-after") || "5", 10) * 1000;
      recentCache.ts = now + Math.max(retry, RECENT_CACHE_MS);
      return res.json(recentCache.payload); // skicka senaste kända
    }

    if (!r.ok) {
      const txt = await r.text().catch(() => "");
      return res.json({ items: [], error: `spotify_${r.status}`, detail: txt });
    }

    const json = await r.json();
    const seen = new Set();
    const out = [];

    for (const it of json.items || []) {
      const track = it.track;
      if (!track || !track.id) continue;
      if (seen.has(track.id)) continue;
      seen.add(track.id);
      out.push({
        id: track.id,
        title: track.name || "",
        artists: (track.artists || []).map(a => a.name),
        image: track.album?.images?.[0]?.url || "",
        url: track.external_urls?.spotify || ""
      });
      if (out.length >= 6) break; // lite slack till frontenden
    }

    recentCache = { ts: now, payload: { items: out } };
    res.json(recentCache.payload);
  } catch (e) {
    res.json({ items: [], error: "server_error", detail: e.message });
  }
});

/* ---------- Health ---------- */
app.get("/healthz", (_req, res) => res.send("ok"));

app.listen(PORT, () => console.log("Listening on :" + PORT));
