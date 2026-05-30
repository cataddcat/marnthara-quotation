// src/features/removal/schemas.test.ts
// RemovalSchema — description required, quantity/price positiveNumeric

import { describe, it, expect } from 'vitest';
import { RemovalSchema } from './schemas';
import { makeRemoval } from '@/test/factories';

const issuePaths = (result: ReturnType<typeof RemovalSchema.safeParse>): string[] =>
  result.success ? [] : result.error.issues.map((i) => i.path.join('.'));

describe('RemovalSchema', () => {
  it('happy path → valid + defaults', () => {
    const result = RemovalSchema.safeParse(makeRemoval());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe('removal');
      expect(result.data.enable_set_price).toBe(false);
      expect(result.data.set_price_override).toBe(0);
    }
  });

  it('description ว่าง → invalid', () => {
    const result = RemovalSchema.safeParse(makeRemoval({ description: '' }));
    expect(issuePaths(result)).toContain('description');
  });

  it('description ช่องว่างล้วน → invalid (trim แล้วว่าง)', () => {
    const result = RemovalSchema.safeParse(makeRemoval({ description: '   ' }));
    expect(issuePaths(result)).toContain('description');
  });

  it('quantity = "0" → invalid', () => {
    const result = RemovalSchema.safeParse(makeRemoval({ quantity: '0' }));
    expect(issuePaths(result)).toContain('quantity');
  });

  it('quantity ติดลบ → invalid', () => {
    const result = RemovalSchema.safeParse(makeRemoval({ quantity: '-1' }));
    expect(issuePaths(result)).toContain('quantity');
  });

  it('price_per_item = "0" → invalid', () => {
    const result = RemovalSchema.safeParse(makeRemoval({ price_per_item: '0' }));
    expect(issuePaths(result)).toContain('price_per_item');
  });

  it('quantity/price เป็น number ก็ valid (union)', () => {
    const result = RemovalSchema.safeParse(makeRemoval({ quantity: 3, price_per_item: 250 }));
    expect(result.success).toBe(true);
  });

  it('is_suspended = true → valid', () => {
    const result = RemovalSchema.safeParse(makeRemoval({ is_suspended: true }));
    expect(result.success).toBe(true);
  });
});
