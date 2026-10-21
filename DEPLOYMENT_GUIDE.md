# Formula 1 2D Racing - Cloudflare Pages & PartyKit Deployment Guide

This guide describes how to deploy the 2D F1 game live on the web with free global hosting for 1–10 players.

---

## Architecture Overview

```
               [ Players (Web Browsers) ]
                 /                    \
     HTTP / Static Assets       WebSocket & REST API (Ghosts & Persistent Leaderboard)
               /                        \
    [ Cloudflare Pages ]           [ PartyKit on Cloudflare Workers ]
   (Frontend UI & Game Loop)         (Edge Server & Cloudflare Durable Object Database)
```

- **Frontend:** Hosted on **Cloudflare Pages** (unlimited free bandwidth, instant edge CDN).
- **Multiplayer Backend & Database:** Hosted on **PartyKit** (built on Cloudflare Durable Objects / Workers with persistent key-value storage).
  - **Persistent Track Records Database:** Fastest lap times per circuit (`spa` & `istanbul`) are stored in Cloudflare Durable Object persistent storage (`room.storage`) in the dedicated database room. Lap records, theoretical best splits, and driver benchmarks survive server restarts, room destructions, and deployments.
  - **Real-Time Synchronization:** Room servers automatically sync with the database and celebrate whenever a driver sets a new all-time track record!

---

## Step 1: Deploy PartyKit Multiplayer Server (Free)

1. Open your terminal in this repository directory:
   ```bash
   npm run party:deploy
   ```
   *(Or run `npx partykit deploy`)*

2. If this is your first time deploying to PartyKit, a browser window will automatically open asking you to authorize via GitHub or email.
3. Once logged in, PartyKit will deploy your server in 5 seconds and display your live URL in the terminal:
   ```text
   Deployed party/server.js to https://f1-2d-server.<your-username>.partykit.dev
   ```
4. Copy your hostname (e.g. `f1-2d-server.<your-username>.partykit.dev`).

---

## Step 2: Configure Production Server Host

Open [`src/config.js`](file:///c:/Users/Fehmi/Desktop/All%20Code%20Files/fehmi_kodlama_2026/Gemini%20Vibe%20Games/2D_F1/src/config.js) and update `PARTYKIT_HOST` with your deployed domain:

```javascript
export const F1_CONFIG = {
  // Replace with your actual PartyKit domain:
  PARTYKIT_HOST: "f1-2d-server.<your-username>.partykit.dev",
  ...
};
```

*(Note: When running locally on `localhost` or `127.0.0.1`, the game automatically connects to `127.0.0.1:1999` so development remains completely seamless without needing to edit config!)*

---

## Step 3: Deploy Frontend to Cloudflare Pages (Free)

You have two easy options to deploy the frontend to Cloudflare Pages:

### Option A: Using Wrangler CLI (Direct Terminal Deploy)
1. Run the deployment script:
   ```bash
   npm run pages:deploy
   ```
   *(Or run `npx wrangler pages deploy . --project-name=f1-2d-racing`)*
2. If prompted, authorize your Cloudflare account.
3. Wrangler will upload the static assets and print your live URL:
   ```text
   ✨ Deployment complete! Take a peek over at https://f1-2d-racing.pages.dev
   ```

### Option B: Using GitHub & Cloudflare Pages Dashboard
1. Push your repository to GitHub:
   ```bash
   git add .
   git commit -m "Add online multiplayer support"
   git push origin main
   ```
2. Log in to [dash.cloudflare.com](https://dash.cloudflare.com).
3. Go to **Workers & Pages** -> **Create application** -> **Pages** -> **Connect to Git**.
4. Select the `fehmikartal/2d_f1` repository.
5. In build settings:
   - **Framework preset:** `None`
   - **Build command:** *(leave empty)*
   - **Build output directory:** `.` (root directory)
6. Click **Save and Deploy**. Cloudflare Pages will provide an SSL-secured `https://*.pages.dev` URL and auto-deploy every commit.

---

## How to Play Online with Friends

1. Open your live website (e.g. `https://f1-2d-racing.pages.dev`).
2. Enter your driver name and pick your team livery (Red Bull, Ferrari, Mercedes, McLaren, Aston Martin).
3. Click **"CREATE SPA ROOM"** or **"CREATE ISTANBUL ROOM"**.
4. Click the **"COPY"** button on the HUD room badge (e.g. `SPA9821`) or send friends the share URL with the hash:
   `https://f1-2d-racing.pages.dev#SPA9821`
5. Friends will immediately spawn onto the track as transparent ghost cars with custom overhead nametags.
6. Race around the track—cars pass through each other with zero collisions!
7. Complete clean laps to record your best time on the live **F1 Timing Tower** and in the **Room Standings** leaderboard.
