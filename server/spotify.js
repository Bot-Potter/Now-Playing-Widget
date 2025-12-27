import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

const {
  SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET,
  REFRESH_TOKEN,
  SPOTIFY_REDIRECT_URI
} = process.env;

let cachedAccessToken = null;
let tokenExpiry = 0;

async function getSpotifyAccessToken() {
  if (cachedAccessToken && Date.now() < tokenExpiry) {
    return cachedAccessToken;
  }

  const auth = "Basic " + Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64");
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: REFRESH_TOKEN
  });

  const r = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: auth,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });

  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Failed to get access token: ${r.status} ${t.slice(0, 120)}`);
  }

  const j = await r.json();
  cachedAccessToken = j.access_token;
  tokenExpiry = Date.now() + ((j.expires_in || 3600) * 1000) - 60000;

  return cachedAccessToken;
}

let lastNowPlaying = null;
let lastSnapshot = null;

router.get("/now-playing", async (req, res) => {
  try {
    const token = await getSpotifyAccessToken();
    const response = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (response.status === 204 || response.status === 404) {
      lastNowPlaying = null;
      return res.json({ playing: false });
    }

    if (!response.ok) {
      return res.status(response.status).json({ playing: false, error: "Failed to fetch" });
    }

    const data = await response.json();

    if (!data || !data.item || !data.is_playing) {
      lastNowPlaying = null;
      return res.json({ playing: false });
    }

    const result = {
      playing: true,
      id: data.item.id,
      title: data.item.name,
      artists: data.item.artists.map(a => a.name),
      album: data.item.album?.name || "",
      image: data.item.album?.images?.[0]?.url || null,
      url: data.item.external_urls?.spotify || null,
      progress_ms: data.progress_ms || 0,
      duration_ms: data.item.duration_ms || 0
    };

    lastNowPlaying = result;
    lastSnapshot = {
      ...result,
      snapshot: true,
      paused: false
    };

    res.json(result);
  } catch (error) {
    console.error("[spotify] /now-playing error:", error.message);
    res.status(500).json({ playing: false, error: error.message });
  }
});

router.get("/now-snapshot", async (req, res) => {
  try {
    const token = await getSpotifyAccessToken();
    const response = await fetch("https://api.spotify.com/v1/me/player", {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (response.status === 204 || response.status === 404) {
      return res.json({ playing: false, snapshot: true });
    }

    if (!response.ok) {
      return res.status(response.status).json({ playing: false, snapshot: true });
    }

    const data = await response.json();

    if (!data || !data.item) {
      return res.json({ playing: false, snapshot: true });
    }

    const result = {
      playing: data.is_playing,
      paused: !data.is_playing,
      snapshot: true,
      id: data.item.id,
      title: data.item.name,
      artists: data.item.artists.map(a => a.name),
      album: data.item.album?.name || "",
      image: data.item.album?.images?.[0]?.url || null,
      url: data.item.external_urls?.spotify || null,
      progress_ms: data.progress_ms || 0,
      duration_ms: data.item.duration_ms || 0
    };

    if (!data.is_playing) {
      lastSnapshot = result;
    }

    res.json(result);
  } catch (error) {
    console.error("[spotify] /now-snapshot error:", error.message);
    res.status(500).json({ playing: false, snapshot: true });
  }
});

router.get("/recent", async (req, res) => {
  try {
    const token = await getSpotifyAccessToken();
    const excludeId = req.query.exclude_id;

    const response = await fetch("https://api.spotify.com/v1/me/player/recently-played?limit=10", {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
      return res.json({ items: [] });
    }

    const data = await response.json();
    const items = (data.items || [])
      .map(item => ({
        id: item.track.id,
        title: item.track.name,
        artists: item.track.artists.map(a => a.name),
        album: item.track.album?.name || "",
        image: item.track.album?.images?.[0]?.url || null,
        url: item.track.external_urls?.spotify || null,
        played_at: item.played_at
      }))
      .filter(item => !excludeId || item.id !== excludeId);

    const unique = [];
    const seen = new Set();
    for (const item of items) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        unique.push(item);
      }
    }

    res.json({ items: unique.slice(0, 3) });
  } catch (error) {
    console.error("[spotify] /recent error:", error.message);
    res.json({ items: [] });
  }
});

router.get("/auth/spotify", (req, res) => {
  const scope = "user-read-currently-playing user-read-playback-state user-read-recently-played user-modify-playback-state";
  const authUrl = `https://accounts.spotify.com/authorize?` +
    `response_type=code&` +
    `client_id=${SPOTIFY_CLIENT_ID}&` +
    `scope=${encodeURIComponent(scope)}&` +
    `redirect_uri=${encodeURIComponent(SPOTIFY_REDIRECT_URI)}`;
  res.redirect(authUrl);
});

