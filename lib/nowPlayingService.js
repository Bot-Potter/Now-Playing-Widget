import { spotifyFetchJSON } from "./spotifyFetch.js";

let lastKnown = {
  payload: null,
  ts: 0
};

function shape(track, state) {
  if (!track) {
    return {
      playing: false,
      state,
      type: "track",
      id: "",
      title: "",
      artists: [],
      album: "",
      url: "",
      image: "",
      progress_ms: 0,
      duration_ms: 0
    };
  }

  return {
    playing: state === "playing",
    state,
    type: "track",
    id: track.id || "",
    title: track.name || "",
    artists: (track.artists || []).map(a => a?.name).filter(Boolean),
    album: track.album?.name || "",
    url: track.external_urls?.spotify || "",
    image: track.album?.images?.[0]?.url || "",
    progress_ms: 0,
    duration_ms: track.duration_ms || 0
  };
}

function cache(track, state) {
  const payload = shape(track, state);
  lastKnown = { payload, ts: Date.now() };
  return payload;
}

export async function getNowPlayingRobust() {
  try {
    const cur = await spotifyFetchJSON("https://api.spotify.com/v1/me/player/currently-playing", {
      retries: 1,
      timeoutMs: 5000
    });

    if (cur.status === 204 || !cur.json) {
      const rec = await spotifyFetchJSON("https://api.spotify.com/v1/me/player/recently-played?limit=1", {
        retries: 1,
        timeoutMs: 5000
      });
      const item = rec.json?.items?.[0];
      const track = item?.track;
      const playedAt = item ? new Date(item.played_at).getTime() : 0;
      const fresh = Date.now() - playedAt < 30 * 60_000;

      if (fresh && track) return cache(track, "paused");

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
  } catch (e) {
    console.error("[nowPlayingService] Error:", e.message);
    if (lastKnown.payload) return lastKnown.payload;
    return shape(null, "inactive");
  }
}
