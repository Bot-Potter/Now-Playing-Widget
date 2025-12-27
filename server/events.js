import express from "express";

const router = express.Router();

const clients = [];

function sendEventToAll(eventName, data) {
  const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
  clients.forEach(client => {
    try {
      client.write(payload);
    } catch (e) {
      console.error("[events] Error sending to client:", e.message);
    }
  });
}

router.get("/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");

  res.write("retry: 10000\n\n");

  clients.push(res);
  console.log(`[events] Client connected. Total: ${clients.length}`);

  req.on("close", () => {
    const index = clients.indexOf(res);
    if (index !== -1) {
      clients.splice(index, 1);
    }
    console.log(`[events] Client disconnected. Total: ${clients.length}`);
  });
});

router.post("/trigger-song", express.json(), (req, res) => {
  const by = req.body?.by || null;
  sendEventToAll("song", { by });
  res.json({ success: true });
});

export { router as eventsRouter, sendEventToAll };
