import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import fs from 'fs'

// ── HTTPS for localhost GPS ──────────────────────────────────────────────────
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
    host: true,           // expose on all network interfaces (192.168.x.x)
    port: 5173,
    https: httpsConfig,
    proxy: {
      // All /api and /socket.io calls go directly to local backend
      // This runs server-side on your Mac — no CORS, no ngrok needed
      '/api': {
        target:       'http://localhost:5000',
        changeOrigin: true,
        secure:       false,
      },
      '/socket.io': {
        target:       'http://localhost:5000',
        changeOrigin: true,
        secure:       false,
        ws:           true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          redux:  ['@reduxjs/toolkit', 'react-redux'],
          ui:     ['lucide-react', 'recharts', 'swiper'],
          socket: ['socket.io-client'],
          gsap:   ['gsap'],
        },
      },
    },
  },
})