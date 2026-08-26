/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'
import { apiDevPlugin } from './vite.api-plugin'

export default defineConfig({
  plugins: [
    react(),
    apiDevPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: {
        name: 'Painel do ar',
        short_name: 'Painel do ar',
        description: 'Índice de qualidade do ar hora a hora nas 27 capitais brasileiras.',
        lang: 'pt-BR',
        start_url: '/',
        display: 'standalone',
        background_color: '#e8edee',
        theme_color: '#0f2027',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Só o app shell (JS/CSS/HTML/fontes). Dados da Open-Meteo e da API
        // própria ficam de fora de propósito — `src/lib/db.ts` já é dono
        // dessa responsabilidade (cache em IndexedDB, banner de "dados
        // salvos"); cachear no service worker também criaria duas fontes de
        // verdade para "dado antigo".
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    environmentMatchGlobs: [['api/**', 'node']],
    setupFiles: ['./vitest.setup.ts'],
    testTimeout: 10000,
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/test/**', 'src/main.tsx', 'src/**/*.d.ts'],
    },
  },
})
