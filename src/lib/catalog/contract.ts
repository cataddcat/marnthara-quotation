// src/lib/catalog/contract.ts
// ════════════════════════════════════════════════════════════════════════════
// 📦 Marnthara Catalog Contract v1
// ────────────────────────────────────────────────────────────────────────────
// สัญญากลาง (data contract) ระหว่าง "แอป (เครื่องคิดเลข)" ↔ "ระบบแค็ตตาล็อกภายนอก"
// (ระบบ AI ที่อ่านใบราคาผู้ผลิตจาก LINE/รูป → ผลิต JSON ตาม schema นี้)
//
// ขอบเขต: เฉพาะ "สินค้าวัสดุ" ที่ราคาตาม code + category (ผ้า/วอลฯ/มู่ลี่/ฉาก/มุ้ง)
// ไม่รวมค่าแรง/บริการ/ฮาร์ดแวร์ (พวกนั้นใช้ vault-dump importSecrets เดิม)
//
// transport-agnostic: import (ไฟล์/วาง) และ connect (fetch) ใช้ schema เดียวกัน
// ════════════════════════════════════════════════════════════════════════════

import { z } from 'zod';
import { CATALOG_CATEGORIES } from '@/lib/vault';

export const CATALOG_CONTRACT_MAGIC = 'marnthara.catalog';
export const CATALOG_CONTRACT_VERSION = 1;

// category ต้องเป็น id ที่รู้จักใน CATALOG_CATEGORIES (single source of truth) — กัน mis-route เงียบๆ
const VALID_CATEGORY_IDS = new Set(CATALOG_CATEGORIES.map((c) => c.id));

export const CatalogEntrySchema = z.object({
  /** รหัสสินค้า (unique ภายใน category) */
  code: z.string().trim().min(1, 'code ต้องไม่ว่าง'),
  /** หมวดสินค้า — ต้องตรงกับ CATALOG_CATEGORIES */
  category: z.string().refine((v) => VALID_CATEGORY_IDS.has(v), {
    message: 'category ไม่รู้จัก (ต้องตรงกับ CATALOG_CATEGORIES)',
  }),
  /** ทุน/หน่วยของ category → เข้า cost vault */
  cost: z.number().nonnegative().optional(),
  /** ราคาขายร้าน → inventory default_price_per_m */
  sell_price: z.number().nonnegative().optional(),
  /** หน่วย (informational — จริงๆ fix ตาม category) */
  unit: z.string().optional(),
  /** ผู้ผลิต/แหล่งที่มา (provenance) */
  supplier: z.string().optional(),
  note: z.string().optional(),
  /** วันที่เห็นราคานี้ (provenance ระดับ entry) */
  captured_at: z.string().optional(),
});

export const CatalogContractSchema = z.object({
  contract: z.literal(CATALOG_CONTRACT_MAGIC),
  version: z.literal(CATALOG_CONTRACT_VERSION),
  generated_at: z.string().optional(),
  source: z.string().optional(),
  entries: z.array(CatalogEntrySchema),
});

export type CatalogEntry = z.infer<typeof CatalogEntrySchema>;
export type CatalogContract = z.infer<typeof CatalogContractSchema>;
/** id หมวดสินค้าที่ contract รองรับ (runtime-validated กับ CATALOG_CATEGORIES) */
export type CatalogCategoryId = CatalogEntry['category'];

export interface CatalogImportResult {
  ok: boolean;
  imported: number;
  skipped: number;
  errors: string[];
}

/** เช็คเร็วๆ ว่า object นี้คือ catalog contract ไหม (ใช้ตอน auto-detect ฝั่ง import) */
export const isCatalogContract = (data: unknown): boolean =>
  !!data &&
  typeof data === 'object' &&
  (data as Record<string, unknown>).contract === CATALOG_CONTRACT_MAGIC;
