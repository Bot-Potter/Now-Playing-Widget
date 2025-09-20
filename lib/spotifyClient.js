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
let consecutiveFailures = 0;
const MAX_CONSECUTIVE_FAILURES = 3;
const FAILURE_BACKOFF_MS = 30000; // 30 seconds
let lastFailureTime = 0;

async function loadDisk() {
  try {
    const raw = await fs.readFile(TOKEN_PATH, "utf8");
    const j = JSON.parse(raw);
    if (j?.access_token && j?.expires_at) {
      cache = j;
      console.log("[spotify] Loaded cached token from disk, expires:", new Date(cache.expires_at).toISOString());
    }
  } catch {}
}

async function saveDisk() {
  try { 
    await fs.writeFile(TOKEN_PATH, JSON.stringify(cache), "utf8");
    console.log("[spotify] Saved token to disk, expires:", new Date(cache.expires_at).toISOString());
  } catch (e) {
    console.warn("[spotify] Failed to save token to disk:", e.message);
  }
}

const aboutToExpire = () => Date.now() > (cache.expires_at - 120_000); // 2 minutes buffer instead of 1

function shouldBackoff() {
  if (consecutiveFailures < MAX_CONSECUTIVE_FAILURES) return false;
  return Date.now() - lastFailureTime < FAILURE_BACKOFF_MS;
}

async function refreshAccessToken() {
  if (refreshing) return refreshing;
  
  if (shouldBackoff()) {
    console.warn("[spotify] Backing off due to consecutive failures");
    throw new Error("spotify_refresh_backoff");
  }

  refreshing = (async () => {
    try {
      console.log("[spotify] Refreshing access token...");
      
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
        timeout: 10000, // 10 second timeout
      });
      
      if (!r.ok) {
        const t = await r.text().catch(() => "");
        console.error("[spotify] Token refresh failed:", r.status, t);
        consecutiveFailures++;
        lastFailureTime = Date.now();
        refreshing = null;
        throw new Error(`spotify_refresh_failed_${r.status}: ${t}`);
      }
      
      const j = await r.json();
      
      if (!j.access_token) {
        console.error("[spotify] No access_token in response:", j);
        consecutiveFailures++;
        lastFailureTime = Date.now();
        refreshing = null;
        throw new Error("spotify_refresh_no_token");
      }
      
      cache.access_token = j.access_token;
      cache.expires_at = Date.now() + (j.expires_in ?? 3600) * 1000;
      
      await saveDisk();
      
      // Reset failure counter on success
      consecutiveFailures = 0;
      lastFailureTime = 0;
      
      console.log("[spotify] Token refreshed successfully, expires:", new Date(cache.expires_at).toISOString());
      refreshing = null;
      return cache.access_token;
      
    } catch (e) {
      consecutiveFailures++;
      lastFailureTime = Date.now();
      refreshing = null;
      console.error("[spotify] Token refresh exception:", e.message);
      throw e;
    }
  })();
  return refreshing;
}

export async function getAccessToken() {
  // Load from disk if we don't have a token in memory
  if (!cache.access_token) {
    await loadDisk();
  }
  
  // Check if we need to refresh
  if (!cache.access_token || aboutToExpire()) {
    try {
      await refreshAccessToken();
    } catch (e) {
      console.error("[spotify] Failed to get access token:", e.message);
      // If we have a cached token that's not too old (within 5 minutes of expiry), use it
      if (cache.access_token && Date.now() < (cache.expires_at + 300_000)) {
        console.warn("[spotify] Using potentially expired token as fallback");
        return cache.access_token;
      }
      throw e;
    }
  }
  
  return cache.access_token;
}