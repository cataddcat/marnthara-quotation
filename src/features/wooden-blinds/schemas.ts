// src/features/wooden-blinds/schemas.ts

import { z } from 'zod';
import { ITEM_TYPES } from '@/config/enums';
import { buildAreaItemSchema } from '@/features/shared/schemas';

export const WoodenBlindsSchema = buildAreaItemSchema(ITEM_TYPES.WOODEN_BLIND);
export type WoodenBlindsFormValues = z.infer<typeof WoodenBlindsSchema>;

// มู่ลี่อลูมิเนียม reuse ฟอร์มนี้ (ItemModal map ALUMINUM_BLIND → WOODEN_BLINDS_FORM_ID)
// จึงเก็บ schema ไว้ที่เดียวกับฟอร์มที่ owns มัน — literal type ต้องตรงกับ item จริง
export const AluminumBlindsSchema = buildAreaItemSchema(ITEM_TYPES.ALUMINUM_BLIND);
export type AluminumBlindsFormValues = z.infer<typeof AluminumBlindsSchema>;
