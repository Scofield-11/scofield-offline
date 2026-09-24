import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Scofield Offline',
        short_name: 'Scofield',
        description: 'Ứng dụng học từ vựng siêu tốc',
        theme_color: '#863bff',
        background_color: '#f6f7fb',
        display: 'standalone', // Bắt buộc để iPhone ẩn thanh địa chỉ
        icons: [
          {
            src: '/logo-180.jpg',
            sizes: '180x180',
            type: 'image/jpeg',
            purpose: 'apple touch icon'
          },
          {
            src: '/logo-512.jpg',
            sizes: '512x512',
            type: 'image/jpeg',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ]
})