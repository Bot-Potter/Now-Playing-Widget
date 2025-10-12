// lib/spotifyFetch.js
import fetch from "node-fetch";
import { getAccessToken } from "./spotifyClient.js";
import AbortController from "abort-controller";

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

export async function spotifyFetchJSON(url, {
  method = "GET",
  retries = 2,
  baseDelayMs = 500,
  timeoutMs = 8000, // 8 second timeout for frequent calls
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
        const waitMs = Math.max(250, ra * 1000);
        await sleep(waitMs);
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