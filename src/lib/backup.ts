// src/lib/backup.ts
// ────────────────────────────────────────────────────────────────────────────
// ตัวตรวจ + แปลงไฟล์ Backup (.json) ก่อน restore เข้า store (DataModal)
//
// ทำไมต้องมี: เดิม DataModal เอา json.rooms ฯลฯ setState ตรง ๆ ซึ่ง
//   1) ข้าม migrateLegacyState — backup เก่า (item type:'set' / ฟิลด์ชื่อเดิม /
//      ค่าบริการปนใน accessoryCosts) จะกลับมาทำ "Unknown item type" + ราคาผิด
//      (persist migration ทำงานเฉพาะตอน rehydrate version เก่าเท่านั้น ไม่คลุม restore)
//   2) ไม่ validate — ไฟล์ผิดรูป (rooms ไม่ใช่ array ฯลฯ) ทำแอป crash ทั้งหน้า
//
// หลักการ: validate "หลวม" (loose — เก็บฟิลด์ที่ไม่รู้จักไว้ ไม่ strip) แค่พอกัน crash
// แล้ว reuse migrateLegacyState ตัวเดียวกับ persist ให้ข้อมูลเก่าถูกแปลงเหมือนกันทุกเส้นทาง
// ────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';
import { migrateLegacyState } from '@/store/migrations';

// item ขั้นต่ำ: ต้องมี id + type เป็น string (รวม type เก่า 'set' — migration จะแปลงให้)
const BackupItemSchema = z.looseObject({
  id: z.string(),
  type: z.string(),
});

const BackupRoomSchema = z.looseObject({
  id: z.string(),
  name: z.string(),
  is_suspended: z.boolean().optional(),
  items: z.array(BackupItemSchema),
});

// cost vault = record รหัส → ตัวเลข (กันค่า string/object หลุดเข้าเลขคำนวณเป็น NaN)
const CostRecordSchema = z.record(z.string(), z.number());

// laborCosts มีโครงสร้างเป็น object ต่อ style — ตรวจเฉพาะ field ที่ CostEngine ใช้คำนวณ
const LaborCostSchema = z.looseObject({
  rate: z.number(),
  unit: z.string(),
  min_price: z.number().optional(),
});

// เงินจริงของงาน — ตรวจ amount เป็นตัวเลข (กัน NaN ในยอดรับ/จ่าย/คงเหลือ) + id/label ขั้นต่ำ
const ReceiptEntrySchema = z.looseObject({
  id: z.string(),
  label: z.string(),
  amount: z.number(),
});
const ExpenseEntrySchema = z.looseObject({
  id: z.string(),
  label: z.string(),
  amount: z.number(),
  paid: z.boolean(),
});

const BackupSchema = z.looseObject({
  customer: z.looseObject({}).optional(),
  rooms: z.array(BackupRoomSchema).optional(),
  shopConfig: z.looseObject({}).optional(),
  discount: z.looseObject({}).optional(),
  favorites: z.record(z.string(), z.array(z.looseObject({ code: z.string() }))).optional(),
  payments: z
    .looseObject({
      receipts: z.array(ReceiptEntrySchema).optional(),
      expenses: z.array(ExpenseEntrySchema).optional(),
    })
    .optional(),
  production: z
    .looseObject({
      laborCosts: z.record(z.string(), LaborCostSchema).optional(),
      serviceCosts: CostRecordSchema.optional(),
      accessoryCosts: CostRecordSchema.optional(),
      hardwareCosts: CostRecordSchema.optional(),
      fabricCosts: CostRecordSchema.optional(),
      wallpaperCosts: CostRecordSchema.optional(),
      areaCosts: CostRecordSchema.optional(),
      costInclude: z
        .looseObject({
          labor: z.boolean().optional(),
          rail: z.boolean().optional(),
          service: z.boolean().optional(),
        })
        .optional(),
    })
    .optional(),
});

export type ParsedBackup = z.infer<typeof BackupSchema>;

export interface BackupParseResult {
  ok: boolean;
  data?: ParsedBackup;
  /** ข้อความ validate แรกที่พบ (สำหรับ toast) */
  error?: string;
}

/**
 * ตรวจ + migrate ก้อน backup (object ที่ JSON.parse แล้ว) ให้พร้อม setState
 * คืน ok:false เมื่อรูปร่างผิดจนไม่ปลอดภัย (ไม่ import บางส่วน — ทั้งไฟล์ต้องผ่าน)
 */
export function parseBackup(raw: unknown): BackupParseResult {
  const parsed = BackupSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: `${issue?.path.join('.') || '(root)'}: ${issue?.message ?? ''}` };
  }

  const data = parsed.data;

  // reuse migration ของ persist — ประกอบ state-like object ให้ migrateCostVaults
  // (ซึ่งอ่าน accessoryCosts/serviceCosts ระดับบนสุด) ทำงานกับ vault ใน backup ได้ด้วย
  const migrated = migrateLegacyState({
    rooms: data.rooms,
    shopConfig: data.shopConfig,
    accessoryCosts: data.production?.accessoryCosts,
    serviceCosts: data.production?.serviceCosts,
  }) as Record<string, unknown>;

  return {
    ok: true,
    data: {
      ...data,
      rooms: migrated.rooms as ParsedBackup['rooms'],
      shopConfig: migrated.shopConfig as ParsedBackup['shopConfig'],
      production: data.production
        ? {
            ...data.production,
            accessoryCosts: migrated.accessoryCosts as Record<string, number> | undefined,
            serviceCosts: migrated.serviceCosts as Record<string, number> | undefined,
          }
        : undefined,
    },
  };
}
