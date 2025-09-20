// lib/spotifyFetch.js
import fetch from "node-fetch";
import { getAccessToken } from "./spotifyClient.js";
import AbortController from "abort-controller";

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

let cache = {
  access_token: null,
  expires_at: 0,
  last_refresh: 0,
  refresh_in_progress: false
};

let consecutiveFailures = 0;
const MAX_FAILURES = 3;
const FAILURE_BACKOFF_MS = 30000; // 30 seconds

export async function getAccessToken() {
  // If refresh is in progress, wait for it
  if (cache.refresh_in_progress) {
    let attempts = 0;
    while (cache.refresh_in_progress && attempts < 50) { // max 5 seconds wait
      await new Promise(r => setTimeout(r, 100));
      attempts++;
    }
  }

  // Return cached token if still valid (with 5-minute buffer)
  if (cache.access_token && Date.now() < (cache.expires_at - 300_000)) {
    return cache.access_token;
  }

  try {
    cache.refresh_in_progress = true;
    console.log("[spotify] Refreshing access token...");
    
    const auth = "Basic " + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
    
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/x-www-form-urlencoded" },
      body,
      timeout: 10000 // 10 second timeout for token refresh
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    cache.access_token = data.access_token;
    cache.expires_at = Date.now() + (data.expires_in * 1000);
    cache.last_refresh = Date.now();
    consecutiveFailures = 0;
    cache.refresh_in_progress = false;
    
    console.log(`[spotify] Token refreshed successfully. Expires in ${data.expires_in}s`);
    return cache.access_token;
  } catch (e) {
    cache.refresh_in_progress = false;
    consecutiveFailures++;
    console.error(`[spotify] Token refresh failed (attempt ${consecutiveFailures}/${MAX_FAILURES}):`, e.message);
    
    throw e;
  }
}

export async function spotifyFetchJSON(url, {
  method = "GET",
  retries = 3,
  baseDelayMs = 500,
  timeoutMs = 10000, // Increased timeout
} = {}) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    let at;
    try {
      at = await getAccessToken();
    } catch (e) {
      console.error(`[spotify-fetch] Failed to get access token on attempt ${attempt + 1}:`, e.message);
      if (attempt < retries) {
        await sleep(baseDelayMs * Math.pow(2, attempt) + Math.random() * 200);
        continue;
      }
      throw e;
    }
    
    const controller = new AbortController();
    const to = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const r = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${at}` },
        signal: controller.signal,
      });
      clearTimeout(to);

      if (r.status === 401 && attempt < retries) {
        console.warn(`[spotify-fetch] 401 Unauthorized on attempt ${attempt + 1}, retrying...`);
        await sleep(baseDelayMs * (attempt + 1) + Math.random() * 200);
        continue;
      }
      
      if (r.status === 429 && attempt < retries) {
        const ra = parseFloat(r.headers.get("retry-after") || "1");
        continue;
      }

      if (r.status === 204) return { status: 204, ok: true, json: null };
      if (r.ok) {
        const txt = await r.text();
        if (!txt.trim()) return { status: r.status, ok: true, json: null };
        try {
          return { status: r.status, ok: true, json: JSON.parse(txt) };
        } catch (parseError) {
          console.error("[spotify-fetch] JSON parse error:", parseError.message, "Response:", txt.slice(0, 200));
          throw new Error(`json_parse_error: ${parseError.message}`);
        }
      }

      const errTxt = await r.text().catch(()=> "");
      const e = new Error(`spotify_http_${r.status}: ${errTxt}`);
      e.status = r.status;
      throw e;

    } catch (e) {
      clearTimeout(to);
      
      // Handle specific error types
      if (e.name === 'AbortError') {
        console.warn(`[spotify-fetch] Request timeout on attempt ${attempt + 1}`);
      } else if (e.code === 'ENOTFOUND' || e.code === 'ECONNRESET') {
        console.warn(`[spotify-fetch] Network error on attempt ${attempt + 1}:`, e.code);
      } else {
        console.warn(`[spotify-fetch] Error on attempt ${attempt + 1}:`, e.message);
      }
      
      if (attempt < retries) {
        const waitMs = baseDelayMs * Math.pow(2, attempt) + Math.random() * 200;
        await sleep(waitMs);
        continue;
      }
      throw e;
    }
  }
}