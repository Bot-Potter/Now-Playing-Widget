// sr-bot.js
// Twitch Song Request bot med moderering, auto-timeout (15 min), kanalpoäng refund/fulfil,
// och kommandon för att lista väntande önskningar.
//
// Kommandon (mods):
//   !srlist                   -> lista ALLA väntande requests (med vem som önskade)
//   !srqueue                  -> (kvar som mod-kommandon) listar de 5 första (snabböversikt)
//   !srapprove                -> godkänn hela kön
//   !srapprove <n|@user>      -> godkänn en specifik
//   !srdeny <n|@user>         -> neka + refund
//   !srclear                  -> töm allt + refund
//   !srstatus                 -> kort status (antal + topp 3)
//
// Publikt (alla):
//   !srmy / !srmine           -> visa min egen väntande önskning
//
// Kör parallellt: `node sr-bot.js`

import dotenv from "dotenv";
import tmi from "tmi.js";
import fetch from "node-fetch";

dotenv.config();

/* ==============================
   ENV
   ============================== */
const {
  // Twitch chat
  TWITCH_USERNAME,
  TWITCH_OAUTH_TOKEN,      // "oauth:xxxxxxxx"
  TWITCH_CHANNEL,          // t.ex. "maccanzz" (lowercase)

  // Kanalpoäng: reward-id för "Song Request"
  TWITCH_SONG_REWARD_ID,

  // Chat-svar på/av
  TWITCH_REPLY_ENABLED = "true",

  // Spotify
  SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET,
  REFRESH_TOKEN,

  // Spotify sök-land
  SPOTIFY_SEARCH_MARKET = "SE",

  // Pending kö
  SR_MAX_PENDING = "50",
  SR_APPROVE_ALL_DELAY_MS = "600",
  SR_PENDING_TTL_MS = "900000", // 15 min default

  // Refund/fulfil via Helix (valfritt men krävs för att återbetala/markera)
  TWITCH_REDEMPTIONS_TOKEN,    // user access token (broadcaster) med scope: channel:manage:redemptions
  TWITCH_CLIENT_ID,            // din app client id
  TWITCH_BROADCASTER_ID        // valfritt; annars auto-lookup via token
} = process.env;

const REPLY = String(TWITCH_REPLY_ENABLED).toLowerCase() === "true";
const MAX_PENDING = Math.max(1, parseInt(SR_MAX_PENDING, 10) || 50);
const APPROVE_ALL_DELAY_MS = Math.max(0, parseInt(SR_APPROVE_ALL_DELAY_MS, 10) || 600);
const PENDING_TTL_MS = Math.max(60_000, parseInt(SR_PENDING_TTL_MS, 10) || 900_000);

const REFUND_ENABLED = !!(TWITCH_REDEMPTIONS_TOKEN && TWITCH_CLIENT_ID);

/* ==============================
   Helpers
   ============================== */
function isModOrBroadcaster(userstate) {
  return !!(userstate.mod || (userstate.badges && userstate.badges.broadcaster === "1"));
}
function tag(input) {
  if (!input) return "@someone";
  if (typeof input === "string") return `@${input.replace(/^@/, "")}`;
  const n = input["display-name"] || input.username || "someone";
  return `@${n}`;
}
function trimText(s) { return (s || "").trim(); }
function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }
function extractTrackId(text) {
  if (!text) return null;
  const m1 = text.match(/spotify:track:([A-Za-z0-9]{22})/);
  if (m1) return m1[1];
  const m2 = text.match(/open\.spotify\.com\/track\/([A-Za-z0-9]{22})/);
  if (m2) return m2[1];
  return null;
}
// Skicka text i chunkar för att undvika Twitch 500-tecken-limit
async function sayChunks(client, channel, prefix, lines, sep = " | ") {
  const MAX = 450; // lite marginal
  let buf = prefix || "";
  for (let i = 0; i < lines.length; i++) {
    const piece = (buf ? sep : "") + lines[i];
    if ((buf + piece).length > MAX) {
      if (buf) { client.say(channel, buf); await sleep(200); }
      buf = lines[i]; // starta ny rad med aktuell
    } else {
      buf += piece;
    }
  }
  if (buf) client.say(channel, buf);
}

/* ==============================
   Spotify helpers
   ============================== */
