import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Android WebViews shipped with Android 7/8 (minSdk 24) can be years behind
  // Chrome and throw a SyntaxError on modern syntax such as `??` (Chrome 80) or
  // optional catch binding (Chrome 66). A SyntaxError kills the entry module
  // before React mounts, which presents as a silent white screen in the APK.
  // es2019 keeps the output parseable on WebViews back to Chrome 66.
  build: {
    target: 'es2019'
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'favicon.svg', 'pdf.worker.min.js'],
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,ttf,eot}'],
        globIgnores: ['**/students*.png', '**/students*.jpg', '**/*.pdf'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/\.(?:pdf)$/i, /^blob:/i],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/menen-oshd-api\.pxxl\.click\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60
              },
              networkTimeoutSeconds: 5,
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/menen-oshd-api\.pxxl\.click\/Textbooks\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'textbook-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 30
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false
      },
      '/textbooks': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false
      }
    }
  }
});
