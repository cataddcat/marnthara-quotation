// src/lib/firebase/app.ts
// ────────────────────────────────────────────────────────────────────────────
// Firebase init (guarded) — ออนไลน์ + ซิงค์หลายอุปกรณ์
//
// ปรัชญา: ถ้า env ไม่ครบ → ไม่ init เลย (db/auth = null) → แอปทำงานแบบ "local-only"
// (พฤติกรรมเดิม 100%, ไม่พังตอน build/CI/ออฟไลน์ก่อนตั้งค่า). ตั้ง env เมื่อไรค่อยเปิด cloud
//
// Firestore เปิด persistentLocalCache (IndexedDB) → อ่าน/เขียนได้ขณะออฟไลน์ + sync เองเมื่อกลับมา
// multi-tab manager → เปิดหลายแท็บบนเดสก์ท็อปไม่ชนกัน
// ────────────────────────────────────────────────────────────────────────────

import { initializeApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';

const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

/** ตั้งค่า Firebase ครบหรือยัง — เกณฑ์: apiKey + projectId + appId */
export const isFirebaseConfigured: boolean = Boolean(cfg.apiKey && cfg.projectId && cfg.appId);

let dbInstance: Firestore | null = null;
let authInstance: Auth | null = null;

if (isFirebaseConfigured) {
  const app = initializeApp({
    apiKey: cfg.apiKey,
    authDomain: cfg.authDomain,
    projectId: cfg.projectId,
    storageBucket: cfg.storageBucket,
    messagingSenderId: cfg.messagingSenderId,
    appId: cfg.appId,
  });
  dbInstance = initializeFirestore(app, {
    // item data มีฟิลด์ undefined ได้บ่อย — กัน setDoc throw (เก็บ bundle เป็น JSON string อยู่แล้ว
    // แต่ customers เก็บแบบ structured จึงต้องเปิดตัวนี้)
    ignoreUndefinedProperties: true,
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
  authInstance = getAuth(app);
}

/** Firestore instance — null ถ้ายังไม่ตั้งค่า (local-only mode) */
export const db = dbInstance;
/** Auth instance — null ถ้ายังไม่ตั้งค่า */
export const auth = authInstance;
