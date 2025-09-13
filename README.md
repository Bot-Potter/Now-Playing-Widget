# 🎵 Spotify Now Playing Widget + Twitch Overlay

Detta projekt visar i realtid vilken låt som spelas på Spotify.  
Det innehåller även en Twitch-overlay som kan triggas när någon i din chatt skriver `!song` eller `!låt`.  

Widgeten är byggd för att vara **snygg, responsiv och enkel att integrera** i både vanliga hemsidor och OBS.  
Funktionaliteten är helt fristående – du behöver bara köra en Node.js-server, koppla in ditt Spotify-konto och valfritt en Twitch-bot.

---

## 🚀 Funktioner

- **Now Playing-kort**  
  - Visar låtens titel, artist, albumomslag och progressbar.  
  - Färgsätts automatiskt efter dominerande färg i albumomslaget.  

- **Pausläge**  
  - När låten pausas behålls albumomslag och färgtema.  
  - Texten *“Ingen låt spelas just nu”* visas.  

- **Senaste spelade låtar**  
  - Visar de tre senaste spåren (byggs lokalt vid track-byte, undviker spam mot Spotify API).  

- **Twitch-overlay**  
  - När någon skriver `!song` eller `!låt` i din chatt, triggas overlayen i OBS.  
  - Kortet flyger in underifrån, visas i 10 sekunder och försvinner igen.  

- **Anpassningsbar inbäddning**  
  - Transparent bakgrund (`?bg=transparent`).  
  - Dölj senaste spelade-låtarna (`?recent=0`).  

---

## 📂 Projektstruktur

/public
index.html ← huvudwidgeten
overlay.html ← OBS-overlay för !song
app.js ← frontend-logik
server.js ← Node.js/Express-server (Spotify API + SSE + Twitch listener)
refresh_token.json ← sparad refresh token från Spotify
.env ← miljövariabler

yaml
Kopiera kod

---

## ⚙️ Installation

### 1. Klona repot
```bash
git clone https://github.com/dittnamn/spotify-now-playing-widget.git
cd spotify-now-playing-widget
2. Installera dependencies
bash
Kopiera kod
npm install
3. Skapa .env
ini
Kopiera kod
# Spotify
SPOTIFY_CLIENT_ID=din_spotify_client_id
SPOTIFY_CLIENT_SECRET=din_spotify_client_secret
SPOTIFY_REDIRECT_URI=https://din-deploy-url/callback
REFRESH_TOKEN=din_refresh_token

# Twitch (valfritt, krävs bara om du vill trigga overlay via !song)
TWITCH_USERNAME=din_twitchbot
TWITCH_OAUTH_TOKEN=oauth:din_twitchtoken
TWITCH_CHANNEL=din_twitchkanal

# Admin
ADMIN_SECRET=valfrihemligsträng

# Server
PORT=3000
🎧 Spotify-setup
Gå till Spotify Developer Dashboard.

Skapa en ny app → kopiera Client ID och Client Secret.

Lägg till Redirect URI:

arduino
Kopiera kod
https://din-deploy-url/callback
Starta servern:

bash
Kopiera kod
npm start
Gå till http://localhost:3000/login, logga in → kopiera refresh_token → lägg i .env.

🖥️ Användning
Starta servern
bash
Kopiera kod
npm start
Servern kör på http://localhost:3000.

Viktiga endpoints
/ → huvudwidgeten (index.html)

/overlay.html → OBS-overlay (visas på !song)

/now-playing → aktuell låt

/now-snapshot → snapshot (för paus)

/recent → senaste spelade låtar (lokal buffer)

/whoami → info om Spotify-kontot

/events → SSE-ström för overlay

/healthz → health check

🎨 Frontend & parametrar
Huvudwidget (index.html)
Visar nuvarande låt och senaste 3 spelade.
Kortet färgsätts efter albumomslaget och fallback är offwhite.

Parametrar
?bg=transparent → gör bakgrunden genomskinlig.

?recent=0 → döljer de tre senaste låtarna.

Exempel:

bash
Kopiera kod
https://din-deploy-url/?bg=transparent&recent=0
OBS-overlay
Lägg till en Browser Source i OBS:

URL: https://din-deploy-url/overlay.html

Bredd/höjd: anpassa efter layout

När någon skriver !song eller !låt i chatten visas kortet i 10 sekunder.

🔧 Admin & Debug
Sätt refresh token manuellt
bash
Kopiera kod
curl -X POST https://din-deploy-url/admin/set-refresh \
  -H "x-admin-secret: DIN_ADMIN_SECRET" \
  --data "din_refresh_token"
Kolla Spotify-användare
bash
Kopiera kod
GET /whoami
Miljöcheck
sql
Kopiera kod
GET /env-check
📸 Screenshots
Now Playing widget (exempel)
(lägg gärna till egna screenshots här)

📝 TODO & Idéer
 Cacha accent-färger för bättre prestanda.

 Lägg till fler chatkommandon (!lastsong, !album).

 Tema-val (ljus/mörk).

 Visa längre historik än 3 låtar.

📜 Licens
MIT – gör vad du vill, men länka gärna tillbaka till projektet.

👨‍💻 Byggt med ❤️ för Twitch & Spotify-communityn.

yaml
Kopiera kod

---

Vill du att jag även skriver en **kortare README**-variant (bara usage + OBS) för repots framsida, så kan du ha den här längre i `docs/README.md`?







Fråga ChatGPT
