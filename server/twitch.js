import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

const {
  TWITCH_CLIENT_ID,
  TWITCH_CLIENT_SECRET,
  TWITCH_REDIRECT_URI
} = process.env;

// Token state management for auto-refresh
let twitchTokenState = {
  accessToken: process.env.TWITCH_REDEMPTIONS_TOKEN || null,
  refreshToken: process.env.TWITCH_REDEMPTIONS_REFRESH_TOKEN || null,
  expiresAt: 0
};

// Auto-refresh Twitch token
async function refreshTwitchToken() {
  if (!TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET || !twitchTokenState.refreshToken) {
    return false;
  }

  try {
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: twitchTokenState.refreshToken,
      client_id: TWITCH_CLIENT_ID,
      client_secret: TWITCH_CLIENT_SECRET
    });

    const response = await fetch("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[twitch] Token refresh failed:", data);
      return false;
    }

    twitchTokenState.accessToken = data.access_token;
    if (data.refresh_token) {
      twitchTokenState.refreshToken = data.refresh_token;
    }
    const expiresIn = Number(data.expires_in || 0);
    twitchTokenState.expiresAt = expiresIn ? Date.now() + (expiresIn * 1000) : 0;

    console.log(`[twitch] Token refreshed successfully. Expires in ~${expiresIn}s`);
    return true;
  } catch (error) {
    console.error("[twitch] Token refresh error:", error);
    return false;
  }
}

// Get valid access token (with auto-refresh)
async function getValidTwitchToken() {
  // If token is nearing expiry (5 min buffer), refresh it
  const bufferMs = 5 * 60 * 1000;
  if (twitchTokenState.expiresAt && Date.now() >= (twitchTokenState.expiresAt - bufferMs)) {
    await refreshTwitchToken();
  }
  return twitchTokenState.accessToken;
}

// Wrapper for Twitch API calls with auto-refresh on 401
async function twitchApiFetch(url, options = {}, attempt = 0) {
  let token = await getValidTwitchToken();
  
  if (!token) {
    throw new Error("No valid Twitch access token available");
  }

  const headers = {
    ...options.headers,
    "Authorization": `Bearer ${token}`,
    "Client-Id": TWITCH_CLIENT_ID
  };

  let response = await fetch(url, { ...options, headers });

  // If we get 401 and have refresh token, try to refresh once
  if (response.status === 401 && attempt === 0 && twitchTokenState.refreshToken) {
    const refreshed = await refreshTwitchToken();
    if (refreshed) {
      token = twitchTokenState.accessToken;
      headers["Authorization"] = `Bearer ${token}`;
      response = await fetch(url, { ...options, headers });
    }
  }

  return response;
}

router.get("/auth/twitch", (req, res) => {
  const scope = "channel:manage:redemptions chat:read chat:edit";
  const authUrl = `https://id.twitch.tv/oauth2/authorize?` +
    `response_type=code&` +
    `client_id=${TWITCH_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(TWITCH_REDIRECT_URI)}&` +
    `scope=${encodeURIComponent(scope)}`;
  res.redirect(authUrl);
});

router.get("/twitch/login", (req, res) => {
  res.redirect("/auth/twitch");
});

