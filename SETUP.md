# Cortado — setup

Cortado is an installable web app (PWA) for reading a "vault": a Google Drive folder of HTML guides and Markdown notes. **Sync** downloads the whole folder into the app's storage, so everything works offline after that.

## 1. Run it locally

```powershell
npm install
npm run dev
```

Open http://localhost:5173. On localhost, **Try the sample vault** loads `sample-vault/` so you can try the app without Google. To use another local folder instead, set `DEV_VAULT_DIR` before you run `npm run dev`.

Other commands: `npm test` (unit tests), `npm run build` and `npm run preview` (the production build at http://localhost:4173/cortado/).

## 2. Create a Google OAuth client (one time)

Cortado signs in to Google with your own OAuth client, so your files only travel between Google and the device. Create it once:

1. Go to https://console.cloud.google.com/, create a project (e.g. "Cortado") and select it.
2. **APIs & Services → Library**: enable the **Google Drive API**.
3. **Google Auth Platform → Branding / Audience**:
   - Set the app name to Cortado and add your email.
   - Set Audience to **External** and leave it in **Testing**.
   - Under **Test users**, add every Google account that should be able to sign in (yours, and anyone you share Cortado with).
4. **Data Access**: add the scope `https://www.googleapis.com/auth/drive.readonly`.
5. **Clients → Create client**: choose **Web application**, then add:
   - **Authorised JavaScript origins:** `http://localhost:5173`, `http://localhost:4173`, `https://<your-github-username>.github.io`
   - **Authorised redirect URIs:** `http://localhost:5173/`, `http://localhost:4173/cortado/`, `https://<your-github-username>.github.io/cortado/`
6. Copy the **Client ID**. It's public, not a secret. Give it to Cortado in either way:
   - **Built in (recommended for a deployment):** set `VITE_GOOGLE_CLIENT_ID` in `.env.local` for local use, or as a GitHub Actions variable for the deployed site (step 3 below).
   - **In the app:** if the build has no client ID, tapping **Continue with Google** opens a short setup guide. It shows the exact origin and redirect URI to add for that address, and you paste the client ID there. It's saved on that device only, and you can change or remove it in **Settings**.

### Signing in

- Tap **Continue with Google**, sign in, then pick a folder from **My Drive**, **Shared with me** or **Shared drives**. The first sync starts straight away.
- You can connect several Google accounts. Each vault remembers the account it came from, and **Settings → Google accounts** shows who is connected, how many vaults each has, and lets you disconnect an account (which also revokes its access token).
- Each sign-in lasts about an hour. When it has run out, **Sync** sends you back to Google with that vault's account already chosen, then carries on with the sync. Reading never needs a sign-in.

### Who can sign in

While the OAuth app stays in **Testing**, only the test users you listed (up to 100) can sign in. That's ideal for you and a small group: add each person's Google account under **Test users** and they can connect their own Drive by logging in.

To let *any* Google account sign in you would publish the app to **In production**. Because Cortado needs `drive.readonly` (Google calls it a *restricted* scope), Google then requires its restricted-scope verification first. Cortado keeps all Drive data on the device and has no server, which is the set-up Google recommends for restricted scopes, but expect a review either way. The narrower `drive.file` scope can't be used instead: it only covers files a user picks one by one, not everything inside a chosen folder.

## 3. Deploy to GitHub Pages

1. Create a GitHub repo named `cortado` and push this folder to its `main` branch. If you use another repo name, the workflow sets the base path from the repo name automatically; update the OAuth URLs to match.
2. **Settings → Pages → Build and deployment → Source:** choose **GitHub Actions**.
3. **Settings → Secrets and variables → Actions → Variables:** add `VITE_GOOGLE_CLIENT_ID`.
4. Push. The `Deploy to GitHub Pages` workflow tests, builds and publishes the app to `https://<you>.github.io/cortado/`.

## 4. Install on the iPad mini

1. Open `https://<you>.github.io/cortado/` in **Safari**.
2. Tap **Share → Add to Home Screen**, then open Cortado from the home screen.
3. Tap **Continue with Google**, sign in, browse to your folder, and choose **Use "…" as a vault**. The first sync starts straight away. To add more folders or accounts later, tap the vault name at the top of the sidebar.

Tips:
- **Library** (the house tab) shows your progress, a **Continue** card that picks up where you left off, and each top-level folder as a collection. Tap a collection to see its lessons in order.
- Lessons follow the sidebar order, with a top-level Welcome, README, Index or "00 …" note first. Number your files ("01 Intro", "02 Basics") to set the order.
- At the end of a note, **Mark complete & continue** ticks it off and opens the next lesson. HTML guides show the same controls in a floating bar when you reach the bottom. The ✓ button in the toolbar works anywhere.
- **Aa** in the toolbar changes theme (Auto, Light, Sepia, Dark), text size, font and line width. The list button shows the note's outline.
- In portrait, swipe in from the left edge (or tap the sidebar button) to open the file list. In landscape the file list stays docked; drag its edge to resize it.
- To open a link in a new tab, long-press it, or ⌘-click with a keyboard. Long-press a tab for more options.
- With a keyboard: ⌘K to search titles and full text, ⌥→ / ⌥← for the next or previous lesson, ⌘W to close a tab, ⌃Tab to switch tabs, ⌘\ to toggle the sidebar.
- Tap **Sync** whenever you've changed files in Drive. Only new or changed files download, and files deleted in Drive are removed from the iPad.

## How it works

- **Progress:** completed lessons and how far you've read are stored per vault on the device. **Settings → Reset** clears them.
- **Search:** after each sync Cortado reads your notes and guides in the background to build a full-text index (files over 3 MB are skipped). It lives in memory, so nothing extra is stored.
- **Storage:** files go into IndexedDB on the device. Installed home-screen apps are exempt from Safari's 7-day storage clean-up, and the app asks for persistent storage too.
- **Rendering:** a service worker serves vault files at `/cortado/vault/<vault>/<path>`, so HTML guides load as real pages. Their relative CSS, JS, images and links work, and scripts run. On iPad every browser uses WebKit (Safari's engine), so guides render as they would in Safari. External CDN scripts still need a connection; to make a guide work fully offline, keep its assets in the vault.
- **Security note:** guides run with the same origin as the app, so a guide's script could read the app's local data. That's fine for your own guides, but don't add HTML from sources you don't trust to a vault.
- **Not synced:** Google Docs, Sheets and Slides have no downloadable file content, so they're skipped.
