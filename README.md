# 🎵 Twitch Låtförfrågningssystem# 🎵 Twitch Song Request System# 🎵 Twitch Song Request System# 🎵 Twitch Song Request System# Twitch Song Request System



Ett komplett system för låtförfrågningar på Twitch med Spotify-integration. Tittare kan köa låtar via kanalpoäng, och moderatorer har full kontroll över kön.



[![Node.js](https://img.shields.io/badge/Node.js-v18+-green.svg)](https://nodejs.org/)Ett komplett system för låtförfrågningar på Twitch med Spotify-integration. Tittare kan köa låtar via Channel Points, och moderatorer har full kontroll över kön.

[![Licens: MIT](https://img.shields.io/badge/Licens-MIT-blue.svg)](LICENSE)

[![Spotify API](https://img.shields.io/badge/Spotify-API-1DB954.svg)](https://developer.spotify.com/)

[![Twitch](https://img.shields.io/badge/Twitch-Integration-9146FF.svg)](https://dev.twitch.tv/)

[![Node.js](https://img.shields.io/badge/Node.js-v18+-green.svg)](https://nodejs.org/)Ett komplett system för låtförfrågningar på Twitch med Spotify-integration. Tittare kan köa låtar via Channel Points eller chatkommandon, och moderatorer har full kontroll över kön.

---

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## 📋 Innehållsförteckning

[![Spotify API](https://img.shields.io/badge/Spotify-API-1DB954.svg)](https://developer.spotify.com/)

- [Funktioner](#-funktioner)

- [Krav](#-krav)[![Twitch](https://img.shields.io/badge/Twitch-Integration-9146FF.svg)](https://dev.twitch.tv/)

- [Installation](#-installation)

- [Konfiguration](#-konfiguration)[![Node.js](https://img.shields.io/badge/Node.js-v18+-green.svg)](https://nodejs.org/)<div align="center">A complete Twitch song request and now playing system with Spotify integration, moderation tools, and OBS overlay support.

- [Användning](#-användning)

- [Botkommandon](#-botkommandon)---

- [Administrationsgränssnitt](#-administrationsgränssnitt)

- [OBS-integration](#-obs-integration)[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

- [Felsökning](#-felsökning)

- [Projektstruktur](#-projektstruktur)## 📋 Innehållsförteckning



---[![Spotify API](https://img.shields.io/badge/Spotify-API-1DB954.svg)](https://developer.spotify.com/)



## ✨ Funktioner- [Funktioner](#-funktioner)



### 🎤 För Tittare- [Krav](#-krav)[![Twitch](https://img.shields.io/badge/Twitch-Integration-9146FF.svg)](https://dev.twitch.tv/)

- **Kanalpoäng** - Köa låtar med kanalpoäng

- **Flexibel sökning** - Låtnamn, artist eller Spotify-länkar- [Installation](#-installation)

- **Smart matchning** - Automatisk igenkänning av "låt av artist"

- **Dubblettskydd** - Filtrerar nyligen spelade låtar- [Konfiguration](#-konfiguration)![Status](https://img.shields.io/badge/status-production%20ready-brightgreen)## Features

- **Automatisk återbetalning** - Vid fel eller nekade förfrågningar

- [Användning](#-användning)

### 🛡️ För Moderatorer

- **`!sr <låt>`** - Köa låtar gratis utan kanalpoäng- [Bot-kommandon](#-bot-kommandon)---

- **`!srapprove`** - Godkänn väntande förfrågningar

- **`!srdeny <anledning>`** - Neka med återbetalning- [Admin-gränssnitt](#-admin-gränssnitt)

- **`!srclear`** - Rensa hela kön

- **`!srskip`** - Hoppa över nuvarande låt- [OBS Integration](#-obs-integration)![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)

- **`!srqueue`** - Visa aktiv kö

- [Felsökning](#-felsökning)

### 🎛️ För Streamers

- **Administrationspanel** - Hantera systemet från webbläsaren- [Projektstruktur](#-projektstruktur)## 📋 Innehållsförteckning

- **Uppdatering i realtid** - Ändra pris och beskrivning direkt

- **OBS-överlägg** - Visa "Spelar Nu" på streamen

- **Automatisk tokenförnyelse** - Inga manuella uppdateringar

- **Uppskjuten kö** - Sparar förfrågningar när Spotify är inaktivt---![License](https://img.shields.io/badge/license-MIT-blue)- **Spotify Integration**: Display currently playing songs and manage playback



---



## 🔧 Krav## ✨ Funktioner- [Funktioner](#-funktioner)



- **Node.js** v18 eller senare

- **Spotify Premium** (krävs för att lägga till i kö)

- **Twitch-konto** med affiliate/partner-status### 🎤 För Tittare- [Krav](#-krav)- **Twitch Chat Bot**: Automated song request handling with moderator commands

- **Git** för att klona projektet

- **Channel Points** - Köa låtar med kanalpoäng

---

- **Flexibel sökning** - Låtnamn, artist eller Spotify-länkar- [Installation](#-installation)

## 📥 Installation

- **Smart matchning** - Automatisk detection av "låt av artist"

### Steg 1: Klona projektet

- **Duplikatskydd** - Filtrerar nyligen spelade låtar- [Konfiguration](#-konfiguration)**Ett komplett system för låtförfrågningar på Twitch med Spotify-integration**- **Channel Points**: Automatic fulfillment and refunds for song requests

```bash

git clone https://github.com/dittnamn/twitch-song-request.git- **Automatisk återbetalning** - Vid fel eller nekade requests

cd twitch-song-request

```  - [Spotify Setup](#1-spotify-setup)



### Steg 2: Installera beroenden### 🛡️ För Moderatorer



```bash- **`!sr <låt>`** - Köa låtar gratis utan Channel Points  - [Twitch Setup](#2-twitch-setup)- **Moderation Tools**: Approve, deny, or clear song requests

npm install

```- **`!srapprove`** - Godkänn väntande förfrågningar



### Steg 3: Första start- **`!srdeny <anledning>`** - Neka med återbetalning  - [Environment Variabler](#3-environment-variabler)



Kör servern för att automatiskt generera `.env`:- **`!srclear`** - Rensa hela kön



```bash- **`!srskip`** - Skippa nuvarande låt- [Användning](#-användning)[Features](#-features) • [Installation](#-installation) • [Konfiguration](#%EF%B8%8F-konfiguration) • [Användning](#-användning) • [Bot-kommandon](#-bot-kommandon) • [Felsökning](#-felsökning)- **OBS Overlay**: Beautiful now playing display for your stream

npm run dev

```- **`!srqueue`** - Visa aktiv kö



Du kommer se:- [Bot-kommandon](#-bot-kommandon)

```

✅ Created .env file from .env.example### 🎛️ För Streamers

⚠️  Please edit .env and add your API credentials before continuing!

```- **Admin-panel** - Hantera systemet från webbläsaren- [Admin-gränssnitt](#-admin-gränssnitt)- **Web Dashboard**: Monitor and control the system via web interface



---- **Live reward-uppdatering** - Ändra pris och beskrivning i realtid



## ⚙️ Konfiguration- **OBS Overlay** - Visa "Now Playing" på stream- [OBS Integration](#-obs-integration)



### 1️⃣ Spotify-konfiguration- **Auto-refresh tokens** - Inga manuella uppdateringar



#### Skapa Spotify-app- **Deferred queue** - Sparar förfrågningar när Spotify är inaktivt- [Projektstruktur](#-projektstruktur)</div>- **OAuth Setup**: Easy token generation for Spotify and Twitch



1. Gå till [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)

2. Klicka **"Create app"**

3. Fyll i:---- [Felsökning](#-felsökning)

   - **Appnamn**: `Twitch Song Request`

   - **Appbeskrivning**: `Låtförfrågningssystem`

   - **Omdirigeringsadress**: `http://localhost:3000/spotify/callback`

   - **API**: Kryssa i **Web API**## 🔧 Krav- [Bidra](#-bidra)

4. Klicka **"Save"**

5. Kopiera **Client ID** och **Client Secret**



#### Uppdatera .env- **Node.js** v18 eller senare- [Licens](#-licens)



```env- **Spotify Premium** (krävs för att lägga till i kö)

SPOTIFY_CLIENT_ID=ditt_client_id

SPOTIFY_CLIENT_SECRET=ditt_client_secret- **Twitch** konto med affiliate/partner-status---## Table of Contents

SPOTIFY_REDIRECT_URI=http://localhost:3000/spotify/callback

```- **Git** för att klona projektet



#### Auktorisera Spotify---



1. Starta servern: `npm run dev`---

2. Öppna: `http://localhost:3000/spotify/login`

3. Logga in och godkänn

4. Tokens sparas automatiskt

## 📥 Installation

---

## ✨ Funktioner

### 2️⃣ Twitch-konfiguration

### Steg 1: Klona projektet

#### A. Skapa Twitch-applikation

## ✨ Features1. [Prerequisites](#prerequisites)

1. Gå till [Twitch Developer Console](https://dev.twitch.tv/console/apps)

2. Klicka **"Register Your Application"**```bash

3. Fyll i:

   - **Namn**: `Song Request Bot`git clone https://github.com/dittnamn/twitch-song-request.git### 🎤 För Tittare

   - **OAuth-omdirigeringsadresser**: `http://localhost:3000/twitch/callback`

   - **Kategori**: `Chat Bot`cd twitch-song-request

4. Klicka **"Create"** → **"Manage"**

5. Kopiera **Client ID** och generera **Client Secret**```- **Channel Points Song Requests** - Köa låtar med kanalpoäng2. [Installation](#installation)



#### B. Hämta Broadcaster ID



1. Gå till: https://www.streamweasels.com/tools/convert-twitch-username-to-user-id/### Steg 2: Installera beroenden- **Flexibel sökning** - Sök på låtnamn, artist, eller klistra in Spotify-länkar

2. Ange ditt användarnamn

3. Kopiera **User ID**



#### C. Skapa kanalpoängsbelöning```bash- **Smart matchning** - Automatisk "låt av artist" detection### 🎮 Twitch-integration3. [Quick Setup Guide](#quick-setup-guide)



**Alternativ 1: Via konfigurationssidan (enklast)**npm install



1. Öppna `http://localhost:3000/setup.html````- **Duplikatskydd** - Filtrerar bort nyligen spelade låtar

2. Följ guiden under "Skapa låtförfrågningsbelöning"

3. Fyll i titel, pris och beskrivning

4. Klicka **"Skapa belöning"**

5. Belönings-ID kopieras automatiskt### Steg 3: Första start- **Automatisk återbetalning** - Om något går fel eller streamer avslår- **Kanalpoäng-system** - Tittare löser in låtar med Channel Points4. [Spotify Setup](#spotify-setup)



**Alternativ 2: Manuellt via Twitch-instrumentpanelen**



1. Gå till [Twitch Dashboard](https://dashboard.twitch.tv/) → **Community** → **Kanalpoäng**Kör servern för att auto-generera `.env`:

2. Klicka **"Lägg till ny anpassad belöning"**

3. Konfigurera:

   - **Titel**: `Låtförfrågan`

   - **Kostnad**: `1000` (eller valfritt)```bash### 🛡️ För Moderatorer- **Automatisk moderering** - Pending-kö där mods godkänner/nekar låtar5. [Twitch Setup](#twitch-setup)

   - **Beskrivning**: `Köa en låt! Skriv låtnamn eller klistra in Spotify-länk`

   - **Kräver användarinmatning**: `✅ På`npm run dev

4. Spara och kopiera belönings-ID från webbadressen

```- **`!sr <låt>`** - Köa låtar gratis utan Channel Points

#### D. Hämta chatt-OAuth-token



1. Gå till [Twitch Token Generator](https://twitchtokengenerator.com/)

2. Välj **"Bot Chat Token"**Du kommer se:- **`!srapprove`** - Godkänn väntande låtförfrågningar- **Auto-refund** - Återbetalar kanalpoäng vid timeout eller nekade requests6. [Environment Variables](#environment-variables)

3. Godkänn och kopiera token (inkl. `oauth:` prefix)

```

#### Uppdatera .env

✅ Created .env file from .env.example- **`!srdeny <anledning>`** - Neka förfrågningar med återbetalning

```env

# Twitch API⚠️  Please edit .env and add your API credentials before continuing!

TWITCH_CLIENT_ID=ditt_client_id

TWITCH_CLIENT_SECRET=ditt_client_secret```- **`!srclear`** - Rensa hela kön- **Smart kommando-system** - Kraftfulla mod-kommandon för köhantering7. [Running the Application](#running-the-application)

TWITCH_REDIRECT_URI=http://localhost:3000/twitch/callback

BROADCASTER_ID=ditt_user_id



# Twitch-chattbot---- **`!srskip`** - Skippa nuvarande låt

TWITCH_BOT_USERNAME=ditt_bot_användarnamn

TWITCH_BOT_OAUTH=oauth:ditt_token

TWITCH_CHANNEL=din_kanal

## ⚙️ Konfiguration- **`!srqueue`** - Visa aktiv kö- **Mods kan köa gratis** - `!sr` kommando för snabb låthantering8. [Usage](#usage)

# Belönings-ID

TWITCH_SONG_REWARD_ID=ditt_reward_id

```

### 1️⃣ Spotify Setup

#### Auktorisera Twitch API



1. Öppna: `http://localhost:3000/twitch/login`

2. Logga in och godkänn#### Skapa Spotify App### 🎛️ För Streamers9. [Bot Commands](#bot-commands)

3. Tokens sparas automatiskt



---

1. Gå till [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)- **Web-baserad admin-panel** - Hantera hela systemet från webbläsaren

## 🚀 Användning

2. Klicka **"Create app"**

### Starta systemet

3. Fyll i:- **Live reward-uppdatering** - Ändra pris och beskrivning i realtid### 🎧 Spotify-integration10. [OBS Integration](#obs-integration)

#### Terminal 1: Starta servern

   - **App name**: `Twitch Song Request`

```bash

npm run dev   - **App description**: `Song request system`- **OBS Overlay** - Visa "Now Playing" på stream

```

   - **Redirect URI**: `http://localhost:3000/spotify/callback`

Servern startar på `http://localhost:3000`

   - **API**: Kryssa i **Web API**- **Auto-refresh tokens** - Inga manuella token-uppdateringar- **Realtidsspelning** - Visar nuvarande låt i overlay

#### Terminal 2: Starta boten

4. Klicka **"Save"**

```bash

npm run bot5. Kopiera **Client ID** och **Client Secret**- **Deferred queue** - Sparar förfrågningar om Spotify inte är aktivt

```



Boten ansluter till Twitch-chatten

#### Uppdatera .env- **Smart sökning** - Intelligenta algoritmer för att hitta rätt låt---

**Windows: Starta båda samtidigt**



```bash

start.bat```env---

```

SPOTIFY_CLIENT_ID=din_client_id

---

SPOTIFY_CLIENT_SECRET=din_client_secret- **Direktlänkar** - Stöd för Spotify-länkar och URI:er

### Tillgängliga sidor

SPOTIFY_REDIRECT_URI=http://localhost:3000/spotify/callback

| Webbadress | Beskrivning |

|-----|-------------|```## 🔧 Krav

| `http://localhost:3000/` | Spelar nu-visning |

| `http://localhost:3000/admin.html` | Administrationspanel |

| `http://localhost:3000/overlay.html` | OBS-överlägg |

| `http://localhost:3000/setup.html` | Konfigurationsguide |#### Auktorisera Spotify- **Köhantering** - Automatisk tilläggning i Spotify-kön## Prerequisites

| `http://localhost:3000/uppdaterapris` | Uppdatera belöning |



---

1. Starta servern: `npm run dev`- **Node.js** v18 eller senare

## 💬 Botkommandon

2. Öppna: `http://localhost:3000/spotify/login`

### För Moderatorer

3. Logga in och godkänn- **Spotify Premium** konto (krävs för att lägga till i kö)- **Auto-refresh tokens** - Ingen manuell förnyelse behövs

| Kommando | Beskrivning | Exempel |

|----------|-------------|---------|4. Tokens sparas automatiskt

| `!sr <låt>` | Köa låt gratis | `!sr Sandstorm av Darude` |

| `!srapprove` | Godkänn nästa i kön | `!srapprove` |- **Twitch** konto med partner/affiliate-status för Channel Points

| `!srdeny <text>` | Neka och återbetala | `!srdeny För lång låt` |

| `!srclear` | Rensa hela kön | `!srclear` |---

| `!srskip` | Hoppa över nuvarande | `!srskip` |

| `!srqueue` | Visa kön | `!srqueue` |- **Git** (för att klona projektet)- **Undvik dubbletter** - Filtrerar nyligen spelade låtar- **Node.js** (v18 or higher)



### För Tittare### 2️⃣ Twitch Setup



| Kommando | Beskrivning |

|----------|-------------|

| **Kanalpoäng** | Använd "Låtförfrågan"-belöningen |#### A. Skapa Twitch Application



------- **npm** (comes with Node.js)



### Smart sökning1. Gå till [Twitch Developer Console](https://dev.twitch.tv/console/apps)



Boten förstår flera format:2. Klicka **"Register Your Application"**



```bash3. Fyll i:

# Låtnamn

Sandstorm   - **Name**: `Song Request Bot`## 📥 Installation### 🖥️ Webb-interface- **Spotify Account** (Premium recommended for playback control)



# Låt + Artist   - **OAuth Redirect URLs**: `http://localhost:3000/twitch/callback`

Bohemian Rhapsody av Queen

Smells Like Teen Spirit by Nirvana   - **Category**: `Chat Bot`



# Spotify-länk4. Klicka **"Create"** → **"Manage"**

https://open.spotify.com/track/3n3Ppam7vgaVa1iaRUc9Lp

5. Kopiera **Client ID** och generera **Client Secret**### Steg 1: Klona projektet- **Now Playing Display** - Snygg visning av aktuell låt- **Twitch Account**

# Spotify URI

spotify:track:3n3Ppam7vgaVa1iaRUc9Lp

```

#### B. Hämta Broadcaster ID

---



## 🎛️ Administrationsgränssnitt

1. Gå till: https://www.streamweasels.com/tools/convert-twitch-username-to-user-id/```bash- **OBS Overlay** - Browser source-klar overlay för streams- **Twitch Channel Points Reward** (for song requests)

### Uppdatera belöningspris

2. Ange ditt användarnamn

1. Gå till `http://localhost:3000/uppdaterapris`

2. Ändra pris, titel eller beskrivning3. Kopiera **User ID**git clone https://github.com/dittnamn/twitch-song-request.git

3. Klicka **"Uppdatera belöning"**

4. Ändringarna träder i kraft direkt



### Administrationspanel#### C. Skapa Channel Points Rewardcd twitch-song-request- **Admin Panel** - Hantera inställningar och se loggar



På `http://localhost:3000/admin.html`:



- ✅ Se nuvarande låt**Alternativ 1: Via Setup-sidan (enklast)**```

- ✅ Hantera väntande kö

- ✅ Visa uppskjuten kö

- ✅ Manuellt köa låtar

1. Öppna `http://localhost:3000/setup.html`- **Setup Wizard** - Guidad konfiguration av tokens och rewards---

---

2. Följ guiden under "Create Song Request Reward"

## 📺 OBS-integration

3. Fyll i titel, pris och beskrivning### Steg 2: Installera beroenden

### Lägg till Spelar Nu-överlägg

4. Klicka **"Create Reward"**

1. Öppna **OBS Studio**

2. Klicka **+** under Källor → **Webbläsare**5. Reward ID kopieras automatiskt- **Reward Manager** - Uppdatera pris och beskrivning direkt i webbläsaren

3. Namnge: `Spelar Nu`

4. Konfigurera:

   - **Webbadress**: `http://localhost:3000/overlay.html`

   - **Bredd**: `1920`**Alternativ 2: Manuellt via Twitch Dashboard**```bash

   - **Höjd**: `1080`

   - ✅ **Uppdatera webbläsare när scenen aktiveras**

5. Klicka **OK**

6. Positionera efter önskemål1. Gå till [Twitch Dashboard](https://dashboard.twitch.tv/) → **Community** → **Channel Points**npm install## Installation



**Överlägget visar:**2. Klicka **"Add New Custom Reward"**

- 🎵 Låtnamn

- 👤 Artist3. Konfigurera:```

- 🖼️ Omslagsbild

- ⏱️ Förloppsindikator   - **Title**: `Song Request`



---   - **Cost**: `1000` (eller valfritt)### 🤖 Avancerad bot-funktionalitet



## 🐛 Felsökning   - **Description**: `Köa en låt! Skriv låtnamn eller klistra in Spotify-länk`



### Servern startar inte   - **User Input Required**: `✅ På`### Steg 3: Första start



**Problem:** `Error: listen EADDRINUSE: address already in use :::3000`4. Spara och kopiera Reward ID från URL:en



**Lösning:**- **Pending-kö** - Max 50 väntande requests med 15 min timeout1. Clone the repository:

- Stoppa processen på port 3000, eller

- Ändra `PORT=3001` i `.env`#### D. Hämta Chat OAuth Token



---Kör servern för att auto-generera `.env` från mallen:



### Spotify-låtar läggs inte till1. Gå till [Twitch Token Generator](https://twitchtokengenerator.com/)



**Problem:** `403 Forbidden` eller `Premium required`2. Välj **"Bot Chat Token"**- **Deferred queue** - Sparar låtar när Spotify är inaktivt```bash



**Lösning:**3. Godkänn och kopiera token (inkl. `oauth:` prefix)

- Kontrollera att Spotify Premium är aktivt

- Starta Spotify-appen på någon enhet```bash

- Spela en låt manuellt först

#### Uppdatera .env

---

npm run dev- **Rate limiting** - Smart hantering av Spotify API-begränsningargit clone <your-repo-url>

### Boten ansluter inte

```env

**Problem:** `Login authentication failed`

# Twitch API```

**Lösning:**

1. Verifiera att `TWITCH_BOT_USERNAME` är korrektTWITCH_CLIENT_ID=din_client_id

2. Kontrollera att `TWITCH_BOT_OAUTH` har `oauth:`-prefix

3. Generera ny token på [Twitch Token Generator](https://twitchtokengenerator.com/)TWITCH_CLIENT_SECRET=din_client_secret- **Strukturerad sökning** - "låt av artist" ger bättre träffarcd <project-directory>

4. Uppdatera `.env` och starta om

TWITCH_REDIRECT_URI=http://localhost:3000/twitch/callback

---

BROADCASTER_ID=ditt_user_idDu kommer se:

### Kanalpoäng fungerar inte



**Problem:** Inlösen utlöser inte boten

# Twitch Chat Bot```- **Deduplikation** - Undviker att samma låt köas flera gånger```

**Lösning:**

1. Kontrollera att `TWITCH_SONG_REWARD_ID` är korrektTWITCH_BOT_USERNAME=din_bot_username

2. Verifiera auktorisering via `/twitch/login`

3. Kolla att belöningen kräver användarinmatningTWITCH_BOT_OAUTH=oauth:din_token✅ Created .env file from .env.example

4. Se till att `BROADCASTER_ID` stämmer

TWITCH_CHANNEL=din_kanal

---

⚠️  Please edit .env and add your API credentials before continuing!

### Token utgången

# Reward ID

**Problem:** `Invalid OAuth token`

TWITCH_SONG_REWARD_ID=din_reward_id```

**Lösning:** Systemet har automatisk förnyelse, men om det fallerar:

1. Besök `/spotify/login` för Spotify```

2. Besök `/twitch/login` för Twitch

3. Starta om servern och boten---2. Install dependencies:



---#### Auktorisera Twitch API



### Duplicerade låtarNu måste du konfigurera dina API-nycklar innan systemet fungerar.



**Problem:** Samma låt köas flera gånger1. Öppna: `http://localhost:3000/twitch/login`



**Lösning:**2. Logga in och godkänn```bash

- Boten filtrerar automatiskt de senaste 50 låtarna

- Kontrollera att endast EN botinstans körs3. Tokens sparas automatiskt

- Verifiera att Spotify Premium är aktivt

---

---

---

### Uppskjuten kö töms inte

## 📋 Kravnpm install

**Problem:** Låtar fastnar i "uppskjuten kö"

## 🚀 Användning

**Lösning:**

1. Starta Spotify-appen## ⚙️ Konfiguration

2. Spela en låt manuellt

3. Boten köar automatiskt inom 30 sekunder### Starta systemet



---```



### OBS-överlägg tomt#### Terminal 1: Starta servern



**Problem:** Ingen visning i OBS### 1. Spotify Setup



**Lösning:**```bash

1. Kontrollera att servern körs

2. Testa `http://localhost:3000/overlay.html` i webbläsarenpm run dev- **Node.js** v18.0.0 eller högre

3. Högerklicka i OBS → **"Uppdatera"**

4. Verifiera att bredd/höjd är inställd (1920x1080)```



---#### Skapa Spotify App



## 📁 ProjektstrukturServern startar på `http://localhost:3000`



```- **npm** (följer med Node.js)3. Create a `.env` file in the root directory (see [Environment Variables](#environment-variables))

twitch-song-request/

│#### Terminal 2: Starta bot:en

├── server/                    # Backend

│   ├── index.js              # Huvudserver1. Gå till [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)

│   ├── spotify.js            # Spotify-router

│   ├── twitch.js             # Twitch-router```bash

│   ├── events.js             # WebSocket-händelser

│   ├── config.js             # Konfigurationnpm run bot2. Klicka **"Create app"**- **Spotify Premium** (rekommenderat för full funktionalitet)

│   └── logger.js             # Loggning

│```

├── src/                       # Bot

│   └── sr-bot.js             # Twitch-chattbot3. Fyll i:

│

├── public/                    # FrontendBot:en connectar till Twitch-chatten

│   ├── admin.html            # Administrationspanel

│   ├── overlay.html          # OBS-överlägg   - **App name**: `Twitch Song Request`- **Twitch-konto** med affiliate/partner-status (för Channel Points)---

│   ├── setup.html            # Konfigurationsguide

│   └── uppdaterapris.html    # Belöningshanterare**Windows: Starta båda samtidigt**

│

├── index.html                 # Spelar nu   - **App description**: `Song request system for Twitch`

├── package.json              # Beroenden

├── .env.example              # Miljövariabelmall```bash

└── README.md                 # Denna fil

```start.bat   - **Redirect URI**: `http://localhost:3000/spotify/callback`



---```



## 🔒 Säkerhet   - **API**: Kryssa i **Web API**



**Viktigt:**---

- ❌ Dela **ALDRIG** din `.env`

- ❌ Committa **ALDRIG** tokens till Git4. Klicka **"Save"**---## Quick Setup Guide

- ✅ Använd `.gitignore` (inkluderad)

- ✅ Rotera tokens regelbundet### Tillgängliga sidor



---5. Kopiera **Client ID** och **Client Secret**



## 📄 Licens| URL | Beskrivning |



Detta projekt är licensierat under MIT-licensen.|-----|-------------|



---| `http://localhost:3000/` | Now Playing display |



## 🙏 Tack till| `http://localhost:3000/admin.html` | Admin-panel |#### Uppdatera .env



- **Spotify Web API** - Låtdata och uppspelning| `http://localhost:3000/overlay.html` | OBS overlay |

- **Twitch API** - Kanalpoäng och chatt

- **tmi.js** - Twitch-chattbibliotek| `http://localhost:3000/setup.html` | Setup wizard |## 🚀 InstallationFor a streamlined setup experience, you can use the built-in setup page:

- **OBS Studio** - Streamingintegration

| `http://localhost:3000/uppdaterapris` | Uppdatera reward |

---

```env

<div align="center">

---

**Gjord med ❤️ för Twitch-communityn**

SPOTIFY_CLIENT_ID=din_client_id_här

*Lycka till med streamingen! 🎮🎵*

## 💬 Bot-kommandon

⭐ **Om du gillar projektet, ge det en stjärna!** ⭐

SPOTIFY_CLIENT_SECRET=din_client_secret_här

</div>

### För Moderatorer

SPOTIFY_REDIRECT_URI=http://localhost:3000/spotify/callback### 1. Klona eller ladda ner projektet1. **Start the server:**

| Kommando | Beskrivning | Exempel |

|----------|-------------|---------|```

| `!sr <låt>` | Köa låt gratis | `!sr Sandstorm av Darude` |

| `!srapprove` | Godkänn nästa i kön | `!srapprove` |```bash

| `!srdeny <text>` | Neka och återbetala | `!srdeny För lång låt` |

| `!srclear` | Rensa hela kön | `!srclear` |#### Auktorisera Spotify

| `!srskip` | Skippa nuvarande | `!srskip` |

| `!srqueue` | Visa kön | `!srqueue` |```bashnpm run dev



### För Tittare1. Starta servern: `npm run dev`



| Kommando | Beskrivning |2. Öppna: `http://localhost:3000/spotify/login`git clone <repository-url>```

|----------|-------------|

| **Channel Points** | Använd "Song Request" reward |3. Logga in och godkänn



---4. Servern kommer automatiskt spara dina tokenscd now-playing-wip-main



### Smart sökning



Bot:en förstår flera format:---```2. **Open the setup page:**



```bash

# Låtnamn

Sandstorm### 2. Twitch Setup   Navigate to `http://localhost:3000/setup.html`



# Låt + Artist

Bohemian Rhapsody av Queen

Smells Like Teen Spirit by Nirvana#### Skapa Twitch Application### 2. Installera dependencies



# Spotify-länk

https://open.spotify.com/track/3n3Ppam7vgaVa1iaRUc9Lp

1. Gå till [Twitch Developer Console](https://dev.twitch.tv/console/apps)3. **Follow the guided setup:**

# Spotify URI

spotify:track:3n3Ppam7vgaVa1iaRUc9Lp2. Klicka **"Register Your Application"**

```

3. Fyll i:```bash   - Configure Spotify credentials (Client ID, Secret, Redirect URI)

---

   - **Name**: `Song Request Bot`

## 🎛️ Admin-gränssnitt

   - **OAuth Redirect URLs**: `http://localhost:3000/twitch/callback`npm install   - Get your Spotify refresh token via OAuth

### Uppdatera Reward-pris

   - **Category**: `Chat Bot`

1. Gå till `http://localhost:3000/uppdaterapris`

2. Ändra pris, titel eller beskrivning4. Klicka **"Create"**```   - Configure Twitch credentials and tokens

3. Klicka **"Uppdatera Reward"**

4. Ändringarna träder i kraft direkt5. Klicka **"Manage"** på din nya app



### Admin Panel6. Kopiera **Client ID**   - **Create your channel points reward directly from the page**



På `http://localhost:3000/admin.html`:7. Generera och kopiera **Client Secret**



- ✅ Se nuvarande låt### 3. Första start (genererar `.env`)   - Set all necessary environment variables

- ✅ Hantera pending queue

- ✅ Visa deferred queue#### Hämta Broadcaster ID

- ✅ Manuellt köa låtar



---

1. Gå till: `https://www.streamweasels.com/tools/convert-twitch-username-to-user-id/`

## 📺 OBS Integration

2. Ange ditt Twitch-användarnamn```bash4. **Create the Song Request Reward:**

### Lägg till Now Playing Overlay

3. Kopiera din **User ID**

1. Öppna **OBS Studio**

2. Klicka **+** under Sources → **Browser**npm run dev   - In the **"Create Song Request Reward"** section

3. Namnge: `Now Playing`

4. Konfigurera:#### Skapa Channel Points Reward

   - **URL**: `http://localhost:3000/overlay.html`

   - **Width**: `1920````   - Enter reward title, cost, and description

   - **Height**: `1080`

   - ✅ **Refresh browser when scene becomes active**1. Gå till din [Twitch Dashboard](https://dashboard.twitch.tv/)

5. Klicka **OK**

6. Positionera efter önskemål2. Öppna **Community → Channel Points**   - Click **"Create Reward"**



**Overlay visar:**3. Klicka **"Add New Custom Reward"**

- 🎵 Låtnamn

- 👤 Artist4. Konfigurera:Vid första starten skapas automatiskt en `.env`-fil från mallen. Servern kommer att köra på `http://localhost:3000`.   - The reward ID will be automatically populated

- 🖼️ Album art

- ⏱️ Förloppsbar   - **Title**: `Song Request`



---   - **Cost**: `1000` (eller valfritt pris)



## 🐛 Felsökning   - **Description**: `Köa en låt! Skriv låtnamn, artist eller klistra in Spotify-länk`



### Servern startar inte   - **User Input Required**: `På`---5. **Save and restart:**



**Problem:** `Error: listen EADDRINUSE: address already in use :::3000`5. Spara reward



**Lösning:**6. Högerklicka på rewarden → **"Copy Reward ID"** (behöver Twitch Dev Tools eller använd API)   - Click **"Save Configuration & Restart Server"**

- Stoppa processen på port 3000, eller

- Ändra `PORT=3001` i `.env`



---**Alternativt - Hämta Reward ID via API:**## ⚙️ Konfiguration   - The system will automatically update your `.env` file and restart



### Spotify-låtar läggs inte till



**Problem:** `403 Forbidden` eller `Premium required````bash



**Lösning:**# Använd: https://twitchtokengenerator.com/ för att få en OAuth token med scope: channel:read:redemptions

- Kontrollera Spotify Premium är aktivt

- Starta Spotify-appen på någon enhetcurl -X GET "https://api.twitch.tv/helix/channel_points/custom_rewards?broadcaster_id=DIN_BROADCASTER_ID" \### Steg 1: Spotify Setup**Benefits of using the setup page:**

- Spela en låt manuellt först

  -H "Authorization: Bearer DIN_OAUTH_TOKEN" \

---

  -H "Client-Id: DIN_CLIENT_ID"- Guided step-by-step configuration

### Bot:en connectar inte

```

**Problem:** `Login authentication failed`

1. **Skapa Spotify App**- Create channel points rewards with one click

**Lösning:**

1. Verifiera `TWITCH_BOT_USERNAME` är korrekt#### Uppdatera .env

2. Kontrollera `TWITCH_BOT_OAUTH` har `oauth:` prefix

3. Generera ny token på [Twitch Token Generator](https://twitchtokengenerator.com/)   - Gå till [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)- Automatic reward ID population

4. Uppdatera `.env` och starta om

```env

---

# Twitch API   - Klicka "Create app"- Update reward settings anytime

### Channel Points fungerar inte

TWITCH_CLIENT_ID=din_twitch_client_id

**Problem:** Redemptions triggar inte bot:en

TWITCH_CLIENT_SECRET=din_twitch_client_secret   - Fyll i:- No manual `.env` file editing required

**Lösning:**

1. Kontrollera `TWITCH_SONG_REWARD_ID` är korrektTWITCH_REDIRECT_URI=http://localhost:3000/twitch/callback

2. Verifiera auktorisering via `/twitch/login`

3. Kolla att rewarden kräver användar-inputBROADCASTER_ID=din_broadcaster_id     - **App name:** "Song Request System" (valfritt namn)- Visual feedback for all setup steps

4. Se till att `BROADCASTER_ID` stämmer



---

# Twitch Chat Bot     - **Redirect URI:** `http://localhost:3000/callback`

### Token expired

TWITCH_BOT_USERNAME=din_bot_username

**Problem:** `Invalid OAuth token`

TWITCH_BOT_OAUTH=oauth:din_oauth_token_från_twitchtokengenerator   - Spara **Client ID** och **Client Secret**For manual setup or more details, continue to the sections below.

**Lösning:** Systemet har auto-refresh, men om det failar:

1. Besök `/spotify/login` för SpotifyTWITCH_CHANNEL=din_kanal_namn

2. Besök `/twitch/login` för Twitch

3. Starta om servern och bot:en



---# Reward ID



### Duplicerade låtarTWITCH_SONG_REWARD_ID=din_reward_id2. **Hämta Refresh Token**---



**Problem:** Samma låt köas flera gånger```



**Lösning:**   - Öppna `http://localhost:3000/login`

- Bot:en filtrerar automatiskt senaste 50 låtarna

- Kontrollera att endast EN bot-instans körs#### Auktorisera Twitch API

- Verifiera Spotify Premium är aktivt

   - Logga in med Spotify## Spotify Setup

---

1. Starta servern: `npm run dev`

### Deferred queue töms inte

2. Öppna: `http://localhost:3000/twitch/login`   - Kopiera **Refresh Token** som visas

**Problem:** Låtar fastnar i "deferred queue"

3. Logga in och godkänn scopes

**Lösning:**

1. Starta Spotify-appen4. Servern sparar automatiskt dina tokens### Step 1: Create a Spotify Application

2. Spela en låt manuellt

3. Bot:en köar automatiskt inom 30 sekunder



------3. **Uppdatera `.env`**



### OBS Overlay blank



**Problem:** Ingen visning i OBS### 3. Environment Variabler   ```env1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)



**Lösning:**

1. Kontrollera att servern körs

2. Testa `http://localhost:3000/overlay.html` i webbläsareDin `.env` fil ska nu se ut ungefär så här:   SPOTIFY_CLIENT_ID=din_client_id_här2. Log in with your Spotify account

3. Högerklicka i OBS → **"Refresh"**

4. Verifiera Width/Height är satt (1920x1080)



---```env   SPOTIFY_CLIENT_SECRET=din_client_secret_här3. Click **"Create App"**



## 📁 Projektstruktur# ============================================



```# SERVER   REFRESH_TOKEN=din_refresh_token_här4. Fill in the details:

twitch-song-request/

│# ============================================

├── server/                    # Backend

│   ├── index.js              # HuvudserverPORT=3000   ```   - **App Name**: Choose any name (e.g., "My Song Request Bot")

│   ├── spotify.js            # Spotify routes

│   ├── twitch.js             # Twitch routes

│   ├── events.js             # WebSocket events

│   ├── config.js             # Config# ============================================   - **App Description**: Optional description

│   └── logger.js             # Logging

│# SPOTIFY

├── src/                       # Bot

│   └── sr-bot.js             # Twitch chat bot# ============================================### Steg 2: Twitch Setup   - **Redirect URI**: `http://localhost:3000/spotify/callback` (for local setup)

│

├── public/                    # FrontendSPOTIFY_CLIENT_ID=abc123def456

│   ├── admin.html            # Admin panel

│   ├── overlay.html          # OBS overlaySPOTIFY_CLIENT_SECRET=xyz789ghi012     - For production: Use your deployed URL (e.g., `https://yourdomain.com/spotify/callback`)

│   ├── setup.html            # Setup wizard

│   └── uppdaterapris.html    # Reward managerSPOTIFY_REDIRECT_URI=http://localhost:3000/spotify/callback

│

├── index.html                 # Now Playing#### A. Twitch App (för Channel Points API)   - **APIs Used**: Select "Web API"

├── package.json              # Dependencies

├── .env.example              # Environment mall# ============================================

└── README.md                 # Denna fil

```# TWITCH API5. Click **"Save"**



---# ============================================



## 🔒 SäkerhetTWITCH_CLIENT_ID=twitch123abc1. **Skapa Twitch App**



**Viktigt:**TWITCH_CLIENT_SECRET=twitch456def

- ❌ Dela **ALDRIG** din `.env`

- ❌ Committa **ALDRIG** tokens till GitTWITCH_REDIRECT_URI=http://localhost:3000/twitch/callback   - Gå till [Twitch Developer Console](https://dev.twitch.tv/console/apps)### Step 2: Get Your Credentials

- ✅ Använd `.gitignore` (inkluderad)

- ✅ Rotera tokens regelbundetBROADCASTER_ID=123456789



---   - Klicka "Register Your Application"



## 📄 Licens# ============================================



Detta projekt är licensierat under MIT License.# TWITCH CHAT BOT   - Fyll i:1. On your app's dashboard, note down:



---# ============================================



## 🙏 Tack tillTWITCH_BOT_USERNAME=dinbotusername     - **Name:** "Song Request System"   - **Client ID**



- **Spotify Web API** - Låtdata och playbackTWITCH_BOT_OAUTH=oauth:abcdef123456

- **Twitch API** - Channel Points och chat

- **tmi.js** - Twitch chat bot-libraryTWITCH_CHANNEL=dinkanal     - **OAuth Redirect URLs:** `http://localhost:3000/twitch/callback`   - **Client Secret** (click "Show Client Secret")

- **OBS Studio** - Streaming-integration



---

# ============================================     - **Category:** Chat Bot2. Click **"Settings"** and add your redirect URI if not already added

<div align="center">

# REWARD

**Gjord med ❤️ för Twitch-communityn**

# ============================================   - Kopiera **Client ID** och **Client Secret**

*Happy streaming! 🎮🎵*

TWITCH_SONG_REWARD_ID=abc-123-def-456

⭐ **Om du gillar projektet, ge det en stjärna!** ⭐

### Step 3: Get Your Refresh Token

</div>

# ============================================

# BOT CONFIG2. **Hämta OAuth Token**

# ============================================

PENDING_QUEUE_TIMEOUT=900000   - Öppna `http://localhost:3000/auth/twitch`1. Start your server:

SPOTIFY_POLL_INTERVAL=5000

DEFERRED_CHECK_INTERVAL=30000   - Logga in och godkänn behörigheter```bash

```

   - Kopiera alla tokens som visasnpm run dev

Se `.env.example` för fullständig dokumentation av alla variabler.

```

---

3. **Uppdatera `.env`**

## 🚀 Användning

   ```env2. Visit: `http://localhost:3000/spotify/login`

### Starta systemet

   TWITCH_CLIENT_ID=din_client_id3. Authorize the application

#### 1. Starta servern

   TWITCH_CLIENT_SECRET=din_client_secret4. Copy the **REFRESH_TOKEN** from the result page

```bash

npm run dev   TWITCH_BROADCASTER_ID=ditt_user_id5. Add it to your `.env` file

```

   TWITCH_REDEMPTIONS_TOKEN=din_access_token

Servern kommer starta på `http://localhost:3000`

   TWITCH_REDEMPTIONS_REFRESH_TOKEN=din_refresh_token---

#### 2. Starta bot:en (i en ny terminal)

   ```

```bash

npm run bot## Twitch Setup

```

#### B. Twitch Chat Bot

Bot:en kommer connecta till Twitch-chatten och lyssna på kommandon.

### Step 1: Create a Twitch Application

### Tillgängliga sidor

1. **Hämta Chat OAuth Token**

| URL | Beskrivning |

|-----|-------------|   - Gå till [Twitch TMI](https://twitchapps.com/tmi/)1. Go to [Twitch Developer Console](https://dev.twitch.tv/console)

| `http://localhost:3000/` | Now Playing - visar nuvarande låt |

| `http://localhost:3000/admin.html` | Admin-panel för manuell kontroll |   - Klicka "Connect" och godkänn2. Log in with your Twitch account

| `http://localhost:3000/overlay.html` | OBS overlay för stream |

| `http://localhost:3000/setup.html` | Setup wizard |   - Kopiera hela token (inklusive `oauth:`)3. Click **"Register Your Application"**

| `http://localhost:3000/uppdaterapris` | Uppdatera reward-inställningar |

4. Fill in the details:

---

2. **Uppdatera `.env`**   - **Name**: Choose any name (e.g., "Song Request Bot")

## 💬 Bot-kommandon

   ```env   - **OAuth Redirect URLs**: `http://localhost:3000/twitch/callback`

### För Tittare

   TWITCH_USERNAME=ditt_bot_användarnamn     - For production: Use your deployed URL (e.g., `https://yourdomain.com/twitch/callback`)

| Kommando | Beskrivning | Exempel |

|----------|-------------|---------|   TWITCH_OAUTH_TOKEN=oauth:din_token_här   - **Category**: Select "Chat Bot" or "Application Integration"

| *Channel Points* | Använd "Song Request" reward | `Bohemian Rhapsody` |

   TWITCH_CHANNEL=din_kanal_namn5. Click **"Create"**

### För Moderatorer

   ```

| Kommando | Beskrivning | Exempel |

|----------|-------------|---------|### Step 2: Get Your Credentials

| `!sr <låt>` | Köa en låt gratis (bypass Channel Points) | `!sr Sandstorm av Darude` |

| `!srapprove` | Godkänn nästa väntande förfrågan | `!srapprove` |### Steg 3: Skapa Channel Points Reward

| `!srdeny <anledning>` | Neka förfrågan och återbetala | `!srdeny Låten är för lång` |

| `!srclear` | Rensa hela kön | `!srclear` |1. Click **"Manage"** on your application

| `!srskip` | Skippa nuvarande låt | `!srskip` |

| `!srqueue` | Visa alla låtar i kön | `!srqueue` |**Alternativ 1: Via Setup-sidan (enklast)**2. Note down:



### Smart sökning1. Öppna `http://localhost:3000/setup.html`   - **Client ID**



Bot:en förstår flera format:2. Gå till "Create Song Request Reward"   - **Client Secret** (generate if needed)



```bash3. Fyll i titel, pris och beskrivning

# Låtnamn

!sr Sandstorm4. Klicka "Create Reward"### Step 3: Get Your Tokens



# Låt + Artist (automatisk detection)5. Reward ID kopieras automatiskt till `.env`

!sr Bohemian Rhapsody av Queen

!sr Smells Like Teen Spirit by Nirvana#### Option A: Using the OAuth Helper (Recommended)



# Spotify-länk**Alternativ 2: Manuellt via Twitch Dashboard**

!sr https://open.spotify.com/track/3n3Ppam7vgaVa1iaRUc9Lp

1. Gå till Twitch Creator Dashboard → Channel Points1. Start your server:

# Spotify URI

!sr spotify:track:3n3Ppam7vgaVa1iaRUc9Lp2. Skapa ny "Custom Reward"```bash

```

3. Aktivera "Require Viewer to Enter Text"npm run dev

---

4. Hitta Reward ID via API eller använd setup-sidan```

## 🎛️ Admin-gränssnitt



### Uppdatera Reward-pris

---2. Visit: `http://localhost:3000/twitch/login`

1. Gå till `http://localhost:3000/uppdaterapris`

2. Ändra pris, titel eller beskrivning3. Authorize the application

3. Klicka **"Uppdatera Reward"**

4. Ändringarna träder i kraft direkt!## 🎯 Användning4. Copy all tokens from the result page:



### Admin Panel   - `TWITCH_REDEMPTIONS_TOKEN`



På `http://localhost:3000/admin.html` kan du:### Starta systemet   - `TWITCH_REDEMPTIONS_REFRESH_TOKEN`



- ✅ Se nuvarande låt som spelas   - `TWITCH_BROADCASTER_ID`

- ✅ Hantera pending queue manuellt

- ✅ Visa deferred queue (låtar i väntan på aktivt Spotify)**Utvecklingsläge:**5. Add them to your `.env` file

- ✅ Manuellt köa låtar via sökfunktion

```bash

---

# Terminal 1: Starta servern#### Option B: Manual OAuth Token for Bot

## 📺 OBS Integration

npm run dev

### Lägg till Now Playing Overlay

1. Visit [Twitch Token Generator](https://twitchtokengenerator.com/)

1. Öppna **OBS Studio**

2. Klicka **+** under Sources# Terminal 2: Starta botten2. Select **"Bot Chat Token"**

3. Välj **Browser**

4. Namnge den: `Now Playing`npm run bot3. Authorize and copy the OAuth token

5. Konfigurera:

   - **URL**: `http://localhost:3000/overlay.html````4. Add it to `.env` as `TWITCH_OAUTH_TOKEN` (include the `oauth:` prefix)

   - **Width**: `1920`

   - **Height**: `1080`

   - ✅ Kryssa i **"Refresh browser when scene becomes active"**

6. Klicka **OK****Windows (båda samtidigt):**### Step 4: Create Channel Points Reward

7. Positionera och ändra storlek som önskat

```bash

Overlay:et visar automatiskt:

- 🎵 Låtnamnstart.bat#### Option A: Using the Setup Page (Recommended)

- 👤 Artist

- 🖼️ Album art```

- ⏱️ Förloppsbar

1. Start your server:

---

### Webbgränssnitt```bash

## 📁 Projektstruktur

npm run dev

```

twitch-song-request/Efter start är följande sidor tillgängliga:```

│

├── server/                    # Backend-server

│   ├── index.js              # Huvudserver

│   ├── spotify.js            # Spotify API routes| URL | Beskrivning |2. Visit: `http://localhost:3000/setup.html`

│   ├── twitch.js             # Twitch API routes

│   ├── events.js             # WebSocket events|-----|-------------|

│   ├── config.js             # Config endpoints

│   └── logger.js             # Logging system| `http://localhost:3000/` | Now Playing display (för browser source) |3. Complete the Spotify and Twitch configuration sections first

│

├── src/                       # Bot-kod| `http://localhost:3000/admin.html` | Admin-panel med kontroller och loggar |

│   └── sr-bot.js             # Twitch chat bot

│| `http://localhost:3000/overlay.html` | OBS overlay (transparent bakgrund) |4. In the **"Create Song Request Reward"** section:

├── public/                    # Frontend HTML

│   ├── admin.html            # Admin panel| `http://localhost:3000/setup.html` | Setup wizard för konfiguration |   - **Reward Title**: Enter your reward name (e.g., "Song Request")

│   ├── overlay.html          # OBS overlay

│   ├── setup.html            # Setup wizard| `http://localhost:3000/uppdaterapris` | Uppdatera reward-inställningar |   - **Cost**: Set how many channel points to charge (e.g., 1000)

│   └── uppdaterapris.html    # Reward manager

│   - **Prompt/Description**: Add instructions for viewers (e.g., "Request a song by entering the song name or Spotify URL")

├── index.html                 # Now Playing-sida

├── package.json              # Dependencies### OBS Integration

├── .env.example              # Environment template

├── .gitignore                # Git ignore-regler5. Click **"Create Reward"** button

└── README.md                 # Denna fil

```1. Lägg till en **Browser Source** i OBS



---2. Använd URL: `http://localhost:3000/overlay.html`6. The system will:



## 🐛 Felsökning3. Rekommenderade inställningar:   - Create the reward on Twitch with the correct settings



### Servern startar inte   - **Width:** 1920   - Automatically populate the **Song Reward ID** field



**Problem**: `Error: listen EADDRINUSE: address already in use :::3000`   - **Height:** 1080   - Enable user input requirement (viewers must enter song information)



**Lösning**: Port 3000 används redan. Antingen:   - ✅ **Shutdown source when not visible**

- Stoppa den process som använder port 3000

- Ändra `PORT=3001` i `.env`   - ✅ **Refresh browser when scene becomes active**7. Copy the Reward ID and save your configuration



---



### Spotify-låtar läggs inte till i kö---8. To update the reward later, simply change the fields and click **"Update Reward"**



**Problem**: `403 Forbidden` eller `Player command failed: Premium required`



**Lösning**: ## 🤖 Bot-kommandon#### Option B: Manual Creation via Twitch Dashboard

- Du måste ha Spotify Premium

- Kontrollera att du är inloggad på rätt konto

- Starta om Spotify-appen

### Moderator-kommandon1. Go to your [Twitch Creator Dashboard](https://dashboard.twitch.tv/)

---

2. Navigate to **"Viewer Rewards"** > **"Channel Points"**

### Bot:en connectar inte till Twitch-chat

| Kommando | Beskrivning | Exempel |3. Click **"Add New Custom Reward"**

**Problem**: `Login authentication failed`

|----------|-------------|---------|4. Configure:

**Lösning**:

1. Verifiera `TWITCH_BOT_USERNAME` är korrekt| `!sr <låt>` | Köa en låt direkt (gratis) | `!sr Bohemian Rhapsody Queen` |   - **Title**: "Song Request" (or your preference)

2. Generera ny OAuth token på [Twitch Token Generator](https://twitchtokengenerator.com/)

   - Välj scope: `chat:read` och `chat:edit`| `!srlist` | Visa alla väntande requests | `!srlist` |   - **Description**: "Request a song to be played on stream"

3. Uppdatera `TWITCH_BOT_OAUTH` i `.env` (inklusive `oauth:` prefix)

| `!srqueue` | Visa de 5 första i kön | `!srqueue` |   - **Cost**: Set your preferred point cost

---

| `!srapprove` | Godkänn hela kön | `!srapprove` |   - **Require Viewer to Enter Text**: ✅ ENABLE (this is important!)

### Channel Points fungerar inte

| `!srapprove <n>` | Godkänn specifik request | `!srapprove 1` |5. Click **"Create"**

**Problem**: Redemptions triggar inte bot:en

| `!srapprove @user` | Godkänn request från användare | `!srapprove @viewer123` |6. Click on the reward you just created

**Lösning**:

1. Kontrollera att `TWITCH_SONG_REWARD_ID` är korrekt| `!srdeny <n>` | Neka request (återbetalar points) | `!srdeny 2` |7. Copy the **Reward ID** from the URL or settings

2. Verifiera att du auktoriserat Twitch API via `/twitch/login`

3. Kolla att rewarden kräver användar-input| `!srdeny @user` | Neka request från användare | `!srdeny @spammer` |8. Add it to `.env` as `TWITCH_SONG_REWARD_ID`

4. Se till att `BROADCASTER_ID` matchar din kanal

| `!srclear` | Töm hela kön (återbetalar alla) | `!srclear` |

---

| `!srstatus` | Visa kö-status | `!srstatus` |---

### Token expired errors



**Problem**: `Invalid OAuth token`

### Publika kommandon## Environment Variables

**Lösning**: Systemet har auto-refresh! Om det ändå failar:

1. Besök `/spotify/login` för att förnya Spotify

2. Besök `/twitch/login` för att förnya Twitch

3. Starta om servern och bot:en| Kommando | Beskrivning |Create a `.env` file in the root directory with the following variables:



---|----------|-------------|



### Duplicerade låtar köas| `!srmy` eller `!srmine` | Kolla din egen väntande request |```env



**Problem**: Samma låt läggs till flera gånger| `!song` eller `!låt` | Visa nuvarande låt som spelas |# Server Configuration



**Lösning**: Bot:en filtrerar automatiskt nyligen spelade låtar (senaste 50). Om problemet kvarstår:PORT=3000

- Kontrollera att Spotify Premium är aktivt

- Verifiera att endast EN instans av bot:en körs### Hur tittare begär låtarADMIN_SECRET=your_secure_admin_password



---



### Deferred queue fylls på men töms aldrig**Via Channel Points:**# Spotify Configuration



**Problem**: Låtar fastnar i "deferred queue"1. Lösa in "Song Request" rewardSPOTIFY_CLIENT_ID=your_spotify_client_id



**Lösning**:2. Skriv låtnamn, artist, eller klistra in Spotify-länk:SPOTIFY_CLIENT_SECRET=your_spotify_client_secret

1. Starta Spotify-appen på någon enhet

2. Börja spela en låt (vilket som helst)   - ✅ `Sandstorm`SPOTIFY_REDIRECT_URI=http://localhost:3000/spotify/callback

3. Bot:en kommer automatiskt köa alla väntande låtar inom 30 sekunder

   - ✅ `Bohemian Rhapsody by Queen`REFRESH_TOKEN=your_spotify_refresh_token

---

   - ✅ `lose yourself av eminem`SPOTIFY_SEARCH_MARKET=SE

### OBS Overlay visar ingenting

   - ✅ `https://open.spotify.com/track/...`

**Problem**: Blank sida i OBS

   - ✅ `spotify:track:...`# Twitch Bot Configuration

**Lösning**:

1. Kontrollera att servern körs på `http://localhost:3000`TWITCH_USERNAME=your_bot_username

2. Testa öppna `http://localhost:3000/overlay.html` i vanlig webbläsare

3. I OBS: högerklicka på browser source → **"Refresh"**3. Moderator godkänner eller nekarTWITCH_OAUTH_TOKEN=oauth:your_chat_token

4. Verifiera att bredden/höjden är satt (1920x1080)

4. Låten läggs automatiskt i Spotify-kön!TWITCH_CHANNEL=your_channel_name

---

TWITCH_CLIENT_ID=your_twitch_client_id

## 🔍 Debug-tips

---TWITCH_CLIENT_SECRET=your_twitch_client_secret

### Kolla server-loggar



Servern loggar all aktivitet. Kolla terminalen där `npm run dev` körs.

## 🔧 Anpassning# Twitch Channel Points

### Kolla bot-loggar

TWITCH_SONG_REWARD_ID=your_reward_id

Bot:en loggar kommandon och API-anrop. Kolla terminalen där `npm run bot` körs.

### Ändra inställningar i `.env`TWITCH_REDEMPTIONS_TOKEN=your_access_token

### API Health Checks

TWITCH_REDEMPTIONS_REFRESH_TOKEN=your_refresh_token

Testa följande endpoints:

```envTWITCH_BROADCASTER_ID=your_user_id

```bash

# Spotify status# Kö-inställningar

http://localhost:3000/spotify/whoami

SR_MAX_PENDING=50                  # Max antal väntande requests# Twitch Redirect URI

# Twitch reward info

http://localhost:3000/twitch/reward/DIN_REWARD_IDSR_PENDING_TTL_MS=900000          # Timeout (15 min = 900000 ms)TWITCH_REDIRECT_URI=http://localhost:3000/twitch/callback



# Server logsSR_APPROVE_ALL_DELAY_MS=600       # Delay mellan låtar vid bulk-godkännande

http://localhost:3000/api/logs

```# Bot Behavior



---# Chat-svarTWITCH_REPLY_ON_COMMAND=true



## 🤝 BidraTWITCH_REPLY_ENABLED=true         # Aktivera/inaktivera bot-svar i chattenSR_MAX_PENDING=50



Bidrag är välkomna! SR_APPROVE_ALL_DELAY_MS=2000



1. Forka projektet# Spotify sökningSR_AUTO_TIMEOUT_MS=900000

2. Skapa en feature branch (`git checkout -b feature/amazing-feature`)

3. Commit dina ändringar (`git commit -m 'Add some amazing feature'`)SPOTIFY_SEARCH_MARKET=SE          # Land för sökning (SE, US, GB, etc.)

4. Pusha till branchen (`git push origin feature/amazing-feature`)

5. Öppna en Pull Request# Session



---# ServerSESSION_SECRET=random_secure_string



## 📄 LicensPORT=3000                          # Webbserver port



Detta projekt är licensierat under MIT License - se [LICENSE](LICENSE) filen för detaljer.```# Supabase (Optional - for data persistence)



---VITE_SUPABASE_URL=your_supabase_url



## 🙏 Tack till### Uppdatera Reward-prisVITE_SUPABASE_ANON_KEY=your_supabase_anon_key



- **Spotify Web API** - För låtdata och playback-kontroll```

- **Twitch API** - För Channel Points och chat-integration

- **tmi.js** - För Twitch chat bot-funktionalitet1. Gå till `http://localhost:3000/uppdaterapris`

- **OBS Studio** - För streaming-integration

2. Ändra pris, titel eller beskrivning### Variable Descriptions

---

3. Spara - ändringarna träder i kraft direkt!

## 📞 Support

| Variable | Description | How to Get |

Har du problem eller frågor?

---|----------|-------------|------------|

- 🐛 [Öppna ett issue](https://github.com/dittnamn/twitch-song-request/issues)

- 💬 [Discord Community](#) (lägg till din Discord-länk)| `PORT` | Server port | Any available port (default: 3000) |

- 📧 Email: din.email@example.com

## 🐛 Felsökning| `ADMIN_SECRET` | Admin panel password | Choose a secure password |

---

| `SPOTIFY_CLIENT_ID` | Spotify app client ID | From Spotify Developer Dashboard |

## 🔮 Framtida funktioner

### Problem: "Invalid OAuth token"| `SPOTIFY_CLIENT_SECRET` | Spotify app secret | From Spotify Developer Dashboard |

- [ ] Multi-streamer support

- [ ] Song voting system| `SPOTIFY_REDIRECT_URI` | OAuth callback URL | `http://localhost:3000/spotify/callback` (set in Spotify app) |

- [ ] Ban/blacklist för låtar

- [ ] Request history tracking**Lösning:**| `REFRESH_TOKEN` | Spotify refresh token | From `/spotify/login` endpoint |

- [ ] Custom overlay themes

- [ ] YouTube Music support```bash| `SPOTIFY_SEARCH_MARKET` | Country code for search | 2-letter code (e.g., SE, US, GB) |

- [ ] Request limits per user

- [ ] VIP priority queue# För Twitch Channel Points| `TWITCH_USERNAME` | Bot account username | Your bot's Twitch username |



---http://localhost:3000/auth/twitch| `TWITCH_OAUTH_TOKEN` | Bot chat token | From Twitch Token Generator or `/twitch/login` |



**Gjord med ❤️ för Twitch-gemenskapen**| `TWITCH_CHANNEL` | Your channel name | Your Twitch channel (lowercase) |



*Happy streaming! 🎮🎵*# För Spotify| `TWITCH_CLIENT_ID` | Twitch app client ID | From Twitch Developer Console |


http://localhost:3000/login| `TWITCH_CLIENT_SECRET` | Twitch app secret | From Twitch Developer Console |

```| `TWITCH_SONG_REWARD_ID` | Channel points reward ID | From Twitch Dashboard reward settings |

Kopiera nya tokens till `.env` och starta om servern.| `TWITCH_REDEMPTIONS_TOKEN` | API access token | From `/twitch/login` endpoint |

| `TWITCH_REDEMPTIONS_REFRESH_TOKEN` | Refresh token | From `/twitch/login` endpoint |

### Problem: "No active Spotify device"| `TWITCH_BROADCASTER_ID` | Your Twitch user ID | From `/twitch/login` endpoint |

| `TWITCH_REDIRECT_URI` | OAuth callback URL | Set in Twitch app settings |

**Lösning:**| `TWITCH_REPLY_ON_COMMAND` | Enable bot replies | true/false |

1. Öppna Spotify på din dator/telefon| `SR_MAX_PENDING` | Max pending requests | Number (default: 50) |

2. Börja spela vilken låt som helst| `SR_APPROVE_ALL_DELAY_MS` | Delay between approvals | Milliseconds (default: 2000) |

3. Botten kommer automatiskt köa väntande låtar när Spotify är aktiv| `SR_AUTO_TIMEOUT_MS` | Auto-deny old requests | Milliseconds (default: 900000 = 15 min) |

| `SESSION_SECRET` | Session encryption key | Random secure string |

### Problem: Botten svarar inte i chatten

---

**Kontrollera:**

- ✅ `TWITCH_OAUTH_TOKEN` börjar med `oauth:`## Running the Application

- ✅ `TWITCH_CHANNEL` är lowercase (små bokstäver)

- ✅ Bot-kontot är inte samma som broadcaster (rekommenderas)### Development Mode

- ✅ Inga felmeddelanden i terminal där botten körs

1. **Start the web server:**

### Problem: Fel låt köas```bash

npm run dev

**Om du använder textsökning:**```

- Använd formatet "låtnamn av artist" för bättre träffarThe server will start at `http://localhost:3000`

- Exempel: `kolla kolla av nationalteatern` ✅

- Eller använd direkta Spotify-länkar ✅2. **Start the Twitch bot** (in a separate terminal):

```bash

### Problem: Port 3000 redan användsnpm run bot

```

**Lösning:**

```bash### Production Mode

# Windows PowerShell

netstat -ano | findstr :30001. **Build the frontend:**

taskkill /PID <process_id> /F```bash

```npm run build

```

Eller ändra port i `.env`:

```env2. **Start both services** (use a process manager like PM2):

PORT=3001```bash

```pm2 start npm --name "web-server" -- run dev

pm2 start npm --name "twitch-bot" -- run bot

---```



## 📁 Projektstruktur---



```## Usage

now-playing-wip-main/

├── 📄 .env                     # Din konfiguration (auto-genereras)### Web Interface

├── 📄 .env.example             # Mall för environment-variabler

├── 📄 package.json             # Dependencies och scripts- **Main App**: `http://localhost:3000/`

├── 📄 index.html               # Now playing main display- **Setup Page**: `http://localhost:3000/setup.html`

├── 📄 start.bat                # Windows start script- **Admin Panel**: `http://localhost:3000/admin.html`

├── 📄 README.md                # Den här filen- **OBS Overlay**: `http://localhost:3000/overlay.html`

│

├── 📁 public/                  # Statiska webbsidor### OAuth Management

│   ├── admin.html              # Admin-panel

│   ├── overlay.html            # OBS overlay- **Spotify Login**: `http://localhost:3000/spotify/login`

│   ├── setup.html              # Setup wizard- **Twitch Login**: `http://localhost:3000/twitch/login`

│   └── uppdaterapris.html      # Reward manager- **Check Spotify Account**: `http://localhost:3000/spotify/whoami`

│- **Check Twitch Account**: `http://localhost:3000/twitch/whoami`

├── 📁 server/                  # Express backend

│   ├── index.js                # Huvudserver### API Endpoints

│   ├── spotify.js              # Spotify API routes

│   ├── twitch.js               # Twitch API routes- `GET /now-playing` - Get currently playing track

│   ├── events.js               # Server-Sent Events- `GET /queue` - Get Spotify queue

│   ├── config.js               # Config management- `POST /skip` - Skip current track

│   └── logger.js               # Logging system- `POST /play` - Resume playback

│- `POST /pause` - Pause playback

└── 📁 src/                     # Bot-kod- `POST /add-to-queue` - Add track to queue

    └── sr-bot.js               # Twitch song request bot- `GET /search` - Search Spotify tracks

```- `GET /events` - Server-Sent Events stream



------



## 🎨 Anpassningar & Teman## Bot Commands



### Anpassa Now Playing Display### Moderator Commands



Redigera `index.html` för att ändra utseende:| Command | Description | Example |

- **Färger:** Ändra CSS-variabler i `<style>` taggen|---------|-------------|---------|

- **Layout:** Modifiera HTML-strukturen| `!sr <song>` | Queue a song directly (free, no points required) | `!sr Bohemian Rhapsody Queen` |

- **Animationer:** Uppdatera CSS transitions och keyframes| `!srlist` | Show all pending requests with usernames | `!srlist` |

| `!srqueue` | Show first 5 pending requests | `!srqueue` |

### Anpassa OBS Overlay| `!srapprove` | Approve all pending requests | `!srapprove` |

| `!srapprove <n>` | Approve specific request by number | `!srapprove 1` |

Redigera `public/overlay.html`:| `!srapprove @user` | Approve request by username | `!srapprove @viewer123` |

- **Position:** Ändra CSS positioning| `!srdeny <n>` | Deny request by number (refunds points) | `!srdeny 1` |

- **Storlek:** Modifiera font-sizes och padding| `!srdeny @user` | Deny request by username (refunds points) | `!srdeny @viewer123` |

- **Effekter:** Lägg till egna CSS-animationer| `!srclear` | Clear all pending requests (refunds all) | `!srclear` |

| `!srstatus` | Show queue status (count + top 3) | `!srstatus` |

---

### Public Commands

## 🔐 Säkerhet

| Command | Description |

**Viktigt:**|---------|-------------|

- ❌ Dela **ALDRIG** din `.env`-fil| `!srmy` or `!srmine` | Check your own pending request |

- ❌ Committa **ALDRIG** tokens till Git

- ✅ Håll tokens säkra och rotera regelbundet### How Song Requests Work

- ✅ Använd `.gitignore` (inkluderad)

1. Viewer redeems "Song Request" channel points reward

Tokens i `.env` ger full kontroll över ditt Spotify och Twitch. Behandla dem som lösenord!2. Viewer enters song name/artist in the text field

3. Bot searches Spotify and finds best match

---4. Request is added to pending queue

5. Moderator approves or denies the request:

## 🆘 Support & Bidrag   - **Approve**: Song added to Spotify queue, points fulfilled

   - **Deny**: Points refunded to viewer

### Behöver hjälp?6. Requests older than 15 minutes are auto-denied with refund



1. Kolla [Felsökning](#-felsökning) ovan---

2. Kontrollera att alla environment-variabler är korrekt satta

3. Se över terminal-loggar för felmeddelanden## OBS Integration

4. Verifiera att du använder Node.js v18 eller högre

### Add Now Playing Overlay

### Rapportera buggar

1. In OBS, add a **Browser Source**

Öppna en issue med:2. Set URL to: `http://localhost:3000/overlay.html`

- Tydlig beskrivning av problemet3. Set dimensions:

- Steg för att återskapa felet   - **Width**: 1920

- Relevanta loggar (ta bort känsliga tokens!)   - **Height**: 1080

- System-info (OS, Node version)4. Check "Shutdown source when not visible" for better performance

5. Optional: Add custom CSS in the browser source settings:

---   ```css

   body { background: transparent !important; }

## 📝 Licens   ```



Detta projekt är licensierat under MIT License - se LICENSE-filen för detaljer.### Overlay Features



---- Displays current song with album art

- Artist and track name

## 🙏 Tack- Progress bar

- Auto-updates in real-time

Byggt med:- Smooth animations

- [Node.js](https://nodejs.org/) - JavaScript runtime- Transparent background

- [Express](https://expressjs.com/) - Web framework

- [tmi.js](https://tmijs.com/) - Twitch chat library---

- [Spotify Web API](https://developer.spotify.com/documentation/web-api) - Spotify integration

- [Twitch API](https://dev.twitch.tv/docs/api) - Twitch integration## Troubleshooting



---### Bot Not Connecting to Chat



<div align="center">- Verify `TWITCH_USERNAME` matches your bot account

- Ensure `TWITCH_OAUTH_TOKEN` includes the `oauth:` prefix

**⭐ Om du gillar projektet, ge det en stjärna!**- Check that `TWITCH_CHANNEL` is lowercase

- Make sure bot account is not banned from channel

Made with ❤️ and ☕

### Song Requests Not Working

</div>

- Verify `TWITCH_SONG_REWARD_ID` is correct
- Check that `TWITCH_REDEMPTIONS_TOKEN` is valid (use `/twitch/whoami`)
- Ensure "Require Viewer to Enter Text" is enabled on the reward
- Check bot logs for error messages

### Spotify Not Playing Songs

- Verify `REFRESH_TOKEN` is valid (use `/spotify/whoami`)
- Ensure Spotify is open and active on a device
- Check that you have Spotify Premium (required for playback control)
- Try playing a song manually first to activate the session

### Tokens Expired

- Spotify tokens: Run `/spotify/login` again
- Twitch tokens: Run `/twitch/login` again
- Update `.env` file with new tokens
- Restart both server and bot

---

## Development

### Project Structure

```
project/
├── public/           # Static files
│   ├── admin.html   # Admin panel
│   └── overlay.html # OBS overlay
├── server/          # Backend server
│   ├── index.js     # Main server
│   ├── spotify.js   # Spotify routes
│   ├── twitch.js    # Twitch OAuth routes
│   └── events.js    # SSE events
├── src/             # Frontend source
│   ├── App.tsx      # React app
│   ├── main.tsx     # Entry point
│   └── sr-bot.js    # Twitch bot
└── .env             # Environment variables
```

### Scripts

```bash
npm run dev         # Start development server
npm run build       # Build for production
npm run bot         # Start Twitch bot
npm run lint        # Lint code
npm run typecheck   # TypeScript type checking
```

---

## License

This project is licensed under the MIT License.

---

## Support

For issues or questions:
1. Check the [Troubleshooting](#troubleshooting) section
2. Review environment variable setup
3. Check server and bot logs for error messages
4. Ensure all tokens are valid using `/spotify/whoami` and `/twitch/whoami`

---

## Credits

Built with:
- [Express.js](https://expressjs.com/) - Web framework
- [React](https://react.dev/) - UI framework
- [Vite](https://vitejs.dev/) - Build tool
- [tmi.js](https://github.com/tmijs/tmi.js) - Twitch chat client
- [Spotify Web API](https://developer.spotify.com/documentation/web-api) - Music integration
- [Twitch API](https://dev.twitch.tv/docs/api/) - Channel points & chat
