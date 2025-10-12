import fetch from "node-fetch";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

const {
  SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET,
  REFRESH_TOKEN
} = process.env;

const TOKEN_FILE = path.join(process.cwd(), "refresh_token.json");

let tokenCache = {
  access_token: null,
  expires_at: 0,
  last_refresh: 0,
  refresh_in_progress: false
};

function loadRefreshToken() {
  if (REFRESH_TOKEN) return REFRESH_TOKEN;
  try {
    return JSON.parse(fs.readFileSync(TOKEN_FILE, "utf8")).refresh_token;
  } catch {
    return null;
  }
}

export async function getAccessToken() {
  if (tokenCache.refresh_in_progress) {
    let attempts = 0;
    while (tokenCache.refresh_in_progress && attempts < 50) {
      await new Promise(r => setTimeout(r, 100));
      attempts++;
    }
  }

  if (tokenCache.access_token && Date.now() < (tokenCache.expires_at - 300_000)) {
    return tokenCache.access_token;
  }

  const refresh_token = loadRefreshToken();
  if (!refresh_token) return null;

  try {
    tokenCache.refresh_in_progress = true;

    const auth = "Basic " + Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64");
    const body = new URLSearchParams({ grant_type: "refresh_token", refresh_token });

    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/x-www-form-urlencoded" },
      body
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    tokenCache.access_token = data.access_token;
    tokenCache.expires_at = Date.now() + (data.expires_in * 1000);
    tokenCache.last_refresh = Date.now();
    tokenCache.refresh_in_progress = false;

    return tokenCache.access_token;
  } catch (e) {
    tokenCache.refresh_in_progress = false;
    throw e;
  }
}
