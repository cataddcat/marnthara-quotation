import { StateCreator } from 'zustand';
import { AppState } from '../useAppStore';
import {
  type JobBundle,
  type JobLiveFields,
  extractJobBundle,
  bundleToLiveFields,
  blankJob,
  isBundleEmpty,
  customerFromRegistry,
} from '@/lib/job-bundle';
import { type JobStatusKey, DEFAULT_JOB_STATUS } from '@/config/enums';
import { clearUndoHistory } from '../temporalBridge';
import { jobSync } from '@/lib/sync/jobSyncBridge';
import { suppressNextLiveSync } from '@/lib/sync/syncFlags';
import { newUuid } from '@/lib/id';

// ─────────────────────────────────────────────────────────────────────────────
// JobsSlice — "ชั้นวางงาน" (registry) + checkout model
//
// งาน active ยัง live ใน field เดิม (rooms/customer/discount/receipts/expenses + jobStatus)
// → ทั้งแอปอ่านจากตรงนั้นเหมือนเดิม. slice นี้แค่ save/load JobBundle เข้า-ออก field เหล่านั้น
// แล้วเก็บสำเนางานอื่น ๆ ใน jobs[]. ดัน/ลบขึ้น cloud ผ่าน jobSync() (no-op จนกว่า syncEngine จะต่อ)
// ─────────────────────────────────────────────────────────────────────────────

/** ลูกค้าจากทะเบียน (โครงขั้นต่ำที่ createJob ใช้ autofill) — เลี่ยง forward-dep กับ Registry slice */
export interface JobCustomerSeed {
  code: string;
  name: string;
  phone?: string;
  address?: string;
  taxId?: string;
  installationAddress?: string;
}

export interface JobsSlice {
  jobs: JobBundle[];
  currentJobId: string | null;
  jobStatus: JobStatusKey;

  // ── conflict guard (sync) ──
  /** updatedAt ของงานที่เปิดอยู่ตอนโหลดเข้า live — ฐานเทียบว่า cloud ใหม่กว่าไหม */
  activeBaseUpdatedAt: string;
  /** ผู้ใช้แก้งานที่เปิดอยู่แต่ยังไม่ได้ push ขึ้น cloud */
  activeDirty: boolean;
  /** งานที่เปิดอยู่ถูกแก้จากอีกเครื่องขณะมี edit ค้าง — เวอร์ชัน remote รอให้เลือก */
  conflict: JobBundle | null;

  /** เก็บงานปัจจุบัน (live → jobs[] + push cloud); no-op ถ้างานเปล่า */
  saveCurrentJob: () => void;
  /** สลับไปงานอื่น: เก็บงานปัจจุบันก่อน แล้ว load เป้าหมายเข้า live + ล้าง undo */
  switchJob: (id: string) => void;
  /** เปิดงานใหม่ (เปล่า หรือ autofill จากลูกค้าในทะเบียน) */
  createJob: (fromCustomer?: JobCustomerSeed) => void;
  /** ลบงาน; ถ้าลบงานปัจจุบัน → สลับไปงานล่าสุด/เปล่า */
  deleteJob: (id: string) => void;
  /** ตั้งสถานะงาน (default = งานปัจจุบัน; ส่ง id เพื่อตั้งของงานอื่นในลิสต์ได้) */
  setJobStatus: (status: JobStatusKey, id?: string) => void;

  /** sync engine ป้อน mirror เข้ามา (replace jobs[] ทั้งก้อนจาก snapshot) */
  setJobsMirror: (jobs: JobBundle[]) => void;

  /** ติดธงว่าผู้ใช้แก้งานที่เปิดอยู่ (เรียกจาก auto-save subscription) */
  markActiveDirty: () => void;
  /** โหลด remote เข้า live เงียบ ๆ (ไม่มี edit ค้าง / หรือหลังเลือก "โหลดล่าสุด") */
  applyRemoteToActive: (remote: JobBundle) => void;
  /** ตั้ง/ล้าง conflict */
  setConflict: (remote: JobBundle | null) => void;
  /** เลือกตอนชน: 'load' โหลดล่าสุด (เก็บของฉันเป็นสำเนา) · 'keep' เก็บของฉัน (เก็บ remote เป็นสำเนา) */
  resolveConflict: (choice: 'load' | 'keep') => void;
}

/** สร้างสำเนาเก็บกันชน (id ใหม่ + ป้ายต่อท้ายชื่อ) — ใช้ตอน resolveConflict ให้ "ไม่มีของหาย" */
const stashCopy = (bundle: JobBundle, label: string): JobBundle => {
  const newId = newUuid();
  const now = new Date().toISOString();
  return {
    ...bundle,
    id: newId,
    customer: { ...bundle.customer, id: newId, name: `${bundle.customer.name || 'งาน'} (${label})` },
    createdAt: now,
    updatedAt: now,
  };
};

/** หยิบเฉพาะ field ที่ประกอบเป็นงานหนึ่งก้อนจาก state */
const pickLive = (s: AppState): JobLiveFields => ({
  customer: s.customer,
  rooms: s.rooms,
  discount: s.discount,
  receipts: s.receipts,
  expenses: s.expenses,
  jobStatus: s.jobStatus,
});

export const createJobsSlice: StateCreator<
  AppState,
  [['zustand/persist', unknown], ['temporal', unknown]],
  [],
  JobsSlice