async function getSpotifyAccessToken() {
  const auth = "Basic " + Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64");
  const body = new URLSearchParams({ grant_type: "refresh_token", refresh_token: REFRESH_TOKEN });
  const r = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/x-www-form-urlencoded" },
    body
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`no_access_token:${r.status}:${t.slice(0,120)}`);
  }
  const j = await r.json();
  return j.access_token;
}

async function spotifySearchBestTrack(query) {
  const at = await getSpotifyAccessToken();
  const u = new URL("https://api.spotify.com/v1/search");
  u.searchParams.set("type", "track");
  u.searchParams.set("limit", "1");
  u.searchParams.set("q", query);
  if (SPOTIFY_SEARCH_MARKET) u.searchParams.set("market", SPOTIFY_SEARCH_MARKET);

  const r = await fetch(u.toString(), { headers: { Authorization: `Bearer ${at}` }});
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`search_failed:${r.status}:${t.slice(0,120)}`);
  }
  const j = await r.json();
  const it = j?.tracks?.items?.[0];
  if (!it?.id) return null;
  return {
    id: it.id,
    name: it.name || "Unknown",
    artists: (it.artists || []).map(a => a.name).join(", "),
    uri: `spotify:track:${it.id}`,
    url: it.external_urls?.spotify || null
  };
}

async function spotifyAddToQueue(trackUri) {
  const at = await getSpotifyAccessToken();
  const u = new URL("https://api.spotify.com/v1/me/player/queue");
  u.searchParams.set("uri", trackUri);

  const r = await fetch(u.toString(), {
    method: "POST",
    headers: { Authorization: `Bearer ${at}` }
  });

  // Läs alltid response som text (kan vara tomt)
  const txt = await r.text().catch(() => "");

  // Spotify-standard för success
  if (r.status === 204) return;

  // Vissa miljöer svarar 200 + tom body -> behandla som OK
  if (r.status === 200 && (!txt || txt.trim() === "")) return;

  // Vanliga fel
  if (r.status === 404) throw new Error("no_active_device");

  // Försök extrahera vettigt felmeddelande
  let msg = txt;
  try {
    const j = JSON.parse(txt);
    msg = j?.error?.message || j?.message || txt || "unknown";
  } catch (_) {}

  throw new Error(`queue_failed:${r.status}:${String(msg).slice(0,120)}`);
}

/* ==============================
   Helix (refund/fulfil)
   ============================== */
let BROADCASTER_ID = TWITCH_BROADCASTER_ID || null;

function helixHeaders() {
  if (!REFUND_ENABLED) throw new Error("refund_not_configured");
  return {
    "Client-ID": TWITCH_CLIENT_ID,
    "Authorization": `Bearer ${TWITCH_REDEMPTIONS_TOKEN}`,
    "Content-Type": "application/json"
  };
}

async function ensureBroadcasterId() {
  if (BROADCASTER_ID) return BROADCASTER_ID;
  if (!REFUND_ENABLED) return null;
  const r = await fetch("https://api.twitch.tv/helix/users", { headers: helixHeaders() });
  const j = await r.json();
  const id = j?.data?.[0]?.id;
  if (!id) throw new Error("cant_resolve_broadcaster_id");
  BROADCASTER_ID = id;
  return id;
}

async function listUnfulfilledRedemptions({ rewardId, after = null, first = 50 }) {
  await ensureBroadcasterId();
  const u = new URL("https://api.twitch.tv/helix/channel_points/custom_rewards/redemptions");
  u.searchParams.set("broadcaster_id", BROADCASTER_ID);
  u.searchParams.set("status", "UNFULFILLED");
  u.searchParams.set("sort", "OLDEST");
  u.searchParams.set("first", String(Math.min(50, Math.max(1, first))));
  if (rewardId) u.searchParams.set("reward_id", rewardId);
  if (after) u.searchParams.set("after", after);

  const r = await fetch(u.toString(), { headers: helixHeaders() });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`list_redemptions_failed:${r.status}:${t.slice(0,120)}`);
  }
  return r.json();
}

