import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'icons/*.png'],
      manifest: {
        name: 'AL-WILDAN HR System',
        short_name: 'AW HR',
        description: 'Sistem Data Kepegawaian AL-WILDAN Islamic School',
        start_url: '/?source=pwa',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait-primary',
        background_color: '#1A3B8F',
        theme_color: '#1A3B8F',
        lang: 'id',
        categories: ['productivity', 'business'],
        icons: [
          { src: '/icons/icon-72.png',       sizes: '72x72',   type: 'image/png' },
          { src: '/icons/icon-96.png',       sizes: '96x96',   type: 'image/png' },
          { src: '/icons/icon-128.png',      sizes: '128x128', type: 'image/png' },
          { src: '/icons/icon-144.png',      sizes: '144x144', type: 'image/png' },
          { src: '/icons/icon-152.png',      sizes: '152x152', type: 'image/png' },
          { src: '/icons/icon-192.png',      sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-384.png',      sizes: '384x384', type: 'image/png' },
          { src: '/icons/icon-512.png',      sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          {
            name: 'Dashboard',
            url: '/?source=shortcut',
            icons: [{ src: '/icons/icon-96.png', sizes: '96x96' }]
          },
          {
            name: 'Upload Data',
            url: '/?page=upload&source=shortcut',
            icons: [{ src: '/icons/icon-96.png', sizes: '96x96' }]
          }
        ]
      },
      workbox: {
        // Cache static assets — Cache First
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            // API calls — Network First (data HR harus selalu fresh)
            urlPattern: /^https?:\/\/.*\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 300 },
              networkTimeoutSeconds: 10,
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            // Google Fonts — Stale While Revalidate
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-cache' }
          },
          {
            // Font files — Cache First
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }
            }
          }
        ]
      },
      devOptions: {
        enabled: false // nonaktif di dev, aktif saat build
      }
    })
  ],
  server: {
    port: 5174,
    proxy: {
      '/api': 'http://localhost:3010'
    }
  }
})
