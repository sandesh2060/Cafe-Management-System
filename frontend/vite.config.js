// vite.config.js
//
// ─── PERF CHANGES ────────────────────────────────────────────────────────────
// 1. three split into its own chunk — Three.js is ~600KB and was included in
//    vendor, causing the main bundle to delay first paint by ~400ms on Android.
//    Now it lazy-loads only when SkyCanvas is mounted (inside Suspense).
// 2. motion split from vendor — framer-motion/motion is ~150KB, separating it
//    means it can load in parallel with the app instead of blocking it.
// 3. All other config unchanged
// ─────────────────────────────────────────────────────────────────────────────

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import fs from 'fs'

let httpsConfig = undefined
const certPath = path.resolve(__dirname, '.certs')
const keyFile  = path.join(certPath, 'localhost-key.pem')
const certFile = path.join(certPath, 'localhost.pem')
if (fs.existsSync(keyFile) && fs.existsSync(certFile)) {
  httpsConfig = { key: fs.readFileSync(keyFile), cert: fs.readFileSync(certFile) }
}

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'fonts/**', 'sounds/**', 'models/**'],
      manifest: {
        name: 'कौसी चिया',
        short_name: 'KausiChiya',
        description: 'Smart Cafe Management System',
        theme_color: '#FF9F1C',
        background_color: '#FFF8EE',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'icons/pwa/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/pwa/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,mp3,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.openweathermap\.org\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'weather-api-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 30 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@':           path.resolve(__dirname, './src'),
      '@app':        path.resolve(__dirname, './src/app'),
      '@modules':    path.resolve(__dirname, './src/modules'),
      '@shared':     path.resolve(__dirname, './src/shared'),
      '@store':      path.resolve(__dirname, './src/store'),
      '@api':        path.resolve(__dirname, './src/api'),
      '@styles':     path.resolve(__dirname, './src/styles'),
      '@animations': path.resolve(__dirname, './src/shared/animations'),
      '@colors':     path.resolve(__dirname, './src/shared/config/colors'),
      '@sounds':     path.resolve(__dirname, './src/shared/config/sounds'),
    },
  },
  server: {
    host: true,
    port: 5173,
    https: httpsConfig,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor:  ['react', 'react-dom', 'react-router-dom'],
          redux:   ['@reduxjs/toolkit', 'react-redux'],
          ui:      ['lucide-react', 'recharts', 'swiper'],
          socket:  ['socket.io-client'],
          gsap:    ['gsap'],
          // FIX: three.js in its own chunk — it's ~600KB and only needed
          // by SkyCanvas which is lazily loaded inside <Suspense>.
          // Previously in vendor it blocked ALL first paint on Android.
          three:   ['three'],
          // FIX: motion separated so it loads in parallel, not blocking vendor
          motion:  ['motion/react'],
        },
      },
    },
  },
})