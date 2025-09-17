// lib/nowPlayingService.js
import { spotifyFetchJSON } from "./spotifyFetch.js";

let lastKnown = { trackId: null, payload: null, ts: 0 };

const shape = (track, status) => ({
  status, // "playing" | "paused" | "inactive"
  track: track ? {
    id: track.id,
    uri: track.uri,
    name: track.name,
    artists: track.artists?.map(a => a.name).join(", "),
    album: track.album?.name,
    cover: track.album?.images?.[0]?.url || null,
    external_url: track.external_urls?.spotify || null,
  } : null
});

function cache(track, status) {
  const payload = shape(track, status);
  lastKnown = {
    trackId: track?.id || track?.uri || null,
    payload,
    ts: Date.now(),
  };
  return payload;
}

export async function getNowPlayingRobust() {
  // 1) current
  const cur = await spotifyFetchJSON("https://api.spotify.com/v1/me/player/currently-playing");
  if (cur.status === 204 || !cur.json) {
    // 2) fallback to recently played (<=30 min)
    const rec = await spotifyFetchJSON("https://api.spotify.com/v1/me/player/recently-played?limit=1");
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