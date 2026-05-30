// src/features/pleated-screen/schemas.test.ts
import { describe, it, expect } from 'vitest';
import { PleatedScreenSchema } from './schemas';
import { ITEM_TYPES } from '@/config/enums';
import { makeAreaItem } from '@/test/factories';

describe('PleatedScreenSchema', () => {
  it('item type=pleated_screen → valid', () => {
    expect(PleatedScreenSchema.safeParse(makeAreaItem(ITEM_TYPES.PLEATED_SCREEN)).success).toBe(
      true
    );
  });

  it('item type อื่น (vertical_blind) → invalid', () => {
    expect(PleatedScreenSchema.safeParse(makeAreaItem(ITEM_TYPES.VERTICAL_BLIND)).success).toBe(
      false
    );
  });
});
