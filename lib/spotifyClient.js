// lib/spotifyClient.js
import fetch from "node-fetch";
import fs from "fs/promises";
import path from "path";

const {
  SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET,
  SPOTIFY_REFRESH_TOKEN,
} = process.env;

const TOKEN_PATH = path.join(process.cwd(), ".spotify_token.json");

let cache = { access_token: null, expires_at: 0 };
let refreshing = null;

async function loadDisk() {
  try {
    const raw = await fs.readFile(TOKEN_PATH, "utf8");
    const j = JSON.parse(raw);
    if (j?.access_token && j?.expires_at) cache = j;
  } catch {}
}
async function saveDisk() {
  try { await fs.writeFile(TOKEN_PATH, JSON.stringify(cache), "utf8"); } catch {}
}
const aboutToExpire = () => Date.now() > (cache.expires_at - 60_000);

async function refreshAccessToken() {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: SPOTIFY_REFRESH_TOKEN,
    }).toString();

    const r = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Authorization": "Basic " + Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    if (!r.ok) {
      const t = await r.text().catch(()=> "");
      refreshing = null;
      throw new Error("spotify_refresh_failed: " + t);
    }
    const j = await r.json();
    cache.access_token = j.access_token;
    cache.expires_at = Date.now() + (j.expires_in ?? 3600) * 1000;
    await saveDisk();
    refreshing = null;
    return cache.access_token;
  })();
  return refreshing;
}

export async function getAccessToken() {
  if (!cache.access_token) await loadDisk();
  if (!cache.access_token || aboutToExpire()) await refreshAccessToken();
  return cache.access_token;
}