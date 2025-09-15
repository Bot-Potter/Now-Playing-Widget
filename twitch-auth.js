// twitch-auth.js
// Router för Twitch OAuth (channel points redemptions). Monteras i server.js.
//
// Endpoints:
//   GET  /twitch/login         -> redirect till Twitch OAuth
//   GET  /twitch/callback      -> tar emot code, visar access+refresh token (skyddad via ADMIN_SECRET header)
//   POST /twitch/refresh       -> byt refresh->access (skyddad via ADMIN_SECRET header)
//   GET  /twitch/whoami        -> verifiera token (skyddad via ADMIN_SECRET header)

import express from "express";
import fetch from "node-fetch";
import crypto from "crypto";

const REQUIRED_SCOPES = [
  "channel:manage:redemptions",
  "channel:read:redemptions",
  "user:read:email"
];

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`[twitch-auth] Missing env ${name}`);
  return v;
}

function adminGuard(req, res, next) {
  const ok = process.env.ADMIN_SECRET && req.headers["x-admin-secret"] === process.env.ADMIN_SECRET;
  if (!ok) return res.status(401).send("unauthorized");
  next();
}

export function twitchAuthRouter() {
  const router = express.Router();

  // 1) Starta OAuth
  router.get("/twitch/login", (req, res) => {
    const clientId = requireEnv("TWITCH_CLIENT_ID");
    const redirectUri = requireEnv("TWITCH_REDIRECT_URI");

    const state = crypto.randomBytes(12).toString("hex");
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: REQUIRED_SCOPES.join(" "),
      state
    });

    res.redirect("https://id.twitch.tv/oauth2/authorize?" + params.toString());
  });

  // 2) Ta emot token
    router.get("/twitch/callback", async (req, res) => {
    const { code, error } = req.query;
    if (error) return res.status(400).send("Twitch error: " + error);
    if (!code) return res.status(400).send("Missing code");

    const clientId = requireEnv("TWITCH_CLIENT_ID");
    const clientSecret = requireEnv("TWITCH_CLIENT_SECRET");
    const redirectUri = requireEnv("TWITCH_REDIRECT_URI");

    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri
    });

    const r = await fetch("https://id.twitch.tv/oauth2/token", { method: "POST", body });
    const data = await r.json();
    if (!r.ok) return res.status(400).send("Token error: " + JSON.stringify(data, null, 2));

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(`
      <style>body{font-family:system-ui;padding:24px;max-width:900px;margin:auto}pre{background:#0b0b0b;color:#0f0;padding:12px;border-radius:8px;overflow:auto}</style>
      <h2>Twitch OAuth klart ✅</h2>
      <p>Lägg in dessa i din <code>.env</code>:</p>
      <pre>TWITCH_REDEMPTIONS_TOKEN=${data.access_token}</pre>
      <pre>TWITCH_REDEMPTIONS_REFRESH_TOKEN=${data.refresh_token}</pre>
      <p>Scopes: ${Array.isArray(data.scope) ? data.scope.join(", ") : "(okänt)"}</p>
      <p>Access-tokenen är kortlivad (~4h). När den dör, POST:a till <code>/twitch/refresh</code> för att få en ny via refresh_token.</p>
      <hr>
      <p><b>Tips:</b> Testa <code>GET /twitch/whoami</code> (med header <code>x-admin-secret</code>) för att verifiera token.</p>
    `);
  });

  // 3) Refresh access-token
  router.post("/twitch/refresh", adminGuard, express.json(), async (req, res) => {
    const clientId = requireEnv("TWITCH_CLIENT_ID");
    const clientSecret = requireEnv("TWITCH_CLIENT_SECRET");
    const refreshToken = (req.body?.refresh_token || process.env.TWITCH_REDEMPTIONS_REFRESH_TOKEN || "").trim();
    if (!refreshToken) return res.status(400).json({ ok:false, error:"missing_refresh_token" });

    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token"
    });

    const r = await fetch("https://id.twitch.tv/oauth2/token", { method: "POST", body });
    const data = await r.json();
    if (!r.ok) return res.status(400).json({ ok:false, error:"refresh_failed", detail:data });

    res.json({
      ok: true,
      access_token: data.access_token,
      refresh_token: data.refresh_token || "(unchanged)",
      expires_in: data.expires_in,
      scope: data.scope
    });
  });

  // 4) Validera token / hämta broadcaster
  router.get("/twitch/whoami", adminGuard, async (req, res) => {
    const clientId = requireEnv("TWITCH_CLIENT_ID");
    const token = (req.headers["authorization"]?.toString().replace(/^Bearer\s+/i,"") ||
                  process.env.TWITCH_REDEMPTIONS_TOKEN || "").trim();
    if (!token) return res.status(400).json({ ok:false, error:"missing_access_token" });

    const r = await fetch("https://api.twitch.tv/helix/users", {
      headers: { "Client-ID": clientId, "Authorization": `Bearer ${token}` }
    });
    const j = await r.json();
    if (!r.ok) return res.status(r.status).json({ ok:false, error:j });

    res.json({ ok:true, data:j.data });
  });

  return router;
}