async function updateRedemptionStatus(rewardId, redemptionId, status) {
  await ensureBroadcasterId();
  const u = new URL("https://api.twitch.tv/helix/channel_points/custom_rewards/redemptions");
  u.searchParams.set("broadcaster_id", BROADCASTER_ID);
  u.searchParams.set("reward_id", rewardId);
  u.searchParams.set("id", redemptionId);

  const r = await fetch(u.toString(), {
    method: "PATCH",
    headers: helixHeaders(),
    body: JSON.stringify({ status })
  });

  if (!r.ok) {
    const t = await r.text();
    throw new Error(`update_redemption_failed:${r.status}:${t.slice(0,120)}`);
  }
  return r.json();
}

async function refundOldestForUser(userLogin) {
  if (!REFUND_ENABLED || !TWITCH_SONG_REWARD_ID) return false;

  let cursor = null;
  while (true) {
    const j = await listUnfulfilledRedemptions({ rewardId: TWITCH_SONG_REWARD_ID, after: cursor, first: 50 });
    const arr = j?.data || [];
    const hit = arr.find(x => x?.user_login?.toLowerCase() === userLogin.toLowerCase());
    if (hit) {
      await updateRedemptionStatus(TWITCH_SONG_REWARD_ID, hit.id, "CANCELED");
      return true;
    }
    const next = j?.pagination?.cursor;
    if (!next || arr.length === 0) break;
    cursor = next;
  }
  return false;
}

async function fulfilOldestForUser(userLogin) {
  if (!REFUND_ENABLED || !TWITCH_SONG_REWARD_ID) return false;

  let cursor = null;
  while (true) {
    const j = await listUnfulfilledRedemptions({ rewardId: TWITCH_SONG_REWARD_ID, after: cursor, first: 50 });
    const arr = j?.data || [];
    const hit = arr.find(x => x?.user_login?.toLowerCase() === userLogin.toLowerCase());
    if (hit) {
      await updateRedemptionStatus(TWITCH_SONG_REWARD_ID, hit.id, "FULFILLED");
      return true;
    }
    const next = j?.pagination?.cursor;
    if (!next || arr.length === 0) break;
    cursor = next;
  }
  return false;
}

/* ==============================
   Pending Request Store
   ============================== */
/**
 * pending item:
 * {
 *   id: "1",
 *   ts: 173..ms,
 *   user: "loginlower",
 *   display: "DisplayName",
 *   query: "raw text",
 *   directId: "trackId22" | null,
 *   resolved: { id,name,artists,uri,url } | null,
 *   rewardId: string | null
 * }
 */
let autoId = 1;
const pending = []; // FIFO

function addPending(userstate, rawText, rewardId) {
  if (pending.length >= MAX_PENDING) pending.shift();
  const directId = extractTrackId(rawText);
  const item = {
    id: String(autoId++),
    ts: Date.now(),
    user: (userstate.username || "").toLowerCase(),
    display: userstate["display-name"] || userstate.username || "someone",
    query: rawText || "",
    directId,
    resolved: directId ? {
      id: directId,
      name: null,
      artists: null,
      uri: `spotify:track:${directId}`,
      url: `https://open.spotify.com/track/${directId}`
    } : null,
    rewardId: rewardId || null
  };
  pending.push(item);
  return item;
}

function findPendingByIndexStr(str) {
  const idx = parseInt(str, 10);
  if (!Number.isFinite(idx)) return null;
  const real = idx - 1; // 1-baserat i chatten
  if (real < 0 || real >= pending.length) return null;
  return pending[real];
}
function findPendingByUser(usernameOrTag) {
  const u = usernameOrTag.replace(/^@/, "").toLowerCase();
  return pending.find(p => p.user === u) || null;
}
function removePending(id) {
  const i = pending.findIndex(p => p.id === id);
  if (i >= 0) pending.splice(i, 1);
}

/* ==============================
   Twitch Client
   ============================== */
if (!TWITCH_USERNAME || !TWITCH_OAUTH_TOKEN || !TWITCH_CHANNEL) {
  console.error("[sr-bot] Missing TWITCH env (TWITCH_USERNAME/TWITCH_OAUTH_TOKEN/TWITCH_CHANNEL).");
  process.exit(1);
}
if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET || !REFRESH_TOKEN) {
  console.error("[sr-bot] Missing Spotify env (SPOTIFY_CLIENT_ID/SPOTIFY_CLIENT_SECRET/REFRESH_TOKEN).");
  process.exit(1);
}
if (!REFUND_ENABLED) {
  console.warn("[sr-bot] Refund/Fulfil is DISABLED (set TWITCH_REDEMPTIONS_TOKEN and TWITCH_CLIENT_ID to enable).");
} else {
  console.log("[sr-bot] Refund/Fulfil is ENABLED.");
}

