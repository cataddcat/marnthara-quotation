// src/features/shared/logic/AreaStrategy.test.ts
// createAreaStrategy: พื้นที่ ตร.ม. → ตร.ล. (×1.2) → ราคา + min_yield 1.0 + override
// FORMULAS.area: sqm_to_sqyd=1.2, min_yield=1.0

import { describe, it, expect } from 'vitest';
import { createAreaStrategy } from './AreaStrategy';
import type { AreaItemInput } from '@/types';

const strategy = createAreaStrategy({ name: 'มู่ลี่ไม้' });
const asArea = (o: Record<string, unknown>): AreaItemInput => o as unknown as AreaItemInput;

describe('AreaStrategy.calculate', () => {
  it('พื้นที่จริง: 2×2 = 4 ตร.ม. ×1.2 = 4.8 ตร.ล. ×1000 = 4800', () => {
    const r = strategy.calculate(asArea({ width_m: 2.0, height_m: 2.0, price_sqyd: 1000 }));
    expect(r.total).toBe(4800);
    expect(r.breakdown?.areaSqm).toBe(4);
    expect(r.breakdown?.areaSqyd).toBeCloseTo(4.8, 4);
  });

  it('ต่ำกว่าขั้นต่ำ: 0.5×0.5 = 0.3 ตร.ล. < 1.0 → คิด 1.0 ×500 = 500', () => {
    const r = strategy.calculate(asArea({ width_m: 0.5, height_m: 0.5, price_sqyd: 500 }));
    expect(r.total).toBe(500);
    expect(r.breakdown?.areaSqyd).toBe(1.0);
  });

  it('แปลงหน่วยถูกต้อง: 1×1 = 1.2 ตร.ล. (>= min) ×100 = 120', () => {
    const r = strategy.calculate(asArea({ width_m: 1.0, height_m: 1.0, price_sqyd: 100 }));
    expect(r.breakdown?.areaSqyd).toBeCloseTo(1.2, 4);
    expect(r.total).toBe(120);
  });

  it('ราคาเหมา override ทุกอย่าง', () => {
    const r = strategy.calculate(
      asArea({
        width_m: 2.0,
        height_m: 2.0,
        price_sqyd: 1000,
        enable_set_price: true,
        set_price_override: 333,
      })
    );
    expect(r.total).toBe(333);
  });

  it('width <= 0 → total 0', () => {
    const r = strategy.calculate(asArea({ width_m: 0, height_m: 2.0, price_sqyd: 1000 }));
    expect(r.total).toBe(0);
  });
});

describe('AreaStrategy.validate / getSpecs', () => {
  it('validate: ไม่เหมา + ไม่มีราคา → error ราคาต่อ ตร.ล.', () => {
    const errors = strategy.validate(asArea({ width_m: 2, height_m: 2, price_sqyd: 0 }));
    expect(errors).toContain('ระบุราคาต่อ ตร.ล.');
  });

  it('validate: เหมาจ่าย → ไม่ต้องมีราคาต่อหน่วย', () => {
    const errors = strategy.validate(
      asArea({ width_m: 2, height_m: 2, price_sqyd: 0, enable_set_price: true })
    );
    expect(errors).toEqual([]);
  });

  it('getSpecs มีขนาด + รหัส', () => {
    const specs = strategy.getSpecs(asArea({ width_m: 2, height_m: 2, code: 'WB1' }));
    expect(specs.join(' ')).toContain('WB1');
    expect(specs.join(' ')).toContain('2 x 2');
  });
});