> = (set, get) => ({
  jobs: [],
  currentJobId: null,
  jobStatus: DEFAULT_JOB_STATUS,
  activeBaseUpdatedAt: '',
  activeDirty: false,
  conflict: null,

  saveCurrentJob: () => {
    // id งานนิ่ง: ensureCustomerIdentity เติม customer.id ถ้ายังไม่มี
    const { id } = get().ensureCustomerIdentity();
    const bundle = extractJobBundle(pickLive(get()));
    bundle.id = id;
    if (isBundleEmpty(bundle)) return; // งานเปล่า — ไม่เก็บ/ไม่ดัน

    const existing = get().jobs.find((j) => j.id === id);
    // คง createdAt เดิมตอน upsert ทับ (updatedAt = now จาก extract)
    const merged: JobBundle = existing ? { ...bundle, createdAt: existing.createdAt } : bundle;

    set((state) => ({
      jobs: existing
        ? state.jobs.map((j) => (j.id === id ? merged : j))
        : [...state.jobs, merged],
      currentJobId: id,
      // เซฟแล้ว = ฐานใหม่ + ไม่ dirty (กัน conflict false-positive ของ write ตัวเอง)
      activeBaseUpdatedAt: merged.updatedAt,
      activeDirty: false,
    }));
    jobSync().pushJob(merged);
  },

  switchJob: (id) => {
    if (id === get().currentJobId) return;
    get().saveCurrentJob(); // กันแก้งานปัจจุบันหาย
    const target = get().jobs.find((j) => j.id === id);
    if (!target) return;
    suppressNextLiveSync();
    set(() => ({
      ...bundleToLiveFields(target),
      currentJobId: id,
      activeBaseUpdatedAt: target.updatedAt,
      activeDirty: false,
      conflict: null,
    }));
    clearUndoHistory();
  },

  createJob: (fromCustomer) => {
    get().saveCurrentJob();
    const fresh = blankJob();
    if (fromCustomer) {
      const cust = customerFromRegistry(fromCustomer);
      fresh.customer = cust;
      fresh.id = cust.id as string;
      fresh.customerCode = fromCustomer.code;
    }
    suppressNextLiveSync();
    set(() => ({
      ...bundleToLiveFields(fresh),
      currentJobId: fresh.id,
      activeBaseUpdatedAt: fresh.updatedAt,
      activeDirty: false,
      conflict: null,
    }));
    clearUndoHistory();
    // ถ้ามาจากลูกค้า (มีชื่อ) → เก็บลงชั้นวางทันที; งานเปล่า → no-op
    get().saveCurrentJob();
  },

  deleteJob: (id) => {
    const isCurrent = get().currentJobId === id;
    set((state) => ({ jobs: state.jobs.filter((j) => j.id !== id) }));
    jobSync().deleteJobRemote(id);
    if (!isCurrent) return;
    // ลบงานที่เปิดอยู่ → สลับไปงานล่าสุด หรือเริ่มงานเปล่า
    const next = get().jobs[get().jobs.length - 1];
    const target = next ?? blankJob();
    suppressNextLiveSync();
    set(() => ({
      ...bundleToLiveFields(target),
      currentJobId: target.id,
      activeBaseUpdatedAt: target.updatedAt,
      activeDirty: false,
      conflict: null,
    }));
    clearUndoHistory();
  },

  setJobStatus: (status, id) => {
    const targetId = id ?? get().currentJobId;
    if (!targetId) return;
    const now = new Date().toISOString();
    set((state) => ({
      // อัปเดต live status เฉพาะเมื่อแก้สถานะของงานที่เปิดอยู่
      jobStatus: targetId === state.currentJobId ? status : state.jobStatus,
      jobs: state.jobs.map((j) => (j.id === targetId ? { ...j, status, updatedAt: now } : j)),
    }));
    const updated = get().jobs.find((j) => j.id === targetId);
    if (updated) {
      jobSync().pushJob(updated);
    } else if (targetId === get().currentJobId) {
      // งานปัจจุบันยังไม่อยู่ในชั้นวาง (เพิ่งสร้าง) → เก็บลงพร้อมสถานะใหม่
      get().saveCurrentJob();
    }
  },

  setJobsMirror: (jobs) => set(() => ({ jobs })),

  markActiveDirty: () => {
    if (!get().activeDirty) set(() => ({ activeDirty: true }));
  },

  applyRemoteToActive: (remote) => {
    suppressNextLiveSync();
    set((state) => ({
      ...bundleToLiveFields(remote),
      currentJobId: remote.id,
      activeBaseUpdatedAt: remote.updatedAt,
      activeDirty: false,
      conflict: null,
      jobs: state.jobs.map((j) => (j.id === remote.id ? remote : j)),
    }));
    clearUndoHistory();
  },

  setConflict: (remote) => set(() => ({ conflict: remote })),

  resolveConflict: (choice) => {
    const remote = get().conflict;
    if (!remote) return;

    if (choice === 'load') {
      // เก็บงานของฉัน (live) เป็นสำเนา ก่อนทับด้วย remote → ไม่มีของหาย
      const mine = extractJobBundle(pickLive(get()));
      mine.id = get().currentJobId ?? mine.id;
      if (!isBundleEmpty(mine)) {
        const copy = stashCopy(mine, 'ของฉัน');
        set((state) => ({ jobs: [...state.jobs, copy] }));
        jobSync().pushJob(copy);
      }
      get().applyRemoteToActive(remote);
    } else {
      // เก็บของฉัน (ทับ cloud) — เก็บ remote เป็นสำเนาแยก doc ไว้
      const copy = stashCopy(remote, 'จากอีกเครื่อง');
      set((state) => ({ jobs: [...state.jobs, copy], activeDirty: true, conflict: null }));
      jobSync().pushJob(copy);
      get().saveCurrentJob(); // ดัน live ทับ doc เดิม + อัปเดต base
    }
  },
});
