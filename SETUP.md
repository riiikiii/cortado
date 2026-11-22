# Cortado setup

Cortado is an installable web app (PWA) for reading **Cortado Notes**: the HTML guides and Markdown notes in this repo's `library/` folder, published with the site. The app downloads them into its own storage, so everything works offline after that.

## 1. Run it locally

```powershell
npm install
npm run dev
```

Open http://localhost:5173. The dev server serves `library/` live, so your notes appear straight away. On localhost, **Try the sample vault** (or the vault menu at the top of the sidebar) also loads `sample-vault/`, which shows off what notes can do. To use another local folder for it, set `DEV_VAULT_DIR` before you run `npm run dev`.

Other commands: `npm test` (unit tests), `npm run build` and `npm run preview` (the production build at http://localhost:4173/cortado/).

## 2. Add notes

Everything in the `library/` folder is published with the site and opens in Cortado.

- Put Markdown notes (`.md`) and standalone HTML guides (`.html`) in `library/`, with each guide's images, CSS and scripts beside it. Folders show in the sidebar. Number files (`01 Intro.md`, `02 Basics.md`) to set the reading order.
- Commit and push to `main`. The deploy copies the folder to `https://<you>.github.io/cortado/library/` and writes `library.json`, a list of every file with its checksum.
- The first time someone opens Cortado, it downloads the notes. After that, whenever the app is opened or brought back to the front while online, it checks `library.json` and downloads only new or changed files, and removes deleted ones. The sync button at the top of the sidebar checks straight away.
- The name defaults to "Cortado Notes". To change it, add an Actions variable `LIBRARY_NAME` (step 3); the app picks up the new name the next time it's opened.
- Hidden files and folders (names starting with `.`, such as `.obsidian`) aren't published.
- Everything in `library/` is public: anyone with the site's address can read it. GitHub limits files to 100 MB and a Pages site to 1 GB.

## 3. Deploy to GitHub Pages

1. Create a GitHub repo named `cortado` and push this folder to its `main` branch. If you use another repo name, the workflow sets the base path from the repo name automatically.
2. **Settings → Pages → Build and deployment → Source:** choose **GitHub Actions**.
3. Optionally, **Settings → Secrets and variables → Actions → Variables:** add `LIBRARY_NAME`.
4. Push. The `Deploy to GitHub Pages` workflow tests, builds and publishes the app to `https://<you>.github.io/cortado/`.

## 4. Install on the iPad mini

1. Open `https://<you>.github.io/cortado/` in **Safari**.
2. Tap **Share → Add to Home Screen**, then open Cortado from the home screen. Your notes download by themselves.

Tips:
- Tabs work like a browser's: a file always opens in the tab you're in. Tap **+** (or **New tab** in the sidebar, or ⌘T) for a new tab, which shows "Select a file" until you pick one. When there are more tabs than fit, the bar scrolls and a count button lists them all. Closing every tab brings back the home screen.
- Lessons follow the sidebar order, with a top-level Welcome, README, Index or "00 …" note first. Number your files ("01 Intro", "02 Basics") to set the order.
- At the end of a note, **Mark complete & continue** ticks it off and opens the next lesson. HTML guides show the same controls in a floating bar when you reach the bottom. The ✓ button in the toolbar works anywhere.
- **Aa** in the toolbar changes theme (Auto, Light, Sepia, Dark), text size, font and line width. The list button shows the note's outline.
- In portrait, swipe in from the left edge (or tap the sidebar button) to open the file list. In landscape the file list stays docked; drag its edge to resize it.
- To open a link in a new tab instead, long-press it, or ⌘-click with a keyboard. Long-press a tab for more options.
- With a keyboard: ⌘K to search titles and full text, ⌥→ / ⌥← for the next or previous lesson, ⌘T for a new tab, ⌘W to close a tab, ⌃Tab to switch tabs, ⌘\ to toggle the sidebar.

## How it works

- **Publishing:** `scripts/libraryPlugin.ts` publishes `library/` during the build. The notes aren't part of the service worker's precache; they're synced into IndexedDB, so they're stored once and only changed files download.
- **Progress:** completed lessons and how far you've read are stored on the device. **Settings → Reset** clears them.
- **Search:** after each sync Cortado reads your notes and guides in the background to build a full-text index (files over 3 MB are skipped). It lives in memory, so nothing extra is stored.
- **Storage:** files go into IndexedDB on the device. Installed home-screen apps are exempt from Safari's 7-day storage clean-up, and the app asks for persistent storage too.
- **Rendering:** a service worker serves the downloaded files at `/cortado/vault/<vault>/<path>`, so HTML guides load as real pages. Their relative CSS, JS, images and links work, and scripts run. On iPad every browser uses WebKit (Safari's engine), so guides render as they would in Safari. External CDN scripts still need a connection; to make a guide work fully offline, keep its assets in `library/`.
- **Security note:** guides run with the same origin as the app, so a guide's script could read the app's local data. That's fine for your own guides, but don't add HTML from sources you don't trust.
