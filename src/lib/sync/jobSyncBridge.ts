// src/lib/sync/jobSyncBridge.ts
// ────────────────────────────────────────────────────────────────────────────
// สะพานระหว่าง JobsSlice (store) ↔ syncEngine (Firestore) — decouple ให้ slice ไม่รู้จัก Firestore
// ก่อนต่อ cloud: เป็น no-op (เฟส local-first). เมื่อ syncEngine พร้อม → setJobSyncBridge(impl จริง)
// ไฟล์นี้ import แค่ type (ไม่ผูก store/Firestore)
// ────────────────────────────────────────────────────────────────────────────

import type { JobBundle } from '@/lib/jobs/job-bundle';

export interface JobSyncBridge {
  /** ดันงานขึ้น cloud (debounce ภายใน impl) */
  pushJob: (bundle: JobBundle) => void;
  /** ลบงานบน cloud */
  deleteJobRemote: (id: string) => void;
}

const NOOP: JobSyncBridge = {
  pushJob: () => {},
  deleteJobRemote: () => {},
};

let bridge: JobSyncBridge = NOOP;

export const setJobSyncBridge = (impl: JobSyncBridge): void => {
  bridge = impl;
};

export const resetJobSyncBridge = (): void => {
  bridge = NOOP;
};

/** ใช้ใน JobsSlice: jobSync().pushJob(bundle) */
export const jobSync = (): JobSyncBridge => bridge;
