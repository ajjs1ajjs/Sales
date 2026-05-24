/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectManifest: {
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
      manifest: {
        name: 'Game Sales Aggregator',
        short_name: 'Game Sales',
        description: 'Агрегатор знижок та безкоштовних ігор у Steam та Epic Games Store',
        start_url: '/Sales/',
        display: 'standalone',
        background_color: '#0a0712',
        theme_color: '#c084fc',
        icons: [
          {
            src: '/Sales/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
        categories: ['games', 'entertainment', 'shopping'],
        lang: 'uk',
      },
    }),
  ],
  base: '/Sales/',
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.ts',
    css: true,
  },
})
