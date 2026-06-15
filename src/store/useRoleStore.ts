// src/store/useRoleStore.ts
// ────────────────────────────────────────────────────────────────────────────
// บทบาทในบัญชีร่วม (admin / พนักงาน) — "การ์ดกันงานพัง" บนบัญชีร้านที่ใช้ร่วมกัน
//
// แม่แบบ: useExperienceStore (persist ต่ออุปกรณ์). แยกจาก useAppStore โดยตั้งใจ —
// บทบาทเป็น cross-cutting + ต่ออุปกรณ์ ไม่ควร sync/persist ปนข้อมูลงาน หรือเข้า undo.
//
// 2 ชั้น:
//  • ค่าระดับร้าน (sync ข้ามอุปกรณ์ผ่าน syncEngine): guardEnabled + adminPinHash
//  • สถานะต่ออุปกรณ์ (local เท่านั้น): unlocked = เครื่องนี้ปลดเป็น admin อยู่ไหม
// บทบาทผลลัพธ์ = deriveRole(). เครื่องใหม่ที่ร้านเปิดการ์ด → staff อัตโนมัติ (unlocked=false).
// ────────────────────────────────────────────────────────────────────────────

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { securitySync } from '@/lib/sync/securityBridge';

export type Role = 'admin' | 'staff';

interface RoleState {
  /** เครื่องนี้ปลดเป็น admin อยู่ไหม (ต่ออุปกรณ์, ไม่ sync) */
  unlocked: boolean;
  /** ร้านเปิดการ์ดไหม (mirror จาก cloud / local) */
  guardEnabled: boolean;
  /** hash ของ PIN ผู้ดูแล (mirror จาก cloud / local) */
  adminPinHash: string;

  /** ปลด/ล็อกเครื่องนี้ (หลัง verify PIN ในเลเยอร์ hook) */
  setUnlocked: (v: boolean) => void;
  /** ป้อนค่าจาก Firestore snapshot — ไม่ push กลับ (กัน echo) */
  setSecurityMirror: (s: { guardEnabled: boolean; adminPinHash: string }) => void;
  /** admin ตั้ง/เปลี่ยน PIN: เปิดการ์ด + เก็บ hash + ปลดล็อกเครื่องนี้ + push cloud */
  applyPin: (hash: string) => void;
  /** ปิดการ์ด (เอา PIN ออก) + push cloud — เครื่องนี้เป็น admin ต่อ */
  disableGuard: () => void;
}

export const useRoleStore = create<RoleState>()(
  persist(
    (set) => ({
      unlocked: false,
      guardEnabled: false,
      adminPinHash: '',

      setUnlocked: (v) => set({ unlocked: v }),
      setSecurityMirror: ({ guardEnabled, adminPinHash }) => set({ guardEnabled, adminPinHash }),
      applyPin: (hash) => {
        set({ guardEnabled: true, adminPinHash: hash, unlocked: true });
        securitySync().pushSecurity({ guardEnabled: true, adminPinHash: hash });
      },
      disableGuard: () => {
        set({ guardEnabled: false, adminPinHash: '', unlocked: true });
        securitySync().pushSecurity({ guardEnabled: false, adminPinHash: '' });
      },
    }),
    {
      name: 'marnthara-role',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

/** บทบาทผลลัพธ์ (pure) — guard ปิด = admin เสมอ (พฤติกรรมเดิม) */
export const deriveRole = (s: { guardEnabled: boolean; unlocked: boolean }): Role =>
  s.guardEnabled ? (s.unlocked ? 'admin' : 'staff') : 'admin';
