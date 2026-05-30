// src/features/roller-blinds/schemas.test.ts
import { describe, it, expect } from 'vitest';
import { RollerBlindsSchema } from './schemas';
import { ITEM_TYPES } from '@/config/enums';
import { makeAreaItem } from '@/test/factories';

describe('RollerBlindsSchema', () => {
  it('item type=roller_blind → valid', () => {
    expect(RollerBlindsSchema.safeParse(makeAreaItem(ITEM_TYPES.ROLLER_BLIND)).success).toBe(true);
  });

  it('item type อื่น (wooden_blind) → invalid', () => {
    expect(RollerBlindsSchema.safeParse(makeAreaItem(ITEM_TYPES.WOODEN_BLIND)).success).toBe(false);
  });
});
