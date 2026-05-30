// src/features/wooden-blinds/schemas.test.ts
// WoodenBlindsSchema = buildAreaItemSchema(WOODEN_BLIND) — logic ลึกอยู่ใน shared/schemas.test.ts
// ที่นี่ยืนยันว่า type literal ผูกถูกตัว

import { describe, it, expect } from 'vitest';
import { WoodenBlindsSchema } from './schemas';
import { ITEM_TYPES } from '@/config/enums';
import { makeAreaItem } from '@/test/factories';

describe('WoodenBlindsSchema', () => {
  it('item type=wooden_blind → valid', () => {
    expect(WoodenBlindsSchema.safeParse(makeAreaItem(ITEM_TYPES.WOODEN_BLIND)).success).toBe(true);
  });

  it('item type อื่น (roller_blind) → invalid', () => {
    expect(WoodenBlindsSchema.safeParse(makeAreaItem(ITEM_TYPES.ROLLER_BLIND)).success).toBe(false);
  });
});
