import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'


export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['shopping-cart-small.png'],
      manifest: {
        name: 'Pocket POS',
        short_name: 'PocketPOS',
        description: '結帳與庫存小幫手',
        theme_color: '#000000',
        background_color: '#f4f4f5',
        display: 'standalone',
        icons: [
          {
            src: 'shopping-cart-small.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'shopping-cart-small.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
    }),
  ],
  base: './',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})