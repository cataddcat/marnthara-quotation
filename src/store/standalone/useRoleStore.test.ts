// src/store/standalone/useRoleStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useRoleStore, deriveRole } from '@/store/standalone/useRoleStore';

const reset = () =>
  useRoleStore.setState({ unlocked: false, guardEnabled: false, adminPinHash: '' });
const s = () => useRoleStore.getState();

describe('deriveRole (pure)', () => {
  it('guard ปิด → admin เสมอ (ไม่สน unlocked)', () => {
    expect(deriveRole({ guardEnabled: false, unlocked: false })).toBe('admin');
    expect(deriveRole({ guardEnabled: false, unlocked: true })).toBe('admin');
  });
  it('guard เปิด → staff ถ้ายังไม่ปลด, admin ถ้าปลดแล้ว', () => {
    expect(deriveRole({ guardEnabled: true, unlocked: false })).toBe('staff');
    expect(deriveRole({ guardEnabled: true, unlocked: true })).toBe('admin');
  });
});

describe('useRoleStore', () => {
  beforeEach(reset);

  it('applyPin → เปิดการ์ด + เก็บ hash + ปลดล็อกเครื่องนี้', () => {
    s().applyPin('HASH');
    expect(s().guardEnabled).toBe(true);
    expect(s().adminPinHash).toBe('HASH');
    expect(s().unlocked).toBe(true);
    expect(deriveRole(s())).toBe('admin');
  });

  it('setSecurityMirror (จาก cloud) + เครื่องยังไม่ปลด → staff', () => {
    s().setSecurityMirror({ guardEnabled: true, adminPinHash: 'HASH' });
    expect(s().unlocked).toBe(false); // mirror ไม่แตะ unlocked
    expect(deriveRole(s())).toBe('staff');
  });

  it('lock/unlock เครื่อง (setUnlocked) สลับ admin↔staff เมื่อ guard เปิด', () => {
    s().setSecurityMirror({ guardEnabled: true, adminPinHash: 'HASH' });
    s().setUnlocked(true);
    expect(deriveRole(s())).toBe('admin');
    s().setUnlocked(false);
    expect(deriveRole(s())).toBe('staff');
  });

  it('disableGuard → ปิดการ์ด + ล้าง hash → admin', () => {
    s().applyPin('HASH');
    s().disableGuard();
    expect(s().guardEnabled).toBe(false);
    expect(s().adminPinHash).toBe('');
    expect(deriveRole(s())).toBe('admin');
  });
});
