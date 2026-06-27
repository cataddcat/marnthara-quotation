// src/store/standalone/useSyncStore.ts
// ────────────────────────────────────────────────────────────────────────────
// สถานะซิงค์ (online / รอซิงค์ / ซิงค์แล้ว) — สำคัญมากบน iOS PWA offline
// แยกจาก useAppStore: อัปเดตบ่อย (metadata snapshot) + ไม่ต้อง persist/undo
//
// ป้อนโดย syncEngine (Firestore metadata: fromCache / hasPendingWrites) + window online/offline
// 'disabled' = ยังไม่ sign-in / ไม่ตั้งค่า Firebase (ซ่อน UI สถานะ)
// ────────────────────────────────────────────────────────────────────────────

import { create } from 'zustand';

export type SyncStatus = 'disabled' | 'offline' | 'pending' | 'synced';

const computeStatus = (
  active: boolean,
  online: boolean,
  fromCache: boolean,
  pending: number
): SyncStatus => {
  if (!active) return 'disabled';
  if (pending > 0) return 'pending'; // มีงานยังไม่ขึ้น cloud (UI แยกคำตาม online)
  if (!online || fromCache) return 'offline';
  return 'synced';
};

interface SyncState {
  active: boolean;
  online: boolean;
  fromCache: boolean;
  pending: number; // จำนวนงานที่ยังไม่ ack จาก server
  lastSyncedAt: string | null;
  status: SyncStatus;

  start: () => void;
  stop: () => void;
  setOnline: (online: boolean) => void;
  setSnapshot: (fromCache: boolean, pending: number) => void;
}

export const useSyncStore = create<SyncState>((set, get) => {
  const recompute = (patch: Partial<SyncState>): Partial<SyncState> => {
    const s = { ...get(), ...patch };
    return { ...patch, status: computeStatus(s.active, s.online, s.fromCache, s.pending) };
  };
  return {
    active: false,
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,
    fromCache: false,
    pending: 0,
    lastSyncedAt: null,
    status: 'disabled',

    start: () => set(recompute({ active: true })),
    stop: () =>
      set({ active: false, fromCache: false, pending: 0, status: 'disabled' }),
    setOnline: (online) => set(recompute({ online })),
    setSnapshot: (fromCache, pending) =>
      set(recompute({ fromCache, pending, lastSyncedAt: fromCache ? get().lastSyncedAt : new Date().toISOString() })),
  };
});
