// src/features/partition/schemas.test.ts
import { describe, it, expect } from 'vitest';
import { PartitionSchema } from './schemas';
import { ITEM_TYPES } from '@/config/enums';
import { makeAreaItem } from '@/test/factories';

describe('PartitionSchema', () => {
  it('item type=partition → valid', () => {
    expect(PartitionSchema.safeParse(makeAreaItem(ITEM_TYPES.PARTITION)).success).toBe(true);
  });

  it('item type อื่น (pleated_screen) → invalid', () => {
    expect(PartitionSchema.safeParse(makeAreaItem(ITEM_TYPES.PLEATED_SCREEN)).success).toBe(false);
  });
});
