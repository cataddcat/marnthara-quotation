// src/lib/job-bundle.ts
// ════════════════════════════════════════════════════════════════════════════
// "งานหนึ่งก้อน" (JobBundle) — แหล่งความจริงเดียวของขอบเขตข้อมูลงาน
// ────────────────────────────────────────────────────────────────────────────
// ขอบเขตงาน = { customer, rooms, discount, receipts, expenses } + สถานะ/เวลา
// (โครงนี้โค้ดเดิมรับรองไว้แล้ว — ดู PaymentSlice.ts หัวไฟล์ + DataModal export)
//
// ใช้ซ้ำทุกที่ที่ต้อง "หยิบงานออก/วางงานเข้า" field live ของ store: JobsSlice (สลับงาน),
// resetProject (เริ่มงานใหม่), DataModal (backup/restore), syncEngine (push/pull Firestore).
// ไฟล์นี้ "บริสุทธิ์" — ไม่ผูก store/Firestore (รับ input แบบ structural, คืน ISO string ล้วน)
// เพื่อให้ unit-test ได้ง่ายและไม่สร้าง dependency lib→store.
// ════════════════════════════════════════════════════════════════════════════

import type { Customer, Room, Discount } from '@/types';
import type { ReceiptEntry, ExpenseEntry } from '@/store/slices/PaymentSlice';
import { type JobStatusKey, DEFAULT_JOB_STATUS } from '@/config/enums';
import { newUuid } from '@/lib/id';

/** งานหนึ่งก้อน — หน่วยที่ "สลับ" และ sync (1 ก้อน = 1 doc บน Firestore) */
export interface JobBundle {
  /** = customer.id (UUID ของงาน/เอกสาร) — กุญแจ doc บน Firestore */
  id: string;
  /** = customer.code — join key ไปทะเบียนลูกค้าภายนอก (ถ้ามี) */
  customerCode?: string;
  customer: Customer;
  rooms: Room[];
  discount: Discount;
  receipts: ReceiptEntry[];
  expenses: ExpenseEntry[];
  status: JobStatusKey;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

/** field live ใน store ที่ประกอบเป็นงานหนึ่งก้อน (key ตรงกับ AppState 1:1) */
export interface JobLiveFields {
  customer: Customer;
  rooms: Room[];
  discount: Discount;
  receipts: ReceiptEntry[];
  expenses: ExpenseEntry[];
  jobStatus: JobStatusKey;
}

/** input ขั้นต่ำสำหรับ extract — รับ AppState ได้ตรง ๆ (structural) โดยไม่ต้อง import store */
export type JobSource = JobLiveFields;

export const BLANK_CUSTOMER: Customer = {
  name: '',
  phone: '',
  address: '',
  taxId: '',
  installationAddress: '',
  useSameAddress: true,
  showInstallationAddress: true,
};

export const BLANK_DISCOUNT: Discount = { type: 'amount', value: 0, is_enabled: false };

const isoNow = () => new Date().toISOString();

/**
 * หยิบงานปัจจุบันออกจาก field live → JobBundle
 * หมายเหตุ: ผู้เรียก (saveCurrentJob) ควร ensureCustomerIdentity() ก่อน เพื่อให้ customer.id มีค่า
 * createdAt/updatedAt = now เป็น default; saveCurrentJob จะคง createdAt เดิมตอน upsert ทับ
 */
export const extractJobBundle = (s: JobSource, now: string = isoNow()): JobBundle => ({
  id: s.customer.id ?? newUuid(),
  customerCode: s.customer.code,
  customer: s.customer,
  rooms: s.rooms,
  discount: s.discount,
  receipts: s.receipts,
  expenses: s.expenses,
  status: s.jobStatus ?? DEFAULT_JOB_STATUS,
  createdAt: now,
  updatedAt: now,
});

/** วาง JobBundle กลับเข้า field live (คืน partial ให้ set() merge) */
export const bundleToLiveFields = (b: JobBundle): JobLiveFields => ({
  customer: b.customer,
  rooms: b.rooms,
  discount: b.discount,
  receipts: b.receipts,
  expenses: b.expenses,
  jobStatus: b.status,
});

/** งานเปล่าก้อนใหม่ (id ใหม่, ลูกค้าว่าง, สถานะเริ่มต้น) — ใช้โดย createJob/resetProject */
export const blankJob = (now: string = isoNow()): JobBundle => {
  const id = newUuid();
  return {
    id,
    customer: { ...BLANK_CUSTOMER, id },
    rooms: [],
    discount: { ...BLANK_DISCOUNT },
    receipts: [],
    expenses: [],
    status: DEFAULT_JOB_STATUS,
    createdAt: now,
    updatedAt: now,
  };
};

/**
 * "งานเปล่า" = ยังไม่มีชื่อลูกค้า + ไม่มีห้อง + ไม่มีเงิน — ไม่ต้องเก็บลงชั้นวาง/ดัน Firestore
 * (กันงานผีโผล่ในลิสต์ตอนกด "งานใหม่" แล้วยังไม่กรอกอะไร)
 */
export const isBundleEmpty = (b: JobBundle): boolean =>
  !b.customer.name?.trim() &&
  b.rooms.length === 0 &&
  b.receipts.length === 0 &&
  b.expenses.length === 0;

/** สร้างลูกค้าเริ่มต้นสำหรับงานใหม่จาก entry ทะเบียน (autofill snapshot + ผูก code) */
export const customerFromRegistry = (entry: {
  code: string;
  name: string;
  phone?: string;
  address?: string;
  taxId?: string;
  installationAddress?: string;
}): Customer => ({
  ...BLANK_CUSTOMER,
  id: newUuid(),
  code: entry.code,
  name: entry.name,
  phone: entry.phone ?? '',
  address: entry.address ?? '',
  taxId: entry.taxId ?? '',
  installationAddress: entry.installationAddress ?? '',
  useSameAddress: !entry.installationAddress,
});
