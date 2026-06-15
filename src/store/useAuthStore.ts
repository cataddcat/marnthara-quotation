// src/store/useAuthStore.ts
// ────────────────────────────────────────────────────────────────────────────
// บัญชีร้าน (Firebase Auth, email/password) — บัญชีเดียวใช้หลายอุปกรณ์ (shopId = uid)
// แยกจาก useAppStore โดยตั้งใจ (auth เป็น cross-cutting, ไม่ควร persist ปนข้อมูลงาน)
//
// ไม่ตั้งค่า Firebase → status='disabled' (local-only) → ทุก action เป็น no-op ปลอดภัย
// ────────────────────────────────────────────────────────────────────────────

import { create } from 'zustand';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  type User,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '@/lib/firebase/app';

export type AuthStatus = 'loading' | 'signed-in' | 'signed-out' | 'disabled';

interface AuthState {
  status: AuthStatus;
  uid: string | null;
  email: string | null;
  error: string | null;
  busy: boolean;

  /** subscribe onAuthStateChanged — เรียกครั้งเดียวตอน boot */
  init: () => void;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string) => Promise<boolean>;
  /** ส่งอีเมลรีเซ็ตรหัสผ่าน — คืน true ถ้าส่งสำเร็จ */
  resetPassword: (email: string) => Promise<boolean>;
  signOutUser: () => Promise<void>;
  clearError: () => void;
}

let subscribed = false;

export const useAuthStore = create<AuthState>((set) => ({
  status: isFirebaseConfigured ? 'loading' : 'disabled',
  uid: null,
  email: null,
  error: null,
  busy: false,

  init: () => {
    if (subscribed || !auth) return;
    subscribed = true;
    onAuthStateChanged(auth, (user: User | null) => {
      if (user) {
        set({ status: 'signed-in', uid: user.uid, email: user.email, error: null });
      } else {
        set({ status: 'signed-out', uid: null, email: null });
      }
    });
  },

  signIn: async (email, password) => {
    if (!auth) return false;
    set({ busy: true, error: null });
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      set({ busy: false });
      return true;
    } catch (e) {
      set({ busy: false, error: authErrorMessage(e) });
      return false;
    }
  },

  signUp: async (email, password) => {
    if (!auth) return false;
    set({ busy: true, error: null });
    try {
      await createUserWithEmailAndPassword(auth, email.trim(), password);
      set({ busy: false });
      return true;
    } catch (e) {
      set({ busy: false, error: authErrorMessage(e) });
      return false;
    }
  },

  resetPassword: async (email) => {
    if (!auth) return false;
    set({ busy: true, error: null });
    try {
      await sendPasswordResetEmail(auth, email.trim());
      set({ busy: false });
      return true;
    } catch (e) {
      set({ busy: false, error: authErrorMessage(e) });
      return false;
    }
  },

  signOutUser: async () => {
    if (!auth) return;
    await signOut(auth);
  },

  clearError: () => set({ error: null }),
}));

/** แปลง error code ของ Firebase Auth → ข้อความไทยที่ผู้ใช้เข้าใจ */
function authErrorMessage(e: unknown): string {
  const code = (e as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/invalid-email':
      return 'อีเมลไม่ถูกต้อง';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
    case 'auth/email-already-in-use':
      return 'อีเมลนี้ถูกใช้แล้ว';
    case 'auth/weak-password':
      return 'รหัสผ่านสั้นเกินไป (อย่างน้อย 6 ตัว)';
    case 'auth/network-request-failed':
      return 'เชื่อมต่อเครือข่ายไม่ได้';
    case 'auth/too-many-requests':
      return 'ลองผิดหลายครั้ง — รอสักครู่แล้วลองใหม่';
    default:
      return 'เข้าสู่ระบบไม่สำเร็จ';
  }
}
