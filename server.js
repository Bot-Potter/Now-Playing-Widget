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
  const stored = req.cookies.spotify_auth_state;
  if (!state || state !== stored) return res.status(400).send("State mismatch");
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
      <p>Spara & redeploya, sen kan du stänga denna flik.</p>
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

/* ---------- /now-playing (ingen cache) ---------- */
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

/* ---------- /recent (cache 1s, exclude_id, sträng ordning) ---------- */
const RECENT_CACHE_MS = 1000;
let recentCache = { ts: 0, raw: null };

function buildRecent(json, excludeId = null) {
  const items = (json?.items || [])
    .filter(x => x && x.track && x.track.id && x.played_at)
    .sort((a, b) => new Date(b.played_at) - new Date(a.played_at));

  const seen = new Set();
  const out = [];

  for (const it of items) {
    const tr = it.track;
    const id = tr.id;
    if (excludeId && id === excludeId) continue;     // exkludera nu-spelas
    if (seen.has(id)) continue;                      // dedupe
    seen.add(id);

    out.push({
      id,
      title: tr.name || "",
      artists: (tr.artists || []).map(a => a.name),
      image: tr.album?.images?.[0]?.url || "",
      url: tr.external_urls?.spotify || "",
      played_at: it.played_at
    });

    if (out.length >= 3) break; // vi skickar exakt topp 3
  }
  return out;
}

app.get("/recent", async (req, res) => {
  noStore(res);
  try {
    const excludeId = (req.query.exclude_id || "").trim() || null;
    const now = Date.now();

    const at = await getAccessToken();
    if (!at) return res.json({ items: [] });

    // cache 1s
    if (now - recentCache.ts > RECENT_CACHE_MS) {
      const r = await fetch("https://api.spotify.com/v1/me/player/recently-played?limit=25", {
        headers: { Authorization: `Bearer ${at}` }
      });

      if (r.status === 429) {
        // throttling: använd gammal raw om vi har en
        if (!recentCache.raw) return res.json({ items: [] });
      } else if (r.ok) {
        recentCache.raw = await r.json();
        recentCache.ts = now;
      } else {
        // annat fel → använd rå cache om finns
        if (!recentCache.raw) return res.json({ items: [] });
      }
    }

    const list = buildRecent(recentCache.raw, excludeId);
    return res.json({ items: list });
  } catch (e) {
    return res.json({ items: [] });
  }
});

/* ---------- Health ---------- */
app.get("/healthz", (_req, res) => res.send("ok"));

app.listen(PORT, () => console.log("Listening on :" + PORT));
