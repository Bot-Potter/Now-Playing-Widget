// lib/spotifyFetch.js
import fetch from "node-fetch";
import { getAccessToken } from "./spotifyClient.js";
import AbortController from "abort-controller";

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

export async function spotifyFetchJSON(url, {
  method = "GET",
  retries = 3,
  baseDelayMs = 500,
  timeoutMs = 5000,
} = {}) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const at = await getAccessToken();
    const controller = new AbortController();
    const to = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const r = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${at}` },
        signal: controller.signal,
      });
      clearTimeout(to);

      if (r.status === 401 && attempt < retries) {         // token expired
        await sleep(baseDelayMs * (attempt + 1) + Math.random()*200);
        continue;
      }
      if (r.status === 429 && attempt < retries) {         // rate limit
        const ra = parseFloat(r.headers.get("retry-after") || "1");
        await sleep((isFinite(ra) ? ra*1000 : baseDelayMs*(attempt+1)));
        continue;
      }

      if (r.status === 204) return { status: 204, ok: true, json: null };
      if (r.ok) {
        const txt = await r.text();
        if (!txt.trim()) return { status: r.status, ok: true, json: null };
        return { status: r.status, ok: true, json: JSON.parse(txt) };
      }

      const errTxt = await r.text().catch(()=> "");
      const e = new Error(`spotify_http_${r.status}: ${errTxt}`);
      e.status = r.status;
      throw e;

    } catch (e) {
      clearTimeout(to);
      if (attempt < retries) {
        await sleep(baseDelayMs * Math.pow(2, attempt) + Math.random()*200);
        continue;
      }
      throw e;
    }
  }
}