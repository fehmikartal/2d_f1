# Formula 1 2D Racing - Cloudflare Deployment Guide

Deploy your 2D Formula 1 online multiplayer game 100% free on **Cloudflare Pages** (Frontend) and **Cloudflare Workers with PartyServer** (Multiplayer & Database).

---

## Architecture Overview

```
                        [ Players (Web Browsers) ]
                               /          \
          Static Web Assets   /            \  WebSockets & REST API
                             v              v
                  [ Cloudflare Pages ]     [ Cloudflare Workers + PartyServer ]
                (HTML, CSS, JS, Sounds)    (Durable Objects Database & Ghosts)
```

- **Frontend:** Hosted on **Cloudflare Pages** (free global CDN, custom domains, automated HTTPS).
- **Multiplayer Backend & Database:** Hosted on **Cloudflare Workers with PartyServer** (Cloudflare Durable Objects with transactional key-value storage).
  - **Persistent Track Records Database:** Fastest lap times per circuit (`spa` & `istanbul`) persist across room closures, client disconnects, and server deployments.
  - **Real-Time Synchronization:** Room servers automatically sync with the database and celebrate whenever a driver sets a new all-time track record!

---

## Step 1: Deploy Multiplayer Server to Cloudflare Workers

1. Log in to your Cloudflare account in the terminal:
   ```bash
   npx wrangler login
   ```
   *(A browser window will open asking you to authorize your free Cloudflare account).*

2. Deploy the Worker:
   ```bash
   npm run deploy
   ```
   *(Or run `npx wrangler deploy`)*

3. Wrangler will create the Durable Object and output your live URL:
   ```text
   Uploaded f1-2d-server (...)
   Deployed f1-2d-server triggers
     https://f1-2d-server.<your-subdomain>.workers.dev
   ```

4. Copy your worker hostname (e.g. `f1-2d-server.<your-subdomain>.workers.dev`).

---

## Step 2: Configure Production Server Host in Game

Open [`src/config.js`](file:///c:/Users/Fehmi/Desktop/All%20Code%20Files/fehmi_kodlama_2026/Gemini%20Vibe%20Games/2D_F1/src/config.js) and update `PARTYKIT_HOST` with your Cloudflare Worker domain:

```javascript
export const F1_CONFIG = {
  // Replace with your actual Cloudflare Worker domain:
  PARTYKIT_HOST: window.PARTYKIT_HOST || "f1-2d-server.<your-subdomain>.workers.dev",
  ...
};
```

*(Note: When playing locally via `play.bat` or on `localhost` / `127.0.0.1`, the game automatically connects to port 1999 so local development is always seamless without needing config changes!)*

---

## Step 3: Deploy Frontend to Cloudflare Pages

Choose either **Option A (GitHub Integration)** or **Option B (Direct CLI)**:

### Option A: Using GitHub & Cloudflare Pages Dashboard (Recommended)

1. Push your changes to GitHub:
   ```bash
   git add .
   git commit -m "Configure Cloudflare Workers PartyServer"
   git push origin main
   ```

2. Open the Cloudflare Dashboard at [dash.cloudflare.com](https://dash.cloudflare.com).
3. Navigate to **Workers & Pages** -> **Create application** -> **Pages** -> **Connect to Git**.
4. Select your repository: `fehmikartal/2d_f1`.
5. In build settings:
   - **Framework preset:** `None`
   - **Build command:** *(leave empty)*
   - **Build output directory:** `.` (single dot)
6. Click **Save and Deploy**. Cloudflare Pages will give you an HTTPS URL (e.g. `https://f1-2d-racing.pages.dev`).

### Option B: Using Wrangler CLI (Direct Deploy)

```bash
npm run pages:deploy
```
*(Or run `npx wrangler pages deploy . --project-name=f1-2d-racing`)*

---

## Step 4: Play Online with Friends

1. Open your live website (e.g. `https://f1-2d-racing.pages.dev`).
2. Enter your driver name and choose your team livery.
3. Click **"🏁 Create & Race"** on Spa or Istanbul Park.
4. Share the URL or the generated room code (e.g. `SPA101` or `IST721`) with your friends.
5. Anyone joining enters the session instantly as transparent ghost cars with live lap timing!