const client = new tmi.Client({
  identity: { username: TWITCH_USERNAME, password: TWITCH_OAUTH_TOKEN },
  channels: [ TWITCH_CHANNEL ]
});

client.connect()
  .then(() => console.log(`[sr-bot] Connected to #${TWITCH_CHANNEL}`))
  .catch(err => console.error("[sr-bot] connect error", err));

/* ==============================
   Auto-timeout sweeper (var 60s)
   ============================== */
async function sweepTimeouts() {
  if (!pending.length) return;
  const now = Date.now();
  const snapshot = pending.slice(0);
  for (const item of snapshot) {
    if (now - item.ts >= PENDING_TTL_MS) {
      removePending(item.id);
      console.log(`[sr-bot] Timeout -> refund ${item.user} "${item.query}"`);
      if (REFUND_ENABLED && TWITCH_SONG_REWARD_ID) {
        try {
          await refundOldestForUser(item.user);
          if (REPLY) client.say(TWITCH_CHANNEL, `${tag(item.display)} din låtönskan tidsgränsades och poängen har återbetalats.`);
        } catch (e) {
          console.warn("[sr-bot] refund timeout error:", e.message || e);
        }
      } else {
        if (REPLY) client.say(TWITCH_CHANNEL, `${tag(item.display)} din låtönskan tidsgränsades (refund ej aktiverad).`);
      }
      await sleep(200);
    }
  }
}
setInterval(sweepTimeouts, 60_000);

/* ==============================
   Kommandon & Hantering
   ============================== */
// Mod-kommandon
const CMD_LIST_MOD  = /^!srlist$/i;                 // NY: mods-only, lista ALLA
const CMD_QUEUE     = /^!srqueue$/i;                // kvar som snabböversikt (topp 5)
const CMD_APPR_ALL  = /^!srappr(?:ove|ove)\s*$/i;
const CMD_APPR_ONE  = /^!srappr(?:ove|ove)\s+(.+)$/i;
const CMD_DENY      = /^!srdeny\s+(.+)$/i;
const CMD_CLEAR     = /^!srclear$/i;
const CMD_STATUS    = /^!srstatus$/i;

// Publikt
const CMD_MY_PUBLIC = /^!(?:srmy|srmine)\s*$/i;

const seenRewardIds = new Set();

