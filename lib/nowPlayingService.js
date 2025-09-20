// lib/spotifyFetch.js
import fetch from "node-fetch";
import { getAccessToken } from "./spotifyClient.js";
import AbortController from "abort-controller";

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

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

export async function getNowPlayingRobust() {
  // 1) current
  const cur = await spotifyFetchJSON("https://api.spotify.com/v1/me/player/currently-playing", {
    retries: 1, // Reduce retries for frequent calls
    timeoutMs: 5000 // Shorter timeout for real-time updates
  });
  if (cur.status === 204 || !cur.json) {
    // 2) fallback to recently played (<=30 min)
    const rec = await spotifyFetchJSON("https://api.spotify.com/v1/me/player/recently-played?limit=1", {
      retries: 1,
      timeoutMs: 5000
    });
    const item = rec.json?.items?.[0];
    const track = item?.track;
    const playedAt = item ? new Date(item.played_at).getTime() : 0;
    const fresh = Date.now() - playedAt < 30 * 60_000;

    if (fresh && track) return cache(track, "paused");

    // 3) serve cached lastKnown for 15 min
    if (Date.now() - lastKnown.ts < 15 * 60_000 && lastKnown.payload) {
      return lastKnown.payload;
    }
    return shape(null, "inactive");
  }

  const d = cur.json;
  const isPlaying = !!d.is_playing;
  const track = d.item ?? d.track ?? null;
  if (!track) return shape(null, "inactive");

  return cache(track, isPlaying ? "playing" : "paused");
}