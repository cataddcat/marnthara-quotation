/// <reference types="vite/client" />

// Firebase config (cloud sync) — เว้นว่างได้: ถ้าไม่ตั้ง แอปจะทำงานแบบ local-only
interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  // เปิดให้สมัครบัญชีใหม่ในแอป ('true' เท่านั้น). default ปิด — สร้างบัญชีร้านผ่าน Firebase Console
  readonly VITE_ALLOW_SIGNUP?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// เวอร์ชัน footer ที่ Vite `define` ฉีดตอน build (git-derived: "วันที่ · short SHA") — ดู vite.config.ts
declare const __APP_VERSION__: string;
