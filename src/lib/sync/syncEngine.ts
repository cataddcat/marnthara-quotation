// src/lib/sync/syncEngine.ts
// ════════════════════════════════════════════════════════════════════════════
// หัวใจ cloud sync — Firestore ↔ Zustand mirror (จาก App effect ตามสถานะ auth)
// ────────────────────────────────────────────────────────────────────────────
// • เก็บงานเป็น "JSON string ต่อ doc" → เลี่ยงข้อจำกัด Firestore (nested array / undefined)
//   ลูกค้าเก็บแบบ structured (flat) + ignoreUndefinedProperties
// • onSnapshot → ป้อน mirror (setJobsMirror / setCustomerRegistryMirror) แบบ realtime
// • reconcile ครั้งแรก: รวม local ↔ cloud โดย updatedAt (ดัน local-ใหม่กว่า/local-only ขึ้น cloud)
//   = "first sign-in adopt" + กัน stale ทับของใหม่
// • auto-save: live edit (debounce 800ms) → saveCurrentJob → push
// • conflict (single-owner): mirror = cloud truth; live ของงานที่เปิดอยู่ไม่ถูกทับ (push ทับเมื่อเซฟ)
// ════════════════════════════════════════════════════════════════════════════

import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  type Unsubscribe,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/app';
import { useAppStore } from '@/store/useAppStore';
import type { JobBundle } from '@/lib/job-bundle';
import type { RegistryCustomer } from '@/lib/customers/contract';
import { normalizeCode } from '@/lib/codes';
import { newUuid } from '@/lib/id';
import { setJobSyncBridge, resetJobSyncBridge } from '@/lib/sync/jobSyncBridge';
import { setCustomerSyncBridge, resetCustomerSyncBridge } from '@/lib/sync/customerSyncBridge';

// ── Firestore refs ───────────────────────────────────────────────────────────
const jobsCol = (uid: string) => collection(db!, 'shops', uid, 'jobs');
const jobRef = (uid: string, id: string) => doc(db!, 'shops', uid, 'jobs', id);
const customersCol = (uid: string) => collection(db!, 'shops', uid, 'customers');
const customerRef = (uid: string, code: string) =>
  doc(db!, 'shops', uid, 'customers', normalizeCode(code));

// ── serialize / parse ────────────────────────────────────────────────────────
const bundleToDoc = (b: JobBundle): DocumentData => ({
  id: b.id,
  customerName: b.customer.name ?? '',
  customerCode: b.customerCode ?? null,
  status: b.status,
  updatedAt: b.updatedAt,
  data: JSON.stringify(b), // ทั้งก้อนเป็น string — เลี่ยงข้อจำกัดชนิดข้อมูล Firestore
});

const docToBundle = (data: DocumentData): JobBundle | null => {
  if (typeof data.data !== 'string') return null;
  try {
    return JSON.parse(data.data) as JobBundle;
  } catch {
    return null;
  }
};

const docToCustomer = (data: DocumentData): RegistryCustomer | null => {
  if (typeof data.code !== 'string' || typeof data.name !== 'string') return null;
  return {
    id: typeof data.id === 'string' ? data.id : newUuid(),
    code: data.code,
    name: data.name,
    phone: data.phone,
    address: data.address,
    taxId: data.taxId,
    installationAddress: data.installationAddress,
    note: data.note,
    updated_at: data.updated_at,
  };
};

const pushJobDoc = (uid: string, b: JobBundle) =>
  setDoc(jobRef(uid, b.id), bundleToDoc(b)).catch((e) => console.error('pushJob', e));
const deleteJobDoc = (uid: string, id: string) =>
  deleteDoc(jobRef(uid, id)).catch((e) => console.error('deleteJob', e));
const pushCustomerDoc = (uid: string, c: RegistryCustomer) =>
  setDoc(customerRef(uid, c.code), c).catch((e) => console.error('pushCustomer', e));
const deleteCustomerDoc = (uid: string, code: string) =>
  deleteDoc(customerRef(uid, code)).catch((e) => console.error('deleteCustomer', e));

