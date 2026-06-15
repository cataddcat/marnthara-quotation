// src/lib/sync/securityBridge.ts
// ────────────────────────────────────────────────────────────────────────────
// สะพานระหว่าง useRoleStore (store) ↔ syncEngine (Firestore) — decouple ให้ store ไม่รู้จัก Firestore
// ก่อนต่อ cloud / local-only: เป็น no-op. เมื่อ syncEngine พร้อม → setSecuritySyncBridge(impl จริง)
// ค่าความปลอดภัยระดับร้าน: shops/{uid}/settings/security = { guardEnabled, adminPinHash }
// ────────────────────────────────────────────────────────────────────────────

export interface SecurityPayload {
  guardEnabled: boolean;
  adminPinHash: string;
}

export interface SecuritySyncBridge {
  /** ดันค่าความปลอดภัยขึ้น cloud (admin ตั้ง/เปลี่ยน/ปิด PIN) */
  pushSecurity: (payload: SecurityPayload) => void;
}

const NOOP: SecuritySyncBridge = {
  pushSecurity: () => {},
};

let bridge: SecuritySyncBridge = NOOP;

export const setSecuritySyncBridge = (impl: SecuritySyncBridge): void => {
  bridge = impl;
};

export const resetSecuritySyncBridge = (): void => {
  bridge = NOOP;
};

/** ใช้ใน useRoleStore: securitySync().pushSecurity(payload) */
export const securitySync = (): SecuritySyncBridge => bridge;
