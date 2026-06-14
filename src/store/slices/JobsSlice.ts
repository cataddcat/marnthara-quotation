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

  /** เก็บงานปัจจุบัน (live → jobs[] + push cloud); no-op ถ้างานเปล่า */
  saveCurrentJob: () => void;
  /** สลับไปงานอื่น: เก็บงานปัจจุบันก่อน แล้ว load เป้าหมายเข้า live + ล้าง undo */
  switchJob: (id: string) => void;
  /** เปิดงานใหม่ (เปล่า หรือ autofill จากลูกค้าในทะเบียน) */
  createJob: (fromCustomer?: JobCustomerSeed) => void;
  /** ทำสำเนางาน (id ใหม่, ล้างเงินจริง, รีเซ็ตสถานะ) — ไม่สลับไป */
  duplicateJob: (id: string) => void;
  /** ลบงาน; ถ้าลบงานปัจจุบัน → สลับไปงานล่าสุด/เปล่า */
  deleteJob: (id: string) => void;
  /** ตั้งสถานะงาน (default = งานปัจจุบัน; ส่ง id เพื่อตั้งของงานอื่นในลิสต์ได้) */
  setJobStatus: (status: JobStatusKey, id?: string) => void;

  /** sync engine ป้อน mirror เข้ามา (replace jobs[] ทั้งก้อนจาก snapshot) */
  setJobsMirror: (jobs: JobBundle[]) => void;
}

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
    }));
    jobSync().pushJob(merged);
  },

  switchJob: (id) => {
    if (id === get().currentJobId) return;
    get().saveCurrentJob(); // กันแก้งานปัจจุบันหาย
    const target = get().jobs.find((j) => j.id === id);
    if (!target) return;
    set(() => ({ ...bundleToLiveFields(target), currentJobId: id }));
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
    set(() => ({ ...bundleToLiveFields(fresh), currentJobId: fresh.id }));
    clearUndoHistory();
    // ถ้ามาจากลูกค้า (มีชื่อ) → เก็บลงชั้นวางทันที; งานเปล่า → no-op
    get().saveCurrentJob();
  },

  duplicateJob: (id) => {
    const src = get().jobs.find((j) => j.id === id);
    if (!src) return;
    const now = new Date().toISOString();
    const newId = newUuid();
    const copy: JobBundle = {
      ...src,
      id: newId,
      customer: { ...src.customer, id: newId, name: `${src.customer.name} (สำเนา)` },
      rooms: src.rooms.map((r) => ({
        ...r,
        id: newUuid(),
        items: r.items.map((it) => ({ ...it, id: newUuid() })),
      })),
      // เงินจริง (มัดจำ/จ่าย) = ข้อเท็จจริงของงานเดิม — สำเนาเริ่มศูนย์
      receipts: [],
      expenses: [],
      status: DEFAULT_JOB_STATUS,
      createdAt: now,
      updatedAt: now,
    };
    set((state) => ({ jobs: [...state.jobs, copy] }));
    jobSync().pushJob(copy);
  },

  deleteJob: (id) => {
    const isCurrent = get().currentJobId === id;
    set((state) => ({ jobs: state.jobs.filter((j) => j.id !== id) }));
    jobSync().deleteJobRemote(id);
    if (!isCurrent) return;
    // ลบงานที่เปิดอยู่ → สลับไปงานล่าสุด หรือเริ่มงานเปล่า
    const next = get().jobs[get().jobs.length - 1];
    const target = next ?? blankJob();
    set(() => ({ ...bundleToLiveFields(target), currentJobId: target.id }));
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
});
