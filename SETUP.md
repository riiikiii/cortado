# Cortado — setup

Cortado is an installable web app (PWA) for reading a "vault": a Google Drive folder of HTML guides and Markdown notes. **Sync** downloads the whole folder into the app's storage, so everything works offline after that.

## 1. Run it locally

```powershell
npm install
npm run dev
```

Open http://localhost:5173. On localhost, **Add sample vault (dev)** loads `sample-vault/` so you can try the app without Google. To use another local folder instead, set `DEV_VAULT_DIR` before you run `npm run dev`.

Other commands: `npm test` (unit tests), `npm run build` and `npm run preview` (the production build at http://localhost:4173/cortado/).

## 2. Create a Google OAuth client (one time)

1. Go to https://console.cloud.google.com/, create a project (e.g. "Cortado") and select it.
2. **APIs & Services → Library**: enable the **Google Drive API**.
3. **Google Auth Platform → Branding / Audience**:
   - Set the app name to Cortado and add your email.
   - Set Audience to **External** and leave it in **Testing**.
   - Under **Test users**, add your own Google account.
4. **Data Access**: add the scope `https://www.googleapis.com/auth/drive.readonly`.
5. **Clients → Create client**: choose **Web application**, then add:
   - **Authorised JavaScript origins:** `http://localhost:5173`, `http://localhost:4173`, `https://<your-github-username>.github.io`
   - **Authorised redirect URIs:** `http://localhost:5173/`, `http://localhost:4173/cortado/`, `https://<your-github-username>.github.io/cortado/`
6. Copy the **Client ID**. It's public, not a secret. For local use, put it in `.env.local`:

   ```
   VITE_GOOGLE_CLIENT_ID=1234567890-abc.apps.googleusercontent.com
   ```

While the app stays in Testing mode, only the test users you listed can sign in, which is what you want for a personal app. Each sign-in lasts about an hour. When it runs out, Sync sends you back to Google and then carries on with the sync automatically. Reading never needs a sign-in.

## 3. Deploy to GitHub Pages

1. Create a GitHub repo named `cortado` and push this folder to its `main` branch. If you use another repo name, the workflow sets the base path from the repo name automatically; update the OAuth URLs to match.
2. **Settings → Pages → Build and deployment → Source:** choose **GitHub Actions**.
3. **Settings → Secrets and variables → Actions → Variables:** add `VITE_GOOGLE_CLIENT_ID`.
4. Push. The `Deploy to GitHub Pages` workflow tests, builds and publishes the app to `https://<you>.github.io/cortado/`.

## 4. Install on the iPad mini

1. Open `https://<you>.github.io/cortado/` in **Safari**.
2. Tap **Share → Add to Home Screen**, then open Cortado from the home screen.
3. Tap the vault name → **Add a Google Drive folder**. Sign in, browse to your folder, and choose **Use "…" as a vault**. The first sync starts straight away.

Tips:
- In portrait, swipe in from the left edge (or tap the sidebar button) to open the file list. In landscape the file list stays docked; drag its edge to resize it.
- To open a link in a new tab, long-press it, or ⌘-click with a keyboard. Long-press a tab for more options.
- With a keyboard: ⌘K to search, ⌘W to close a tab, ⌃Tab to switch tabs, ⌘\ to toggle the sidebar.
- Tap **Sync** whenever you've changed files in Drive. Only new or changed files download, and files deleted in Drive are removed from the iPad.

## How it works

- **Storage:** files go into IndexedDB on the device. Installed home-screen apps are exempt from Safari's 7-day storage clean-up, and the app asks for persistent storage too.
- **Rendering:** a service worker serves vault files at `/cortado/vault/<vault>/<path>`, so HTML guides load as real pages. Their relative CSS, JS, images and links work, and scripts run. On iPad every browser uses WebKit (Safari's engine), so guides render as they would in Safari. External CDN scripts still need a connection; to make a guide work fully offline, keep its assets in the vault.
- **Security note:** guides run with the same origin as the app, so a guide's script could read the app's local data. That's fine for your own guides, but don't add HTML from sources you don't trust to a vault.
- **Not synced:** Google Docs, Sheets and Slides have no downloadable file content, so they're skipped.
