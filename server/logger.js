import { WebSocketServer } from "ws";

const logs = [];
const MAX_LOGS = 1000;
let wss = null;

export function initializeLogger(server) {
  wss = new WebSocketServer({ server, path: "/ws/logs" });

  wss.on("connection", (ws) => {
    console.log("[logger] Admin connected to live logs");

    // Send existing logs to new connection
    ws.send(JSON.stringify({ type: "init", logs }));

    ws.on("close", () => {
      console.log("[logger] Admin disconnected from live logs");
    });
  });

  // Intercept console methods
  interceptConsole();
}

function broadcastLog(logEntry) {
  if (!wss) return;

  wss.clients.forEach((client) => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(JSON.stringify({ type: "log", log: logEntry }));
    }
  });
}

function addLog(level, args) {
  const timestamp = new Date().toISOString();
  const message = args.map(arg => {
    if (typeof arg === "object") {
      try {
        return JSON.stringify(arg, null, 2);
      } catch {
        return String(arg);
      }
    }
    return String(arg);
  }).join(" ");

  const logEntry = {
    timestamp,
    level,
    message
  };

  logs.push(logEntry);
  if (logs.length > MAX_LOGS) {
    logs.shift();
  }

  broadcastLog(logEntry);
}

function interceptConsole() {
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;
  const originalInfo = console.info;

  console.log = function(...args) {
    addLog("log", args);
    originalLog.apply(console, args);
  };

  console.error = function(...args) {
    addLog("error", args);
    originalError.apply(console, args);
  };

  console.warn = function(...args) {
    addLog("warn", args);
    originalWarn.apply(console, args);
  };

  console.info = function(...args) {
    addLog("info", args);
    originalInfo.apply(console, args);
  };
}

export function getLogs() {
  return logs;
}
