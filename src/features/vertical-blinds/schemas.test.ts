// src/features/vertical-blinds/schemas.test.ts
import { describe, it, expect } from 'vitest';
import { VerticalBlindsSchema } from './schemas';
import { ITEM_TYPES } from '@/config/enums';
import { makeAreaItem } from '@/test/factories';

describe('VerticalBlindsSchema', () => {
  it('item type=vertical_blind → valid', () => {
    expect(VerticalBlindsSchema.safeParse(makeAreaItem(ITEM_TYPES.VERTICAL_BLIND)).success).toBe(
      true
    );
  });

  it('item type อื่น (partition) → invalid', () => {
    expect(VerticalBlindsSchema.safeParse(makeAreaItem(ITEM_TYPES.PARTITION)).success).toBe(false);
  });
});
