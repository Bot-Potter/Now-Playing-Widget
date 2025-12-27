import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

const ENV_PATH = path.resolve(__dirname, "..", ".env");

function parseEnvFile(content) {
  const config = {};
  const lines = content.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const equalIndex = trimmed.indexOf("=");
    if (equalIndex === -1) continue;

    const key = trimmed.substring(0, equalIndex).trim();
    const value = trimmed.substring(equalIndex + 1).trim();
    config[key] = value;
  }

  return config;
}

function buildEnvContent(config) {
  const lines = [];

  for (const [key, value] of Object.entries(config)) {
    lines.push(`${key}=${value}`);
  }

  return lines.join("\n");
}

router.get("/api/env", (req, res) => {
  try {
    // Return specific env variables that are safe to expose
    res.json({
      TWITCH_SONG_REWARD_ID: process.env.TWITCH_SONG_REWARD_ID || null,
      TWITCH_CLIENT_ID: process.env.TWITCH_CLIENT_ID || null,
      TWITCH_BROADCASTER_ID: process.env.TWITCH_BROADCASTER_ID || null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/api/config", (req, res) => {
  try {
    if (!fs.existsSync(ENV_PATH)) {
      return res.json({ config: {} });
    }

    const content = fs.readFileSync(ENV_PATH, "utf-8");
    const config = parseEnvFile(content);

    res.json({ config });
  } catch (error) {
    console.error("[config] Error reading config:", error);
    res.status(500).json({ message: "Failed to read configuration" });
  }
});

router.post("/api/config", (req, res) => {
  try {
    const { config } = req.body;

    console.log("[config] Received config:", config);

    if (!config || typeof config !== "object") {
      return res.status(400).json({ message: "Invalid configuration data" });
    }

    const envContent = buildEnvContent(config);

    fs.writeFileSync(ENV_PATH, envContent, "utf-8");
    console.log("[config] Configuration saved successfully to", ENV_PATH);

    // Just save and respond - don't auto-restart due to proxy issues
    res.json({
      success: true,
      message: "Configuration saved successfully! Please restart the server manually to apply changes."
    });
  } catch (error) {
    console.error("[config] Error saving config:", error);
    res.status(500).json({
      success: false,
      message: "Failed to save configuration",
      error: error.message
    });
  }
});

router.post("/api/restart", (req, res) => {
  try {
    console.log("[config] Restart requested");

    res.json({
      success: true,
      message: "Server is restarting..."
    });

    // Send response first, then restart after a delay
    setTimeout(() => {
      console.log("[config] Restarting server and bot...");

      // Start npm run dev
      const devProcess = spawn("npm", ["run", "dev"], {
        detached: true,
        stdio: "ignore",
        cwd: path.resolve(__dirname, "..")
      });
      devProcess.unref();

      // Start npm run bot
      const botProcess = spawn("npm", ["run", "bot"], {
        detached: true,
        stdio: "ignore",
        cwd: path.resolve(__dirname, "..")
      });
      botProcess.unref();

      // Exit current process
      process.exit(0);
    }, 1000);
  } catch (error) {
    console.error("[config] Error restarting:", error);
    res.status(500).json({
      success: false,
      message: "Failed to restart server",
      error: error.message
    });
  }
});

export { router as configRouter };