router.get("/spotify/login", (req, res) => {
  res.redirect("/auth/spotify");
});

router.get("/spotify/whoami", async (req, res) => {
  try {
    if (!REFRESH_TOKEN) {
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Spotify - Not Connected</title>
          <style>
            body { font-family: system-ui; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
            h1 { color: #1DB954; }
            a { color: #1DB954; text-decoration: none; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>❌ No Spotify Account Connected</h1>
          <p>You haven't connected a Spotify account yet.</p>
          <p><a href="/spotify/login">Connect Spotify →</a></p>
        </body>
        </html>
      `);
    }

    const token = await getSpotifyAccessToken();
    const response = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error("Failed to fetch user info");
    }

    const user = await response.json();

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Spotify Account</title>
        <style>
          body { font-family: system-ui; max-width: 600px; margin: 50px auto; padding: 20px; }
          h1 { color: #1DB954; }
          .profile { background: #f5f5f5; padding: 20px; border-radius: 12px; margin: 20px 0; }
          .profile img { width: 100px; height: 100px; border-radius: 50%; }
          .info { margin: 15px 0; }
          .label { font-weight: bold; color: #666; }
          .value { font-size: 18px; margin: 5px 0; }
          a { color: #1DB954; text-decoration: none; }
          a:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        <h1>✅ Spotify Connected</h1>
        <div class="profile">
          ${user.images?.[0]?.url ? `<img src="${user.images[0].url}" alt="Profile">` : ''}
          <div class="info">
            <div class="label">Display Name:</div>
            <div class="value">${user.display_name || 'N/A'}</div>
          </div>
          <div class="info">
            <div class="label">Email:</div>
            <div class="value">${user.email || 'N/A'}</div>
          </div>
          <div class="info">
            <div class="label">User ID:</div>
            <div class="value">${user.id}</div>
          </div>
          <div class="info">
            <div class="label">Account Type:</div>
            <div class="value">${user.product || 'free'}</div>
          </div>
          <div class="info">
            <div class="label">Country:</div>
            <div class="value">${user.country || 'N/A'}</div>
          </div>
        </div>
        <p><a href="/admin">← Back to Admin</a></p>
      </body>
      </html>
    `);
  } catch (error) {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Spotify Error</title>
        <style>
          body { font-family: system-ui; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
          h1 { color: #e74c3c; }
          a { color: #1DB954; text-decoration: none; }
        </style>
      </head>
      <body>
        <h1>❌ Error</h1>
        <p>${error.message}</p>
        <p>Your token might be invalid or expired.</p>
        <p><a href="/spotify/login">Reconnect Spotify →</a></p>
      </body>
      </html>
    `);
  }
});

router.get("/spotify/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.send("<h1>Error: No code received</h1>");
  }

  try {
    const auth = "Basic " + Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64");
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code: code,
      redirect_uri: SPOTIFY_REDIRECT_URI
    });

    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: auth,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body
    });

    const data = await response.json();

    if (!response.ok) {
      return res.send(`<h1>Error getting tokens</h1><pre>${JSON.stringify(data, null, 2)}</pre>`);
    }

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Spotify Tokens</title>
        <style>
          body { font-family: system-ui; max-width: 800px; margin: 50px auto; padding: 20px; }
          h1 { color: #1DB954; }
          .token-box { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 8px; }
          .token-label { font-weight: bold; margin-bottom: 5px; }
          .token-value { font-family: monospace; word-break: break-all; background: white; padding: 10px; border-radius: 4px; }
          button { background: #1DB954; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; margin-top: 5px; }
          button:hover { background: #1ed760; }
        </style>
      </head>
      <body>
        <h1>✅ Spotify Authentication Successful!</h1>
        <p>Copy these values to your .env file:</p>

        <div class="token-box">
          <div class="token-label">REFRESH_TOKEN=</div>
          <div class="token-value" id="refresh">${data.refresh_token}</div>
          <button onclick="copyToClipboard('refresh')">Copy</button>
        </div>

        <div class="token-box">
          <div class="token-label">Access Token (temporary - expires in ${data.expires_in}s):</div>
          <div class="token-value" id="access">${data.access_token}</div>
          <button onclick="copyToClipboard('access')">Copy</button>
        </div>

        <p><strong>Note:</strong> The REFRESH_TOKEN is what you need in your .env file. It doesn't expire.</p>
        <p><a href="/admin">← Back to Admin</a></p>

        <script>
          function copyToClipboard(id) {
            const text = document.getElementById(id).textContent;
            navigator.clipboard.writeText(text).then(() => {
              alert('Copied to clipboard!');
            });
          }
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    res.send(`<h1>Error</h1><pre>${error.message}</pre>`);
  }
});

export { router as spotifyRouter, getSpotifyAccessToken };