// ── lifecycle state ──────────────────────────────────────────────────────────
let unsubJobs: Unsubscribe | null = null;
let unsubCustomers: Unsubscribe | null = null;
let unsubAutoSave: (() => void) | null = null;
let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
let activeUid: string | null = null;

const scheduleAutoSave = () => {
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    autoSaveTimer = null;
    useAppStore.getState().saveCurrentJob();
  }, 800);
};

/** เริ่ม sync เมื่อ sign-in (idempotent — เรียกซ้ำ uid เดิม = no-op) */
export function startSync(uid: string): void {
  if (!db || activeUid === uid) return;
  if (activeUid) stopSync();
  activeUid = uid;

  // เก็บงานปัจจุบันลงชั้นวางก่อน reconcile (จะได้ถูกรวม/ดันขึ้น cloud)
  useAppStore.getState().saveCurrentJob();

  // bridges: mutation ของ JobsSlice/Registry → Firestore
  setJobSyncBridge({
    pushJob: (b) => void pushJobDoc(uid, b),
    deleteJobRemote: (id) => void deleteJobDoc(uid, id),
  });
  setCustomerSyncBridge({
    pushCustomer: (c) => void pushCustomerDoc(uid, c),
    pushCustomers: (cs) => cs.forEach((c) => void pushCustomerDoc(uid, c)),
    deleteCustomerRemote: (code) => void deleteCustomerDoc(uid, code),
  });

  // ── jobs: realtime + reconcile ครั้งแรก ──
  let jobsReconciled = false;
  unsubJobs = onSnapshot(jobsCol(uid), (snap) => {
    const cloud = new Map<string, JobBundle>();
    snap.forEach((d) => {
      const b = docToBundle(d.data());
      if (b) cloud.set(b.id, b);
    });
    if (!jobsReconciled) {
      jobsReconciled = true;
      for (const lb of useAppStore.getState().jobs) {
        const cb = cloud.get(lb.id);
        if (!cb || lb.updatedAt > cb.updatedAt) {
          cloud.set(lb.id, lb);
          void pushJobDoc(uid, lb); // local-only / local-ใหม่กว่า → ดันขึ้น
        }
      }
    }
    useAppStore.getState().setJobsMirror([...cloud.values()]);
  });

  // ── customers: realtime + reconcile ครั้งแรก ──
  let custReconciled = false;
  unsubCustomers = onSnapshot(customersCol(uid), (snap) => {
    const cloud = new Map<string, RegistryCustomer>();
    snap.forEach((d) => {
      const c = docToCustomer(d.data());
      if (c) cloud.set(normalizeCode(c.code), c);
    });
    if (!custReconciled) {
      custReconciled = true;
      for (const lc of useAppStore.getState().customerRegistry) {
        const key = normalizeCode(lc.code);
        if (!cloud.has(key)) {
          cloud.set(key, lc);
          void pushCustomerDoc(uid, lc);
        }
      }
    }
    useAppStore.getState().setCustomerRegistryMirror([...cloud.values()]);
  });

  // ── auto-save: live edit → debounce → saveCurrentJob (push) ──
  unsubAutoSave = useAppStore.subscribe((state, prev) => {
    if (
      state.rooms === prev.rooms &&
      state.customer === prev.customer &&
      state.discount === prev.discount &&
      state.receipts === prev.receipts &&
      state.expenses === prev.expenses &&
      state.jobStatus === prev.jobStatus
    ) {
      return;
    }
    scheduleAutoSave();
  });
}

/** หยุด sync เมื่อ sign-out — unsub + คืน bridge เป็น no-op (กลับสู่ local-only) */
export function stopSync(): void {
  unsubJobs?.();
  unsubCustomers?.();
  unsubAutoSave?.();
  unsubJobs = unsubCustomers = unsubAutoSave = null;
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = null;
  }
  resetJobSyncBridge();
  resetCustomerSyncBridge();
  activeUid = null;
}
