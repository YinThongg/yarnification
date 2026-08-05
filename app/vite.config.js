import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      // Precache the app shell + chart images so an installed copy opens and
      // tracks with no network. Pattern *data* lives in IndexedDB (offline by
      // nature); chart crops ship as static assets and are precached here.
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,json,woff,woff2}'],
        // Chart crops can be a few hundred KB; keep them under the precache cap.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
      includeAssets: ['icon.svg', 'pwa-192.png', 'pwa-512.png'],
      manifest: {
        name: 'Yarnification — knitting tracker',
        short_name: 'Yarnification',
        description: 'Offline knitting pattern tracker — charts, grids and row counters that work with no internet.',
        theme_color: '#d97706',
        background_color: '#f9f9f8',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      // SW off in dev (avoids stale-cache surprises with HMR); verify on preview.
      devOptions: { enabled: false },
    }),
  ],
  server: {
    // Fixed port so the preview proxy always points at the right upstream.
    // (Honors PORT if the harness sets it; otherwise 5175 to avoid clashing
    // with another session's server on 5173.)
    port: process.env.PORT ? Number(process.env.PORT) : 5175,
    strictPort: true,
  },
})
