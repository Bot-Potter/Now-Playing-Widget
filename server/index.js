import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import fs from "fs";
import { spotifyRouter } from "./spotify.js";
import { twitchRouter } from "./twitch.js";
import { eventsRouter } from "./events.js";
import { configRouter } from "./config.js";
import { initializeLogger, getLogs } from "./logger.js";

// Auto-generate .env from .env.example if it doesn't exist
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, "..");
const envPath = path.join(rootDir, ".env");
const envExamplePath = path.join(rootDir, ".env.example");

if (!fs.existsSync(envPath)) {
  if (fs.existsSync(envExamplePath)) {
    try {
      fs.copyFileSync(envExamplePath, envPath);
      console.log("✅ Created .env file from .env.example");
      console.log("⚠️  Please edit .env and add your API credentials before continuing!");
    } catch (error) {
      console.error("❌ Failed to create .env file:", error.message);
    }
  } else {
    console.warn("⚠️  No .env or .env.example file found!");
  }
}

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/", spotifyRouter);
app.use("/", twitchRouter);
app.use("/", eventsRouter);
app.use("/", configRouter);

app.get("/", (req, res) => {
  const filePath = path.resolve(__dirname, "..", "index.html");
  res.sendFile(filePath);
});

app.get("/uppdaterapris", (req, res) => {
  const filePath = path.resolve(__dirname, "..", "public", "uppdaterapris.html");
  res.sendFile(filePath);
});

app.get("/api/logs", (req, res) => {
  res.json({ logs: getLogs() });
});

app.use(express.static(path.join(__dirname, "../public")));
app.use(express.static(path.join(__dirname, "../dist")));

const server = createServer(app);
initializeLogger(server);

server.listen(PORT, () => {
  console.log(`[server] Running on http://localhost:${PORT}`);
  console.log(`[server] Now Playing: http://localhost:${PORT}/`);
  console.log(`[server] Admin Panel: http://localhost:${PORT}/admin.html`);
  console.log(`[server] Overlay: http://localhost:${PORT}/overlay.html`);
  console.log(`[server] Start the SR bot separately with: npm run bot`);
});
