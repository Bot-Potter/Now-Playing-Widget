# 🎵 Spotify Now Playing Widget + Twitch Overlay

Detta projekt visar vilken låt som spelas på Spotify i realtid, tillsammans med de senaste spelade låtarna.  
Dessutom kan widgeten triggas i en **OBS-overlay** när någon skriver `!song` eller `!låt` i din Twitch-chat.

Byggt med:
- **Node.js + Express** (server + API)
- **Spotify Web API** (hämtar "Now Playing")
- **Lokal recent-buffer** (bygger en lista med senast spelade låtar utan att spamma Spotify API)
- **SSE (Server-Sent Events)** för overlay
- **tmi.js** för Twitch-integration
- **Ren HTML/CSS/JS frontend** (inget byggsteg)

---

## 🚀 Funktioner

- Visa nuvarande låt med albumomslag, färgteman och progressbar.
- Visa de tre senaste låtarna (byggt lokalt när du byter låt).
- Automatiskt hantering av pausade låtar:
  - Behåller albumomslag och färg.
  - Visar texten *“Ingen låt spelas just nu”*.
- Twitch-integration:
  - När någon skriver `!song` eller `!låt` i chatten triggas en overlay som visar kortet i 10 sekunder.
- Inbyggt stöd för **transparent bakgrund** (via `?bg=transparent` i URL).
- Enkel deployment till **Render.com** eller annan Node.js-host.

---

## 📂 Struktur
/public
index.html ← huvudwidgeten
overlay.html ← OBS-overlay som triggas av !song
server.js ← Node.js/Express server + API
refresh_token.json ← (sparad refresh token från Spotify
