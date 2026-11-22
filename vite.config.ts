/// <reference types="vitest" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { devVault } from './scripts/devVaultPlugin.ts';
import { siteLibrary } from './scripts/libraryPlugin.ts';

export default defineConfig(({ command, isPreview }) => ({
  // GitHub Pages serves the app from /<repo>/. Override with BASE_PATH if the repo has another name.
  base: command === 'build' || isPreview ? (process.env.BASE_PATH ?? '/cortado/') : '/',
  plugins: [
    react(),
    devVault(),
    siteLibrary(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectRegister: false,
      devOptions: { enabled: true, type: 'module' },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // The published library is synced into IndexedDB by the app, not precached.
        globIgnores: ['library/**'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
      },
      manifest: {
        name: 'Cortado',
        short_name: 'Cortado',
        description: 'Your guides and notes from Google Drive, beautifully readable and available offline.',
        display: 'standalone',
        orientation: 'any',
        background_color: '#1a1512',
        theme_color: '#1a1512',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
  },
}));
