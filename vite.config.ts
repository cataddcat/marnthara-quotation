import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath } from 'url';
import path from 'path';

// ✅ แก้ปัญหา __dirname ใน ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  // 1. Base Path — root domain (Vercel)
  base: '/',

  // 2. Plugins
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate', // อัปเดตเงียบๆ เมื่อมีเน็ต แล้วรอ User เปิดแอปใหม่
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'], // ไฟล์ที่ต้อง Cache ชัวร์ๆ
      manifest: {
        name: 'MTR Quotation',
        short_name: 'Marnthara',
        description: 'แอพพลิเคชั่นคำนวณราคาม่านและวอลเปเปอร์',
        theme_color: '#ffffff', // เดี๋ยวเราจะแก้ให้ Dynamic ใน index.html อีกที
        background_color: '#ffffff',
        display: 'standalone', // ตัด Address bar ทิ้ง ให้เหมือน Native App
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable', // สำคัญสำหรับ Android รุ่นใหม่
          },
        ],
      },
      workbox: {
        // Config นี้คือหัวใจของ Offline Mode
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'], // Cache ทุกอย่างที่จำเป็น
        runtimeCaching: [
          {
            // Cache Google Fonts (ถ้ามีใช้)
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 ปี
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],

  // 3. Path Alias
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  // 4. Build Settings (Optimized)
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    // [ARCHITECT] Optimization: Split Chunks to improve load performance
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React
          'vendor-react': ['react', 'react-dom'],
          // UI Libraries (Icons, HeadlessUI)
          'vendor-ui': ['@headlessui/react', 'lucide-react'],
          // State Management & Utils (removed date-fns)
          'vendor-utils': ['zustand', 'zundo', 'clsx', 'tailwind-merge'],
          // Heavy Libraries (PDF Printing)
          'vendor-print': ['react-to-print'],
        },
      },
    },
    // Adjust warning limit to reduce noise after splitting
    chunkSizeWarningLimit: 1000,
  },

  // 5. Server Settings
  server: {
    port: 3000,
    open: true,
  },
});
