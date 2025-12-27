# 🎵 Twitch Song Request System# Twitch Song Request System



<div align="center">A complete Twitch song request and now playing system with Spotify integration, moderation tools, and OBS overlay support.



![Status](https://img.shields.io/badge/status-production%20ready-brightgreen)## Features

![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)

![License](https://img.shields.io/badge/license-MIT-blue)- **Spotify Integration**: Display currently playing songs and manage playback

- **Twitch Chat Bot**: Automated song request handling with moderator commands

**Ett komplett system för låtförfrågningar på Twitch med Spotify-integration**- **Channel Points**: Automatic fulfillment and refunds for song requests

- **Moderation Tools**: Approve, deny, or clear song requests

[Features](#-features) • [Installation](#-installation) • [Konfiguration](#%EF%B8%8F-konfiguration) • [Användning](#-användning) • [Bot-kommandon](#-bot-kommandon) • [Felsökning](#-felsökning)- **OBS Overlay**: Beautiful now playing display for your stream

- **Web Dashboard**: Monitor and control the system via web interface

</div>- **OAuth Setup**: Easy token generation for Spotify and Twitch



---## Table of Contents



## ✨ Features1. [Prerequisites](#prerequisites)

2. [Installation](#installation)

### 🎮 Twitch-integration3. [Quick Setup Guide](#quick-setup-guide)

- **Kanalpoäng-system** - Tittare löser in låtar med Channel Points4. [Spotify Setup](#spotify-setup)

- **Automatisk moderering** - Pending-kö där mods godkänner/nekar låtar5. [Twitch Setup](#twitch-setup)

- **Auto-refund** - Återbetalar kanalpoäng vid timeout eller nekade requests6. [Environment Variables](#environment-variables)

- **Smart kommando-system** - Kraftfulla mod-kommandon för köhantering7. [Running the Application](#running-the-application)

- **Mods kan köa gratis** - `!sr` kommando för snabb låthantering8. [Usage](#usage)

9. [Bot Commands](#bot-commands)

### 🎧 Spotify-integration10. [OBS Integration](#obs-integration)

- **Realtidsspelning** - Visar nuvarande låt i overlay

- **Smart sökning** - Intelligenta algoritmer för att hitta rätt låt---

- **Direktlänkar** - Stöd för Spotify-länkar och URI:er

- **Köhantering** - Automatisk tilläggning i Spotify-kön## Prerequisites

- **Auto-refresh tokens** - Ingen manuell förnyelse behövs

- **Undvik dubbletter** - Filtrerar nyligen spelade låtar- **Node.js** (v18 or higher)

- **npm** (comes with Node.js)

### 🖥️ Webb-interface- **Spotify Account** (Premium recommended for playback control)

- **Now Playing Display** - Snygg visning av aktuell låt- **Twitch Account**

- **OBS Overlay** - Browser source-klar overlay för streams- **Twitch Channel Points Reward** (for song requests)

- **Admin Panel** - Hantera inställningar och se loggar

- **Setup Wizard** - Guidad konfiguration av tokens och rewards---

- **Reward Manager** - Uppdatera pris och beskrivning direkt i webbläsaren

## Installation

### 🤖 Avancerad bot-funktionalitet

- **Pending-kö** - Max 50 väntande requests med 15 min timeout1. Clone the repository:

- **Deferred queue** - Sparar låtar när Spotify är inaktivt```bash

- **Rate limiting** - Smart hantering av Spotify API-begränsningargit clone <your-repo-url>

- **Strukturerad sökning** - "låt av artist" ger bättre träffarcd <project-directory>

- **Deduplikation** - Undviker att samma låt köas flera gånger```



---2. Install dependencies:

```bash

## 📋 Kravnpm install

```

- **Node.js** v18.0.0 eller högre

- **npm** (följer med Node.js)3. Create a `.env` file in the root directory (see [Environment Variables](#environment-variables))

- **Spotify Premium** (rekommenderat för full funktionalitet)

- **Twitch-konto** med affiliate/partner-status (för Channel Points)---



---## Quick Setup Guide



## 🚀 InstallationFor a streamlined setup experience, you can use the built-in setup page:



### 1. Klona eller ladda ner projektet1. **Start the server:**

```bash

```bashnpm run dev

git clone <repository-url>```

cd now-playing-wip-main

```2. **Open the setup page:**

   Navigate to `http://localhost:3000/setup.html`

### 2. Installera dependencies

3. **Follow the guided setup:**

```bash   - Configure Spotify credentials (Client ID, Secret, Redirect URI)

npm install   - Get your Spotify refresh token via OAuth

```   - Configure Twitch credentials and tokens

   - **Create your channel points reward directly from the page**

### 3. Första start (genererar `.env`)   - Set all necessary environment variables



```bash4. **Create the Song Request Reward:**

npm run dev   - In the **"Create Song Request Reward"** section

```   - Enter reward title, cost, and description

   - Click **"Create Reward"**

Vid första starten skapas automatiskt en `.env`-fil från mallen. Servern kommer att köra på `http://localhost:3000`.   - The reward ID will be automatically populated



---5. **Save and restart:**

   - Click **"Save Configuration & Restart Server"**

## ⚙️ Konfiguration   - The system will automatically update your `.env` file and restart



### Steg 1: Spotify Setup**Benefits of using the setup page:**

- Guided step-by-step configuration

1. **Skapa Spotify App**- Create channel points rewards with one click

   - Gå till [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)- Automatic reward ID population

   - Klicka "Create app"- Update reward settings anytime

   - Fyll i:- No manual `.env` file editing required

     - **App name:** "Song Request System" (valfritt namn)- Visual feedback for all setup steps

     - **Redirect URI:** `http://localhost:3000/callback`

   - Spara **Client ID** och **Client Secret**For manual setup or more details, continue to the sections below.



2. **Hämta Refresh Token**---

   - Öppna `http://localhost:3000/login`

   - Logga in med Spotify## Spotify Setup

   - Kopiera **Refresh Token** som visas

### Step 1: Create a Spotify Application

3. **Uppdatera `.env`**

   ```env1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)

   SPOTIFY_CLIENT_ID=din_client_id_här2. Log in with your Spotify account

   SPOTIFY_CLIENT_SECRET=din_client_secret_här3. Click **"Create App"**

   REFRESH_TOKEN=din_refresh_token_här4. Fill in the details:

   ```   - **App Name**: Choose any name (e.g., "My Song Request Bot")

   - **App Description**: Optional description

### Steg 2: Twitch Setup   - **Redirect URI**: `http://localhost:3000/spotify/callback` (for local setup)

     - For production: Use your deployed URL (e.g., `https://yourdomain.com/spotify/callback`)

#### A. Twitch App (för Channel Points API)   - **APIs Used**: Select "Web API"

5. Click **"Save"**

1. **Skapa Twitch App**

   - Gå till [Twitch Developer Console](https://dev.twitch.tv/console/apps)### Step 2: Get Your Credentials

   - Klicka "Register Your Application"

   - Fyll i:1. On your app's dashboard, note down:

     - **Name:** "Song Request System"   - **Client ID**

     - **OAuth Redirect URLs:** `http://localhost:3000/twitch/callback`   - **Client Secret** (click "Show Client Secret")

     - **Category:** Chat Bot2. Click **"Settings"** and add your redirect URI if not already added

   - Kopiera **Client ID** och **Client Secret**

### Step 3: Get Your Refresh Token

2. **Hämta OAuth Token**

   - Öppna `http://localhost:3000/auth/twitch`1. Start your server:

   - Logga in och godkänn behörigheter```bash

   - Kopiera alla tokens som visasnpm run dev

```

3. **Uppdatera `.env`**

   ```env2. Visit: `http://localhost:3000/spotify/login`

   TWITCH_CLIENT_ID=din_client_id3. Authorize the application

   TWITCH_CLIENT_SECRET=din_client_secret4. Copy the **REFRESH_TOKEN** from the result page

   TWITCH_BROADCASTER_ID=ditt_user_id5. Add it to your `.env` file

   TWITCH_REDEMPTIONS_TOKEN=din_access_token

   TWITCH_REDEMPTIONS_REFRESH_TOKEN=din_refresh_token---

   ```

## Twitch Setup

#### B. Twitch Chat Bot

### Step 1: Create a Twitch Application

1. **Hämta Chat OAuth Token**

   - Gå till [Twitch TMI](https://twitchapps.com/tmi/)1. Go to [Twitch Developer Console](https://dev.twitch.tv/console)

   - Klicka "Connect" och godkänn2. Log in with your Twitch account

   - Kopiera hela token (inklusive `oauth:`)3. Click **"Register Your Application"**

4. Fill in the details:

2. **Uppdatera `.env`**   - **Name**: Choose any name (e.g., "Song Request Bot")

   ```env   - **OAuth Redirect URLs**: `http://localhost:3000/twitch/callback`

   TWITCH_USERNAME=ditt_bot_användarnamn     - For production: Use your deployed URL (e.g., `https://yourdomain.com/twitch/callback`)

   TWITCH_OAUTH_TOKEN=oauth:din_token_här   - **Category**: Select "Chat Bot" or "Application Integration"

   TWITCH_CHANNEL=din_kanal_namn5. Click **"Create"**

   ```

### Step 2: Get Your Credentials

### Steg 3: Skapa Channel Points Reward

1. Click **"Manage"** on your application

**Alternativ 1: Via Setup-sidan (enklast)**2. Note down:

1. Öppna `http://localhost:3000/setup.html`   - **Client ID**

2. Gå till "Create Song Request Reward"   - **Client Secret** (generate if needed)

3. Fyll i titel, pris och beskrivning

4. Klicka "Create Reward"### Step 3: Get Your Tokens

5. Reward ID kopieras automatiskt till `.env`

#### Option A: Using the OAuth Helper (Recommended)

**Alternativ 2: Manuellt via Twitch Dashboard**

1. Gå till Twitch Creator Dashboard → Channel Points1. Start your server:

2. Skapa ny "Custom Reward"```bash

3. Aktivera "Require Viewer to Enter Text"npm run dev

4. Hitta Reward ID via API eller använd setup-sidan```



---2. Visit: `http://localhost:3000/twitch/login`

3. Authorize the application

## 🎯 Användning4. Copy all tokens from the result page:

   - `TWITCH_REDEMPTIONS_TOKEN`

### Starta systemet   - `TWITCH_REDEMPTIONS_REFRESH_TOKEN`

   - `TWITCH_BROADCASTER_ID`

**Utvecklingsläge:**5. Add them to your `.env` file

```bash

# Terminal 1: Starta servern#### Option B: Manual OAuth Token for Bot

npm run dev

1. Visit [Twitch Token Generator](https://twitchtokengenerator.com/)

# Terminal 2: Starta botten2. Select **"Bot Chat Token"**

npm run bot3. Authorize and copy the OAuth token

```4. Add it to `.env` as `TWITCH_OAUTH_TOKEN` (include the `oauth:` prefix)



**Windows (båda samtidigt):**### Step 4: Create Channel Points Reward

```bash

start.bat#### Option A: Using the Setup Page (Recommended)

```

1. Start your server:

### Webbgränssnitt```bash

npm run dev

Efter start är följande sidor tillgängliga:```



| URL | Beskrivning |2. Visit: `http://localhost:3000/setup.html`

|-----|-------------|

| `http://localhost:3000/` | Now Playing display (för browser source) |3. Complete the Spotify and Twitch configuration sections first

| `http://localhost:3000/admin.html` | Admin-panel med kontroller och loggar |

| `http://localhost:3000/overlay.html` | OBS overlay (transparent bakgrund) |4. In the **"Create Song Request Reward"** section:

| `http://localhost:3000/setup.html` | Setup wizard för konfiguration |   - **Reward Title**: Enter your reward name (e.g., "Song Request")

| `http://localhost:3000/uppdaterapris` | Uppdatera reward-inställningar |   - **Cost**: Set how many channel points to charge (e.g., 1000)

   - **Prompt/Description**: Add instructions for viewers (e.g., "Request a song by entering the song name or Spotify URL")

### OBS Integration

5. Click **"Create Reward"** button

1. Lägg till en **Browser Source** i OBS

2. Använd URL: `http://localhost:3000/overlay.html`6. The system will:

3. Rekommenderade inställningar:   - Create the reward on Twitch with the correct settings

   - **Width:** 1920   - Automatically populate the **Song Reward ID** field

   - **Height:** 1080   - Enable user input requirement (viewers must enter song information)

   - ✅ **Shutdown source when not visible**

   - ✅ **Refresh browser when scene becomes active**7. Copy the Reward ID and save your configuration



---8. To update the reward later, simply change the fields and click **"Update Reward"**



## 🤖 Bot-kommandon#### Option B: Manual Creation via Twitch Dashboard



### Moderator-kommandon1. Go to your [Twitch Creator Dashboard](https://dashboard.twitch.tv/)

2. Navigate to **"Viewer Rewards"** > **"Channel Points"**

| Kommando | Beskrivning | Exempel |3. Click **"Add New Custom Reward"**

|----------|-------------|---------|4. Configure:

| `!sr <låt>` | Köa en låt direkt (gratis) | `!sr Bohemian Rhapsody Queen` |   - **Title**: "Song Request" (or your preference)

| `!srlist` | Visa alla väntande requests | `!srlist` |   - **Description**: "Request a song to be played on stream"

| `!srqueue` | Visa de 5 första i kön | `!srqueue` |   - **Cost**: Set your preferred point cost

| `!srapprove` | Godkänn hela kön | `!srapprove` |   - **Require Viewer to Enter Text**: ✅ ENABLE (this is important!)

| `!srapprove <n>` | Godkänn specifik request | `!srapprove 1` |5. Click **"Create"**

| `!srapprove @user` | Godkänn request från användare | `!srapprove @viewer123` |6. Click on the reward you just created

| `!srdeny <n>` | Neka request (återbetalar points) | `!srdeny 2` |7. Copy the **Reward ID** from the URL or settings

| `!srdeny @user` | Neka request från användare | `!srdeny @spammer` |8. Add it to `.env` as `TWITCH_SONG_REWARD_ID`

| `!srclear` | Töm hela kön (återbetalar alla) | `!srclear` |

| `!srstatus` | Visa kö-status | `!srstatus` |---



### Publika kommandon## Environment Variables



| Kommando | Beskrivning |Create a `.env` file in the root directory with the following variables:

|----------|-------------|

| `!srmy` eller `!srmine` | Kolla din egen väntande request |```env

| `!song` eller `!låt` | Visa nuvarande låt som spelas |# Server Configuration

PORT=3000

### Hur tittare begär låtarADMIN_SECRET=your_secure_admin_password



**Via Channel Points:**# Spotify Configuration

1. Lösa in "Song Request" rewardSPOTIFY_CLIENT_ID=your_spotify_client_id

2. Skriv låtnamn, artist, eller klistra in Spotify-länk:SPOTIFY_CLIENT_SECRET=your_spotify_client_secret

   - ✅ `Sandstorm`SPOTIFY_REDIRECT_URI=http://localhost:3000/spotify/callback

   - ✅ `Bohemian Rhapsody by Queen`REFRESH_TOKEN=your_spotify_refresh_token

   - ✅ `lose yourself av eminem`SPOTIFY_SEARCH_MARKET=SE

   - ✅ `https://open.spotify.com/track/...`

   - ✅ `spotify:track:...`# Twitch Bot Configuration

TWITCH_USERNAME=your_bot_username

3. Moderator godkänner eller nekarTWITCH_OAUTH_TOKEN=oauth:your_chat_token

4. Låten läggs automatiskt i Spotify-kön!TWITCH_CHANNEL=your_channel_name

TWITCH_CLIENT_ID=your_twitch_client_id

---TWITCH_CLIENT_SECRET=your_twitch_client_secret



## 🔧 Anpassning# Twitch Channel Points

TWITCH_SONG_REWARD_ID=your_reward_id

### Ändra inställningar i `.env`TWITCH_REDEMPTIONS_TOKEN=your_access_token

TWITCH_REDEMPTIONS_REFRESH_TOKEN=your_refresh_token

```envTWITCH_BROADCASTER_ID=your_user_id

# Kö-inställningar

SR_MAX_PENDING=50                  # Max antal väntande requests# Twitch Redirect URI

SR_PENDING_TTL_MS=900000          # Timeout (15 min = 900000 ms)TWITCH_REDIRECT_URI=http://localhost:3000/twitch/callback

SR_APPROVE_ALL_DELAY_MS=600       # Delay mellan låtar vid bulk-godkännande

# Bot Behavior

# Chat-svarTWITCH_REPLY_ON_COMMAND=true

TWITCH_REPLY_ENABLED=true         # Aktivera/inaktivera bot-svar i chattenSR_MAX_PENDING=50

SR_APPROVE_ALL_DELAY_MS=2000

# Spotify sökningSR_AUTO_TIMEOUT_MS=900000

SPOTIFY_SEARCH_MARKET=SE          # Land för sökning (SE, US, GB, etc.)

# Session

# ServerSESSION_SECRET=random_secure_string

PORT=3000                          # Webbserver port

```# Supabase (Optional - for data persistence)

VITE_SUPABASE_URL=your_supabase_url

### Uppdatera Reward-prisVITE_SUPABASE_ANON_KEY=your_supabase_anon_key

```

1. Gå till `http://localhost:3000/uppdaterapris`

2. Ändra pris, titel eller beskrivning### Variable Descriptions

3. Spara - ändringarna träder i kraft direkt!

| Variable | Description | How to Get |

---|----------|-------------|------------|

| `PORT` | Server port | Any available port (default: 3000) |

## 🐛 Felsökning| `ADMIN_SECRET` | Admin panel password | Choose a secure password |

| `SPOTIFY_CLIENT_ID` | Spotify app client ID | From Spotify Developer Dashboard |

### Problem: "Invalid OAuth token"| `SPOTIFY_CLIENT_SECRET` | Spotify app secret | From Spotify Developer Dashboard |

| `SPOTIFY_REDIRECT_URI` | OAuth callback URL | `http://localhost:3000/spotify/callback` (set in Spotify app) |

**Lösning:**| `REFRESH_TOKEN` | Spotify refresh token | From `/spotify/login` endpoint |

```bash| `SPOTIFY_SEARCH_MARKET` | Country code for search | 2-letter code (e.g., SE, US, GB) |

# För Twitch Channel Points| `TWITCH_USERNAME` | Bot account username | Your bot's Twitch username |

http://localhost:3000/auth/twitch| `TWITCH_OAUTH_TOKEN` | Bot chat token | From Twitch Token Generator or `/twitch/login` |

| `TWITCH_CHANNEL` | Your channel name | Your Twitch channel (lowercase) |

# För Spotify| `TWITCH_CLIENT_ID` | Twitch app client ID | From Twitch Developer Console |

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
