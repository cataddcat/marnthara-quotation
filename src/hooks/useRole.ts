// src/hooks/useRole.ts
// Single source of truth ของบทบาทปัจจุบัน (admin / พนักงาน) — รวม useRoleStore + pin hashing
// เป็น API เดียวให้ UI ใช้: เช็คบทบาท + ปลด/ล็อก + ตั้ง/ปิด PIN

import { useRoleStore, deriveRole, type Role } from '@/store/standalone/useRoleStore';
import { hashPin, verifyPin } from '@/lib/security/pin';

export interface UseRoleResult {
  role: Role;
  isAdmin: boolean;
  isStaff: boolean;
  /** ร้านเปิดการ์ดอยู่ไหม */
  guardEnabled: boolean;
  /** มี PIN ตั้งไว้แล้วไหม */
  hasPin: boolean;
  /** ใส่ PIN ปลดล็อกเครื่องนี้เป็นผู้ดูแล — คืน true ถ้าถูก */
  unlock: (pin: string) => Promise<boolean>;
  /** ล็อกกลับเป็นพนักงาน (เครื่องนี้) */
  lock: () => void;
  /** admin ตั้ง/เปลี่ยน PIN (เปิดการ์ด + ปลดล็อกเครื่องนี้) */
  setPin: (pin: string) => Promise<void>;
  /** ปิดการ์ด (ต้อง verify PIN เดิมก่อนในเลเยอร์ UI) */
  disableGuard: () => void;
}

export const useRole = (): UseRoleResult => {
  const unlocked = useRoleStore((s) => s.unlocked);
  const guardEnabled = useRoleStore((s) => s.guardEnabled);
  const adminPinHash = useRoleStore((s) => s.adminPinHash);

  const role = deriveRole({ guardEnabled, unlocked });

  return {
    role,
    isAdmin: role === 'admin',
    isStaff: role === 'staff',
    guardEnabled,
    hasPin: Boolean(adminPinHash),
    unlock: async (pin) => {
      const ok = await verifyPin(pin, useRoleStore.getState().adminPinHash);
      if (ok) useRoleStore.getState().setUnlocked(true);
      return ok;
    },
    lock: () => useRoleStore.getState().setUnlocked(false),
    setPin: async (pin) => {
      const hash = await hashPin(pin);
      useRoleStore.getState().applyPin(hash);
    },
    disableGuard: () => useRoleStore.getState().disableGuard(),
  };
};
