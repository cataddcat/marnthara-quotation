import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath } from 'url';
import { execSync } from 'node:child_process';
import path from 'path';

// ✅ แก้ปัญหา __dirname ใน ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// เวอร์ชันที่โชว์ใน footer = "วันที่ deploy · รหัส commit สั้น" — ดึงจาก git ตอน build (ไม่ต้อง bump มือ).
// Vercel ตั้ง VERCEL_GIT_COMMIT_SHA ให้ทุก build; local ใช้ git CLI; ไม่มีทั้งคู่ → 'dev' (กัน build พัง).
function resolveAppVersion(): string {
  const sha =
    process.env.VERCEL_GIT_COMMIT_SHA ||
    (() => {
      try {
        return execSync('git rev-parse HEAD').toString().trim();
      } catch {
        return '';
      }
    })();
  const short = sha ? sha.slice(0, 7) : 'dev';
  // วันที่ build = วันที่ deploy (โซนกรุงเทพ) รูปแบบ YYYY-MM-DD
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date());
  return `${date} · ${short}`;
}

export default defineConfig(({ command }) => ({
  // 1. Base Path — root domain (Vercel)
  base: '/',

  // เวอร์ชัน footer (git-derived) — Vite แทนที่ token นี้แบบ static ทั้ง dev/build
  define: {
    __APP_VERSION__: JSON.stringify(resolveAppVersion()),
  },

  // 2. Plugins
  plugins: [
    // dev เท่านั้น: ฉีด data-loc="<file>:<line>:<col>" ลง host element (ใช้โดย DevInspector)
    // prod build (command === 'build') ไม่โหลด → DOM/asset สะอาด, hash ไม่เปลี่ยน
    react(
      command === 'serve'
        ? { babel: { plugins: [path.resolve(__dirname, 'scripts/babel-plugin-data-loc.cjs')] } }
        : undefined
    ),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate', // อัปเดตเงียบๆ เมื่อมีเน็ต แล้วรอ User เปิดแอปใหม่
      includeAssets: ['favicon.png', 'apple-touch-icon.png'], // ไฟล์ static ที่ต้อง precache (icons pwa-*.png plugin ใส่ให้เอง)
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
            // Firestore / Auth — ห้าม cache (SDK มี offline cache ของตัวเองใน IndexedDB)
            urlPattern: /^https:\/\/(firestore|identitytoolkit|securetoken)\.googleapis\.com\/.*/i,
            handler: 'NetworkOnly',
          },
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
    // Vite 8 / Rolldown ตัด object-form `manualChunks` ออก → ใช้ function form (ยังรองรับผ่าน
    // compat layer). กลุ่ม vendor-* เหมือนเดิมทุกประการ. id ใช้ POSIX slash เสมอแม้บน Windows.
    // (เมื่อ Vite ตัด function manualChunks ในอนาคต → ย้ายไป output.codeSplitting)
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (!id.includes('/node_modules/')) return;
          // Heavy Libraries (PDF Printing) — เช็คก่อน react กัน "react-to-print" หลุดเข้า vendor-react
          if (/\/node_modules\/react-to-print\//.test(id)) return 'vendor-print';
          // Core React (+ scheduler runtime)
          if (/\/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'vendor-react';
          // UI Libraries (Icons, HeadlessUI)
          if (/\/node_modules\/(@headlessui\/react|lucide-react)\//.test(id)) return 'vendor-ui';
          // State Management & Utils
          if (/\/node_modules\/(zustand|zundo|clsx|tailwind-merge)\//.test(id)) return 'vendor-utils';
          // Firebase (cloud sync) — แยกก้อน: โหลดคู่ขนาน + cache ดี, ไม่ทำให้ main bundle บวม
          if (/\/node_modules\/@?firebase\//.test(id)) return 'vendor-firebase';
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
}));