client.on("message", async (_channel, userstate, message, self) => {
  if (self) return;

  const rewardId = userstate["custom-reward-id"];
  if (rewardId && !seenRewardIds.has(rewardId)) {
    seenRewardIds.add(rewardId);
    console.log("[sr-bot] observed custom-reward-id:", rewardId);
  }

  // Kanalpoäng → pending
  if (rewardId && TWITCH_SONG_REWARD_ID && rewardId === TWITCH_SONG_REWARD_ID) {
    const q = trimText(message);
    const item = addPending(userstate, q, rewardId);
    if (REPLY) {
      client.say(TWITCH_CHANNEL, `${tag(userstate)} din låtförfrågan togs emot och väntar på moderering (#${pending.length}).`);
    }
    return;
  }

  // === Publika kommandon ===
  if (CMD_MY_PUBLIC.test(message)) {
    const u = (userstate.username || "").toLowerCase();
    const p = pending.find(x => x.user === u);
    if (!p) { if (REPLY) client.say(TWITCH_CHANNEL, `${tag(userstate)} du har ingen väntande låt just nu.`); return; }
    const idx = pending.indexOf(p) + 1;
    const label = p.resolved?.name
      ? `${p.resolved.name} — ${p.resolved.artists || ""}`
      : (p.resolved?.url || p.query || "(okänd)");
    if (REPLY) client.say(TWITCH_CHANNEL, `${tag(userstate)} din låt (#${idx} i kön): ${label}`);
    return;
  }

  // === Mod-kommandon ===
  if (!isModOrBroadcaster(userstate)) return;

  // NY: !srlist (mods only) – lista ALLT med vem som önskat
  if (CMD_LIST_MOD.test(message)) {
    if (!pending.length) { if (REPLY) client.say(TWITCH_CHANNEL, `Inga väntande song requests.`); return; }

    const lines = pending.map((p, i) => {
      const idx = i + 1;
      const who = p.display || p.user;
      const label = p.resolved?.name
        ? `${p.resolved.name} — ${p.resolved.artists || ""}${p.resolved.url ? " " + p.resolved.url : ""}`
        : (p.resolved?.url || p.query || "(okänd)");
      return `${idx}. ${who}: ${label}`;
    });

    await sayChunks(client, TWITCH_CHANNEL, `Väntelista (${pending.length}):`, lines, " | ");
    return;
  }

  // Befintlig snabböversikt (topp 5)
  if (CMD_QUEUE.test(message)) {
    if (!pending.length) { if (REPLY) client.say(TWITCH_CHANNEL, `Inga väntande song requests.`); return; }
    const list = pending.slice(0, 5).map((p, i) => {
      const idx = i + 1;
      const who = p.display || p.user;
      const label = p.resolved?.name
        ? `${p.resolved.name} — ${p.resolved.artists || ""}`
        : (p.resolved?.url || p.query || "(okänd)");
      return `${idx}. ${who}: ${label}`;
    });
    if (REPLY) client.say(TWITCH_CHANNEL, `Väntelista (${pending.length}): ${list.join(" | ")}`);
    return;
  }

  if (CMD_APPR_ALL.test(message)) {
    if (!pending.length) { if (REPLY) client.say(TWITCH_CHANNEL, `Det finns inga väntande requests att godkänna.`); return; }
    if (REPLY) client.say(TWITCH_CHANNEL, `Godkänner hela kön (${pending.length})…`);

    const snapshot = pending.slice(0);
    for (const item of snapshot) {
      try {
        const still = pending.find(p => p.id === item.id);
        if (!still) continue;

        if (!item.resolved) {
          const found = await spotifySearchBestTrack(item.query);
          if (!found) {
            if (REPLY) client.say(TWITCH_CHANNEL, `${tag(item.display)} hittade ingen låt för “${item.query}”. Skippas.`);
            removePending(item.id);
            await sleep(200);
            continue;
          }
          item.resolved = found;
        }

        await spotifyAddToQueue(item.resolved.uri);
        if (REFUND_ENABLED && TWITCH_SONG_REWARD_ID) {
          try { await fulfilOldestForUser(item.user); } catch(e){ console.warn("[sr-bot] fulfil error:", e.message || e); }
        }

        if (REPLY) {
          const label = item.resolved.name
            ? `${item.resolved.name} — ${item.resolved.artists || ""}${item.resolved.url ? " " + item.resolved.url : ""}`
            : (item.resolved.url || item.query || "");
          client.say(TWITCH_CHANNEL, `${tag(item.display)} din låt är godkänd och ligger i kön: ${label}`);
        }
        removePending(item.id);
      } catch (e) {
        const msg = String(e?.message || e);
        if (REPLY) {
          if (msg.includes("no_active_device")) {
            client.say(TWITCH_CHANNEL, `Ingen aktiv Spotify-enhet. Starta Spotify först.`);
            break;
          } else if (msg.includes("no_access_token")) {
            client.say(TWITCH_CHANNEL, `Spotify-token saknas/utgången. Kör om /login på servern.`);
            break;
          } else {
            client.say(TWITCH_CHANNEL, `Kunde inte lägga till i kön just nu för ${tag(item.display)} – fortsätter…`);
          }
        }
        console.error("[sr-bot] approve-all error:", e);
      }
      if (APPROVE_ALL_DELAY_MS) await sleep(APPROVE_ALL_DELAY_MS);
    }
    if (REPLY) client.say(TWITCH_CHANNEL, `Klart! Kvar i väntelistan: ${pending.length}.`);
    return;
  }

  const apprOne = message.match(CMD_APPR_ONE);
  if (apprOne) {
    const target = trimText(apprOne[1] || "");
    if (!target) { if (REPLY) client.say(TWITCH_CHANNEL, `Använd: !srapprove <nummer eller @user>`); return; }
    let item = findPendingByIndexStr(target) || findPendingByUser(target);
    if (!item) { if (REPLY) client.say(TWITCH_CHANNEL, `Hittar ingen pending som matchar "${target}".`); return; }

    try {
      if (!item.resolved) {
        const found = await spotifySearchBestTrack(item.query);
        if (!found) { if (REPLY) client.say(TWITCH_CHANNEL, `Hittade ingen passande låt för “${item.query}”.`); return; }
        item.resolved = found;
      }
      await spotifyAddToQueue(item.resolved.uri);

      if (REFUND_ENABLED && TWITCH_SONG_REWARD_ID) {
        try { await fulfilOldestForUser(item.user); } catch(e){ console.warn("[sr-bot] fulfil error:", e.message || e); }
      }

      if (REPLY) {
        const label = item.resolved.name
          ? `${item.resolved.name} — ${item.resolved.artists || ""}${item.resolved.url ? " " + item.resolved.url : ""}`
          : (item.resolved.url || item.query || "");
        client.say(TWITCH_CHANNEL, `${tag(item.display)} din låt blev godkänd och ligger nu i kön: ${label}`);
      }
      removePending(item.id);
    } catch (e) {
      const msg = String(e?.message || e);
      if (REPLY) {
        if (msg.includes("no_active_device")) client.say(TWITCH_CHANNEL, `Ingen aktiv Spotify-enhet. Starta Spotify först.`);
        else if (msg.includes("no_access_token")) client.say(TWITCH_CHANNEL, `Spotify-token saknas/utgången. Kör om /login på servern.`);
        else client.say(TWITCH_CHANNEL, `Kunde inte lägga till i kön just nu.`);
      }
      console.error("[sr-bot] approve error:", e);
    }
    return;
  }

  const deny = message.match(CMD_DENY);
  if (deny) {
    const target = trimText(deny[1] || "");
    if (!target) { if (REPLY) client.say(TWITCH_CHANNEL, `Använd: !srdeny <nummer eller @user>`); return; }
    let item = findPendingByIndexStr(target) || findPendingByUser(target);
    if (!item) { if (REPLY) client.say(TWITCH_CHANNEL, `Hittar ingen pending som matchar "${target}".`); return; }

    removePending(item.id);

    if (REFUND_ENABLED && TWITCH_SONG_REWARD_ID) {
      try {
        const ok = await refundOldestForUser(item.user);
        if (REPLY) client.say(TWITCH_CHANNEL, `${tag(item.display)} din låt blev nekad${ok ? " och poäng har återbetalats" : ""}.`);
      } catch (e) {
        console.warn("[sr-bot] refund deny error:", e.message || e);
        if (REPLY) client.say(TWITCH_CHANNEL, `${tag(item.display)} din låt blev nekad (refund misslyckades).`);
      }
    } else {
      if (REPLY) client.say(TWITCH_CHANNEL, `${tag(item.display)} din låt blev nekad (refund ej aktiverad).`);
    }
    return;
  }

  if (CMD_CLEAR.test(message)) {
    if (!pending.length) { if (REPLY) client.say(TWITCH_CHANNEL, `Kön är redan tom.`); return; }

    const toClear = pending.slice(0);
    pending.length = 0;

    if (REFUND_ENABLED && TWITCH_SONG_REWARD_ID) {
      if (REPLY) client.say(TWITCH_CHANNEL, `Tömmer kö och återbetalar poäng… (${toClear.length})`);
      for (const item of toClear) {
        try { await refundOldestForUser(item.user); } catch(e){ console.warn("[sr-bot] refund clear error:", e.message || e); }
        await sleep(150);
      }
      if (REPLY) client.say(TWITCH_CHANNEL, `Klart. Kö är tom.`);
    } else {
      if (REPLY) client.say(TWITCH_CHANNEL, `Tömde kön (${toClear.length}). (Refund ej aktiverad)`);
    }
    return;
  }

  if (CMD_STATUS.test(message)) {
    const n = pending.length;
    const peek = pending.slice(0, 3).map(p => {
      const who = p.display || p.user;
      return `${who}: ${(p.resolved?.name || p.resolved?.url || p.query || "(okänd)")}`;
    });
    if (REPLY) client.say(TWITCH_CHANNEL, `Pending: ${n}${peek.length ? " | " + peek.join(" | ") : ""}`);
    return;
  }
});