router.get("/twitch/whoami", async (req, res) => {
  try {
    const { TWITCH_REDEMPTIONS_TOKEN, TWITCH_CLIENT_ID } = process.env;

    if (!TWITCH_REDEMPTIONS_TOKEN || !TWITCH_CLIENT_ID) {
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Twitch - Not Connected</title>
          <style>
            body { font-family: system-ui; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
            h1 { color: #9146FF; }
            a { color: #9146FF; text-decoration: none; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>❌ No Twitch Account Connected</h1>
          <p>You haven't connected a Twitch account yet.</p>
          <p><a href="/twitch/login">Connect Twitch →</a></p>
        </body>
        </html>
      `);
    }

    const response = await fetch("https://api.twitch.tv/helix/users", {
      headers: {
        "Authorization": `Bearer ${TWITCH_REDEMPTIONS_TOKEN}`,
        "Client-Id": TWITCH_CLIENT_ID
      }
    });

    if (!response.ok) {
      throw new Error("Failed to fetch user info");
    }

    const data = await response.json();
    const user = data.data?.[0];

    if (!user) {
      throw new Error("No user data returned");
    }

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Twitch Account</title>
        <style>
          body { font-family: system-ui; max-width: 600px; margin: 50px auto; padding: 20px; }
          h1 { color: #9146FF; }
          .profile { background: #f5f5f5; padding: 20px; border-radius: 12px; margin: 20px 0; }
          .profile img { width: 100px; height: 100px; border-radius: 50%; }
          .info { margin: 15px 0; }
          .label { font-weight: bold; color: #666; }
          .value { font-size: 18px; margin: 5px 0; }
          a { color: #9146FF; text-decoration: none; }
          a:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        <h1>✅ Twitch Connected</h1>
        <div class="profile">
          ${user.profile_image_url ? `<img src="${user.profile_image_url}" alt="Profile">` : ''}
          <div class="info">
            <div class="label">Display Name:</div>
            <div class="value">${user.display_name}</div>
          </div>
          <div class="info">
            <div class="label">Username:</div>
            <div class="value">${user.login}</div>
          </div>
          <div class="info">
            <div class="label">User ID:</div>
            <div class="value">${user.id}</div>
          </div>
          <div class="info">
            <div class="label">Broadcaster Type:</div>
            <div class="value">${user.broadcaster_type || 'normal'}</div>
          </div>
          <div class="info">
            <div class="label">Account Created:</div>
            <div class="value">${new Date(user.created_at).toLocaleDateString()}</div>
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
        <title>Twitch Error</title>
        <style>
          body { font-family: system-ui; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
          h1 { color: #e74c3c; }
          a { color: #9146FF; text-decoration: none; }
        </style>
      </head>
      <body>
        <h1>❌ Error</h1>
        <p>${error.message}</p>
        <p>Your token might be invalid or expired.</p>
        <p><a href="/twitch/login">Reconnect Twitch →</a></p>
      </body>
      </html>
    `);
  }
});

router.get("/twitch/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.send("<h1>Error: No code received</h1>");
  }

  try {
    const body = new URLSearchParams({
      client_id: TWITCH_CLIENT_ID,
      client_secret: TWITCH_CLIENT_SECRET,
      code: code,
      grant_type: "authorization_code",
      redirect_uri: TWITCH_REDIRECT_URI
    });

    const response = await fetch("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body
    });

    const data = await response.json();

    if (!response.ok) {
      return res.send(`<h1>Error getting tokens</h1><pre>${JSON.stringify(data, null, 2)}</pre>`);
    }

    const userResponse = await fetch("https://api.twitch.tv/helix/users", {
      headers: {
        "Authorization": `Bearer ${data.access_token}`,
        "Client-Id": TWITCH_CLIENT_ID
      }
    });

    const userData = await userResponse.json();
    const userId = userData?.data?.[0]?.id || "unknown";
    const userName = userData?.data?.[0]?.login || "unknown";

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Twitch Tokens</title>
        <style>
          body { font-family: system-ui; max-width: 800px; margin: 50px auto; padding: 20px; }
          h1 { color: #9146FF; }
          .token-box { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 8px; }
          .token-label { font-weight: bold; margin-bottom: 5px; }
          .token-value { font-family: monospace; word-break: break-all; background: white; padding: 10px; border-radius: 4px; }
          button { background: #9146FF; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; margin-top: 5px; }
          button:hover { background: #772ce8; }
          .info { background: #e3f2fd; padding: 10px; border-radius: 4px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <h1>✅ Twitch Authentication Successful!</h1>

        <div class="info">
          <strong>User:</strong> ${userName}<br>
          <strong>User ID:</strong> ${userId}
        </div>

        <p>Copy these values to your .env file:</p>

        <div class="token-box">
          <div class="token-label">TWITCH_REDEMPTIONS_TOKEN=</div>
          <div class="token-value" id="access">${data.access_token}</div>
          <button onclick="copyToClipboard('access')">Copy</button>
        </div>

        <div class="token-box">
          <div class="token-label">TWITCH_REDEMPTIONS_REFRESH_TOKEN=</div>
          <div class="token-value" id="refresh">${data.refresh_token}</div>
          <button onclick="copyToClipboard('refresh')">Copy</button>
        </div>

        <div class="token-box">
          <div class="token-label">TWITCH_BROADCASTER_ID=</div>
          <div class="token-value" id="broadcaster">${userId}</div>
          <button onclick="copyToClipboard('broadcaster')">Copy</button>
        </div>

        <p><strong>Note:</strong> These tokens expire, but the refresh token can be used to get new access tokens automatically.</p>
        <p><strong>Token expires in:</strong> ${data.expires_in} seconds (~${Math.round(data.expires_in / 3600)} hours)</p>
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

router.post("/twitch/create-reward", async (req, res) => {
  try {
    const { TWITCH_BROADCASTER_ID } = process.env;

    if (!TWITCH_BROADCASTER_ID) {
      return res.status(400).json({
        success: false,
        error: "Missing TWITCH_BROADCASTER_ID configuration"
      });
    }

    const { title, cost, prompt } = req.body;

    if (!title || !cost) {
      return res.status(400).json({
        success: false,
        error: "Title and cost are required"
      });
    }

    const rewardData = {
      title: title,
      cost: parseInt(cost),
      prompt: prompt || "",
      is_enabled: true,
      is_user_input_required: true,
      should_redemptions_skip_request_queue: false
    };

    const response = await twitchApiFetch(
      `https://api.twitch.tv/helix/channel_points/custom_rewards?broadcaster_id=${TWITCH_BROADCASTER_ID}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rewardData)
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: data.message || "Failed to create reward",
        details: data
      });
    }

    const rewardId = data.data?.[0]?.id;

    res.json({
      success: true,
      reward: data.data?.[0],
      rewardId: rewardId,
      message: "Reward created successfully! Copy the Reward ID to your .env file as TWITCH_SONG_REWARD_ID"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get("/twitch/reward/:rewardId", async (req, res) => {
  try {
    const { TWITCH_BROADCASTER_ID } = process.env;

    if (!TWITCH_BROADCASTER_ID) {
      return res.status(400).json({
        success: false,
        error: "Missing TWITCH_BROADCASTER_ID configuration"
      });
    }

    const { rewardId } = req.params;

    const response = await twitchApiFetch(
      `https://api.twitch.tv/helix/channel_points/custom_rewards?broadcaster_id=${TWITCH_BROADCASTER_ID}&id=${rewardId}`,
      { method: "GET" }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: data.message || "Failed to fetch reward",
        details: data
      });
    }

    res.json({
      success: true,
      reward: data.data?.[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.put("/twitch/update-reward/:rewardId", async (req, res) => {
  try {
    const { TWITCH_BROADCASTER_ID } = process.env;

    if (!TWITCH_BROADCASTER_ID) {
      return res.status(400).json({
        success: false,
        error: "Missing TWITCH_BROADCASTER_ID configuration"
      });
    }

    const { rewardId } = req.params;
    const { title, cost, prompt } = req.body;

    const rewardData = {};
    if (title) rewardData.title = title;
    if (cost) rewardData.cost = parseInt(cost);
    if (prompt !== undefined) rewardData.prompt = prompt;

    const response = await twitchApiFetch(
      `https://api.twitch.tv/helix/channel_points/custom_rewards?broadcaster_id=${TWITCH_BROADCASTER_ID}&id=${rewardId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rewardData)
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: data.message || "Failed to update reward",
        details: data
      });
    }

    res.json({
      success: true,
      reward: data.data?.[0],
      message: "Reward updated successfully!"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export { router as twitchRouter };
