// src/lib/customers/contract.ts
// ════════════════════════════════════════════════════════════════════════════
// 👥 Marnthara Customer Contract v1
// ────────────────────────────────────────────────────────────────────────────
// สัญญากลาง (data contract) สำหรับ "ทะเบียนลูกค้า" — มิเรอร์ Catalog Contract
// ใช้ bulk import (ไฟล์/วาง) เพื่อ seed ฐานลูกค้าทีเดียว; runtime sync ใช้ Firestore
//
// transport-agnostic: import (ไฟล์/วาง) ใช้ schema เดียวกับที่ระบบภายนอกจะ generate
// ════════════════════════════════════════════════════════════════════════════

import { z } from 'zod';

export const CUSTOMER_CONTRACT_MAGIC = 'marnthara.customers';
export const CUSTOMER_CONTRACT_VERSION = 1;

export const CustomerEntrySchema = z.object({
  /** รหัสลูกค้า (canonical join key — unique) เช่น "C0007" */
  code: z.string().trim().min(1, 'code ต้องไม่ว่าง'),
  name: z.string().trim().min(1, 'name ต้องไม่ว่าง'),
  phone: z.string().optional(),
  address: z.string().optional(),
  taxId: z.string().optional(),
  installationAddress: z.string().optional(),
  note: z.string().optional(),
  /** วันที่อัปเดตล่าสุด (provenance) */
  updated_at: z.string().optional(),
});

export const CustomerContractSchema = z.object({
  contract: z.literal(CUSTOMER_CONTRACT_MAGIC),
  version: z.literal(CUSTOMER_CONTRACT_VERSION),
  generated_at: z.string().optional(),
  source: z.string().optional(),
  entries: z.array(CustomerEntrySchema),
});

export type CustomerEntry = z.infer<typeof CustomerEntrySchema>;
export type CustomerContract = z.infer<typeof CustomerContractSchema>;

/** ลูกค้าในทะเบียน (mirror ในแอป) = entry + local id */
export interface RegistryCustomer extends CustomerEntry {
  id: string;
}

export interface CustomerImportResult {
  ok: boolean;
  imported: number;
  skipped: number;
  errors: string[];
}

/** เช็คเร็ว ๆ ว่า object นี้คือ customer contract ไหม (ใช้ตอน auto-detect ฝั่ง import) */
export const isCustomerContract = (data: unknown): boolean =>
  !!data &&
  typeof data === 'object' &&
  (data as Record<string, unknown>).contract === CUSTOMER_CONTRACT_MAGIC;

/**
 * parse payload (object/array) ให้เป็นรายการลูกค้า — ยอมรับ 2 รูป:
 *  1) Customer Contract เต็ม ({ contract, version, entries })
 *  2) array ของ entry ตรง ๆ (ผ่อนปรนให้วางง่าย)
 */
export function parseCustomerPayload(raw: unknown): {
  ok: boolean;
  entries: CustomerEntry[];
  error?: string;
} {
  // รูปแบบ array ตรง ๆ
  if (Array.isArray(raw)) {
    const parsed = z.array(CustomerEntrySchema).safeParse(raw);
    if (!parsed.success) {
      const i = parsed.error.issues[0];
      return { ok: false, entries: [], error: `${i?.path.join('.') || '(root)'}: ${i?.message ?? ''}` };
    }
    return { ok: true, entries: parsed.data };
  }

  const parsed = CustomerContractSchema.safeParse(raw);
  if (!parsed.success) {
    const i = parsed.error.issues[0];
    return { ok: false, entries: [], error: `${i?.path.join('.') || '(root)'}: ${i?.message ?? ''}` };
  }
  return { ok: true, entries: parsed.data.entries };
}
