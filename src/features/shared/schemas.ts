// src/features/shared/schemas.ts
// Shared Zod helpers + factory for area-type items (blinds, partition, screen)

import { z } from 'zod';
import type { ItemTypeKey } from '@/config/enums';
import { toNum } from '@/utils/formatters';

// ─────────────────────────────────────────────────────────────────────────────
// Reusable validators
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Required positive number — รับทั้ง string จาก <input> และ number จาก initial data
 * ใช้กับ width_m, height_m, quantity, price_per_item ฯลฯ ที่ "ต้องมีค่า > 0"
 */
export const positiveNumeric = z.union([z.string(), z.number()]).refine(
  (val) => toNum(val) > 0,
  { message: 'ระบุค่ามากกว่า 0' }
);

/**
 * Optional numeric — รับ string | number | undefined ไม่ refine ค่า
 * ใช้กับ price_sqyd, set_price_override ที่กฎ depend on enable_set_price
 */
export const optionalNumeric = z.union([z.string(), z.number()]).optional();

/**
 * Required non-empty string — ใช้กับ description ที่ห้ามว่าง
 */
export const requiredString = z.string().trim().min(1, 'จำเป็นต้องระบุข้อมูล');

// ─────────────────────────────────────────────────────────────────────────────
// Area-item schema factory
// ใช้กับ 5 features: Wooden/Roller/Vertical/Aluminum Blinds, Partition, Pleated Screen
// ─────────────────────────────────────────────────────────────────────────────
export const buildAreaItemSchema = <T extends ItemTypeKey>(typeLiteral: T) =>
  z
    .object({
      type: z.literal(typeLiteral).default(typeLiteral as T),
      id: z.string().optional(),

      // Dimensions
      width_m: positiveNumeric,
      height_m: positiveNumeric,

      // Pricing — default '' ทำให้ตรงกับ AreaItemInput (required string|number)
      price_sqyd: z.union([z.string(), z.number()]).default(''),

      // Fabric/Code
      code: z.string().optional(),
      fabric_variant: z.string().optional(),

      // Hardware/Options
      adjustment_side: z.string().optional(),
      opening_style: z.string().optional(),

      // Meta
      notes: z.string().optional(),
      is_suspended: z.boolean().default(false),

      // Pricing override
      enable_set_price: z.boolean().default(false),
      set_price_override: z.union([z.string(), z.number()]).default(0),
    })
    .superRefine((data, ctx) => {
      // เมื่อไม่ได้ override ราคา → ต้องระบุราคา/ตร.ล. (warning ที่ inline แสดง)
      if (!data.enable_set_price && toNum(data.price_sqyd) <= 0) {
        ctx.addIssue({
          path: ['price_sqyd'],
          code: z.ZodIssueCode.custom,
          message: 'ระบุราคา',
        });
      }
    });
