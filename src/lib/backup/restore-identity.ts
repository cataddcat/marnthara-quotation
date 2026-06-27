// src/lib/backup/restore-identity.ts
// ────────────────────────────────────────────────────────────────────────────
// ตัวช่วย "ตัดสินใจเรื่อง identity" ตอน Restore ไฟล์ .json (DataModal)
//
// ทำไม: 1 งาน = 1 UUID (customer.id = job.id = Firestore doc key = id ในไฟล์ JSON).
// ไฟล์ backup พา UUID ติดไปด้วย → import ซ้ำ = "งานเดียวกัน" (dedup/upsert ตาม id).
// แต่ถ้าทับเงียบ ๆ อาจเสียของ (ไฟล์เก่ากว่าทับงานในเครื่องที่ใหม่กว่า) — ฟังก์ชันนี้บอกว่า
//   (ก) ชนกับงานในชั้นวางไหม + (ข) ไฟล์เก่ากว่าไหม → ให้ DataModal ถามผู้ใช้ "ทับ / สำเนาใหม่".
// ล้วน ๆ (pure) — ไม่พึ่ง store/DOM — เทสต์ได้ตรง ๆ (แบบ job-bundle.ts / backup.ts).
// ────────────────────────────────────────────────────────────────────────────

import type { Customer } from '@/types';
import type { JobBundle } from '@/lib/jobs/job-bundle';
import { newUuid } from '@/lib/id';

export interface RestoreCollision {
  /** ไฟล์ที่นำเข้ามี UUID ตรงกับงานที่มีอยู่ในชั้นวางแล้ว (= งานเดียวกัน) */
  collides: boolean;
  /** งานในชั้นวางที่ชน (ถ้ามี) — ใช้โชว์วันที่อัปเดตล่าสุด */
  existing?: JobBundle;
  /** ไฟล์ที่นำเข้าเก่ากว่างานในเครื่อง (เตือนก่อนทับ) — undefined ถ้าเทียบเวลาไม่ได้ */
  incomingOlder?: boolean;
}

/**
 * หางานในชั้นวางที่ id ตรงกับ id ที่กำลังจะ restore (UUID เดียว = งานเดียวกัน).
 * incomingDate (เช่น exportDate ของไฟล์) ถ้าให้มา จะเทียบกับ updatedAt ของงานในเครื่อง
 * เพื่อเตือนกรณี "ไฟล์เก่ากว่า" (กันทับงานใหม่ด้วยไฟล์เก่า).
 */
export const resolveRestoreIdentity = (
  incomingId: string | undefined,
  jobs: JobBundle[],
  incomingDate?: string
): RestoreCollision => {
  if (!incomingId) return { collides: false };
  const existing = jobs.find((j) => j.id === incomingId);
  if (!existing) return { collides: false };
  const incomingOlder =
    incomingDate && existing.updatedAt ? incomingDate < existing.updatedAt : undefined;
  return { collides: true, existing, incomingOlder };
};

/**
 * คืน customer ใหม่ที่ผูก UUID ใหม่ — สำหรับ "นำเข้าเป็นสำเนาใหม่" (ไม่ทับงานเดิม).
 * ฟิลด์อื่นคงเดิมทั้งหมด; เปลี่ยนเฉพาะ id (กุญแจ identity ของงาน).
 */
export const forkBundleId = (customer: Customer): Customer => ({
  ...customer,
  id: newUuid(),
});
