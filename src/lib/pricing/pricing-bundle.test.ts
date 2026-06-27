// src/lib/pricing/pricing-bundle.test.ts
import { describe, it, expect } from 'vitest';
import {
  extractPricing,
  applyPricingFields,
  mergePricing,
  isPricingEmpty,
  type PricingSource,
} from '@/lib/pricing/pricing-bundle';
import { DEFAULT_COST_INCLUDE, type LaborCost } from '@/store/slices/CostDataSlice';

// product master (favorites + ทุนสินค้า) ย้ายไป DB ภายนอกแล้ว (useCatalogStore) — bundle นี้เหลือ
// ค่าแรง/บริการ/accessory legacy + costInclude (ของร้านเอง)
const blank = (over: Partial<PricingSource> = {}): PricingSource => ({
  laborCosts: {},
  serviceCosts: {},
  accessoryCosts: {},
  costInclude: { ...DEFAULT_COST_INCLUDE },
  ...over,
});

const labor = (rate: number): LaborCost => ({ style: 'จีบ', rate, unit: 'meter', min_price: 0 });

describe('extractPricing / applyPricingFields', () => {
  it('round-trip field ตรง + ใส่ updatedAt', () => {
    const src = blank({ serviceCosts: { removal_per_point: 300 }, laborCosts: { จีบ: labor(130) } });
    const b = extractPricing(src, '2026-06-15T00:00:00.000Z');
    expect(b.updatedAt).toBe('2026-06-15T00:00:00.000Z');
    expect(b.serviceCosts).toEqual({ removal_per_point: 300 });
    expect(b.laborCosts).toEqual({ จีบ: labor(130) });
    const fields = applyPricingFields(b);
    expect(fields).not.toHaveProperty('updatedAt');
    expect(fields.serviceCosts).toEqual({ removal_per_point: 300 });
  });
});

describe('mergePricing — union, cloud ชนะเมื่อชน', () => {
  it('vault: union key + cloud ทับ key ที่ชน', () => {
    const local = blank({ serviceCosts: { a: 100, b: 200 } });
    const cloud = extractPricing(blank({ serviceCosts: { b: 999, c: 300 } }));
    const merged = mergePricing(local, cloud);
    expect(merged.serviceCosts).toEqual({ a: 100, b: 999, c: 300 });
  });

  it('accessoryCosts (legacy rail fallback): union + cloud ชนะ', () => {
    const local = blank({ accessoryCosts: { rail_wave: 130 } });
    const cloud = extractPricing(blank({ accessoryCosts: { rail_wave: 150, rail_rod: 100 } }));
    expect(mergePricing(local, cloud).accessoryCosts).toEqual({ rail_wave: 150, rail_rod: 100 });
  });

  it('costInclude: cloud ทับ local', () => {
    const local = blank({ costInclude: { labor: true, rail: true, service: true, shipping: false } });
    const cloud = extractPricing(
      blank({ costInclude: { labor: false, rail: true, service: true, shipping: true } })
    );
    expect(mergePricing(local, cloud).costInclude).toEqual({
      labor: false,
      rail: true,
      service: true,
      shipping: true,
    });
  });
});

describe('isPricingEmpty', () => {
  it('ว่างจริง (ทุก vault ว่าง) → true (costInclude default ไม่นับ)', () => {
    expect(isPricingEmpty(blank())).toBe(true);
  });
  it('มี vault ใดมีค่า → false', () => {
    expect(isPricingEmpty(blank({ serviceCosts: { removal_per_point: 1 } }))).toBe(false);
    expect(isPricingEmpty(blank({ laborCosts: { จีบ: labor(1) } }))).toBe(false);
    expect(isPricingEmpty(blank({ accessoryCosts: { rail_wave: 1 } }))).toBe(false);
  });
});
