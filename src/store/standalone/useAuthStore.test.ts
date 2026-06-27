// src/store/standalone/useAuthStore.test.ts
// mock firebase/app ให้ auth=null เสมอ → เทสต์ guarded path ได้ deterministic
// (ไม่ขึ้นกับว่ามี .env จริงในเครื่องไหม — vitest โหลด .env ทำให้ isFirebaseConfigured เพี้ยนได้)
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/firebase/app', () => ({
  auth: null,
  db: null,
  isFirebaseConfigured: false,
}));

import { useAuthStore } from '@/store/standalone/useAuthStore';

describe('useAuthStore — guarded (auth=null)', () => {
  it('status = disabled', () => {
    expect(useAuthStore.getState().status).toBe('disabled');
  });

  it('signIn/signUp/resetPassword คืน false โดยไม่ crash เมื่อ auth=null', async () => {
    const s = useAuthStore.getState();
    expect(await s.signIn('a@b.com', '123456')).toBe(false);
    expect(await s.signUp('a@b.com', '123456')).toBe(false);
    expect(await s.resetPassword('a@b.com')).toBe(false);
  });

  it('init() ไม่ throw เมื่อไม่มี auth', () => {
    expect(() => useAuthStore.getState().init()).not.toThrow();
  });
});
