// src/store/useAuthStore.test.ts
// ไม่ตั้งค่า Firebase ใน test env → auth=null → status 'disabled', action เป็น no-op ปลอดภัย
import { describe, it, expect } from 'vitest';
import { useAuthStore } from '@/store/useAuthStore';

describe('useAuthStore — guarded (Firebase ไม่ตั้งค่า)', () => {
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
