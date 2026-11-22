/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { getBlob } from './storage/db';
import { mimeFor, parseVaultUrl } from './util/paths';

declare const self: ServiceWorkerGlobalScope;

const BASE = new URL(self.registration.scope).pathname; // "/" or "/cortado/"

// 1. Vault files: answered from IndexedDB so guides, their assets and links work offline.
//    Registered before Workbox so this listener gets first chance at the request.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || event.request.method !== 'GET') return;
  const target = parseVaultUrl(url.pathname, BASE);
  if (!target) return;
  event.respondWith(serveVaultFile(target.vaultId, target.path));
});

async function serveVaultFile(vaultId: string, path: string): Promise<Response> {
  let blob = await getBlob(vaultId, path);
  // A folder link like "guides/" resolves to its index.html.
  if (!blob && (path === '' || path.endsWith('/'))) {
    path = `${path}index.html`;
    blob = await getBlob(vaultId, path);
  }
  if (!blob) {
    return new Response(notFoundPage(path), {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
  return new Response(blob, {
    headers: {
      'Content-Type': mimeFor(path),
      'Content-Length': String(blob.size),
      'Cache-Control': 'no-store',
    },
  });
}

function notFoundPage(path: string) {
  const safe = path.replace(/[<>&"]/g, (c) => `&#${c.charCodeAt(0)};`);
  return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<body style="font:16px -apple-system,system-ui,sans-serif;padding:2rem;color:#888">
<h2 style="color:inherit">Not in the synced vault</h2><p><code>${safe}</code> isn't stored on this device. Try syncing the vault.</p></body>`;
}

// 2. App shell: precached, so the app opens with no network.
const manifest = self.__WB_MANIFEST;
precacheAndRoute(manifest);
cleanupOutdatedCaches();

// In dev the manifest has no index.html, so only add the offline navigation fallback in builds.
if (manifest.some((e) => (typeof e === 'string' ? e : e.url).endsWith('index.html'))) {
  registerRoute(
    new NavigationRoute(createHandlerBoundToURL(`${BASE}index.html`), {
      denylist: [new RegExp(`^${BASE}vault/`), /^\/__dev-vault/],
    }),
  );
}

self.skipWaiting();
clientsClaim();

// A hard reload (⇧⌘R) loads the page without the service worker. The page asks us to take it
// over again, so vault files (guides, images) keep loading from the device.
self.addEventListener('message', (event) => {
  if ((event.data as { type?: string } | null)?.type === 'CLAIM') event.waitUntil(self.clients.claim());
});
