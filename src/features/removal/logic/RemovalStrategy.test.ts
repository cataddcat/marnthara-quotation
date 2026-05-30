// src/features/removal/logic/RemovalStrategy.test.ts
// total = quantity × price_per_item + override + safety guards

import { describe, it, expect } from 'vitest';
import { RemovalStrategy } from './RemovalStrategy';
import type { RemovalItemInput } from '@/types';

const asRemoval = (o: Record<string, unknown>): RemovalItemInput =>
  o as unknown as RemovalItemInput;

describe('RemovalStrategy.calculate', () => {
  it('quantity × price_per_item', () => {
    const r = RemovalStrategy.calculate(
      asRemoval({ description: 'รื้อม่าน', quantity: 2, price_per_item: 300 })
    );
    expect(r.total).toBe(600);
  });

  it('multiplier: quantity 5 × 120 = 600', () => {
    const r = RemovalStrategy.calculate(
      asRemoval({ description: 'x', quantity: 5, price_per_item: 120 })
    );
    expect(r.total).toBe(600);
  });

  it('ราคาเหมา override', () => {
    const r = RemovalStrategy.calculate(
      asRemoval({
        description: 'x',
        quantity: 2,
        price_per_item: 300,
        enable_set_price: true,
        set_price_override: 1000,
      })
    );
    expect(r.total).toBe(1000);
  });

  it('quantity <= 0 → total 0', () => {
    const r = RemovalStrategy.calculate(
      asRemoval({ description: 'x', quantity: 0, price_per_item: 300 })
    );
    expect(r.total).toBe(0);
  });

  it('price_per_item <= 0 → total 0', () => {
    const r = RemovalStrategy.calculate(
      asRemoval({ description: 'x', quantity: 2, price_per_item: 0 })
    );
    expect(r.total).toBe(0);
  });
});

describe('RemovalStrategy.validate / getSpecs', () => {
  it('validate: ไม่มี description + ไม่มีราคา → 2 errors', () => {
    const errors = RemovalStrategy.validate(asRemoval({ description: '', price_per_item: 0 }));
    expect(errors).toHaveLength(2);
  });

  it('validate: เหมาจ่าย → ไม่เช็คราคา', () => {
    const errors = RemovalStrategy.validate(
      asRemoval({ description: 'x', price_per_item: 0, enable_set_price: true })
    );
    expect(errors).toEqual([]);
  });

  it('getSpecs มี description + จำนวน', () => {
    const specs = RemovalStrategy.getSpecs(
      asRemoval({ description: 'รื้อม่านเก่า', quantity: 3 })
    );
    expect(specs.join(' ')).toContain('รื้อม่านเก่า');
    expect(specs.join(' ')).toContain('3');
  });
});
