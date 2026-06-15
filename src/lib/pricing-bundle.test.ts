// src/lib/pricing-bundle.test.ts
import { describe, it, expect } from 'vitest';
import {
  extractPricing,
  applyPricingFields,
  mergePricing,
  isPricingEmpty,
  type PricingSource,
} from '@/lib/pricing-bundle';
import { DEFAULT_COST_INCLUDE } from '@/store/slices/CostDataSlice';

const blank = (over: Partial<PricingSource> = {}): PricingSource => ({
  favorites: {},
  laborCosts: {},
  serviceCosts: {},
  accessoryCosts: {},
  hardwareCosts: {},
  fabricCosts: {},
  wallpaperCosts: {},
  areaCosts: {},
  costInclude: { ...DEFAULT_COST_INCLUDE },
  ...over,
});

describe('extractPricing / applyPricingFields', () => {
  it('round-trip field ตรง + ใส่ updatedAt', () => {
    const src = blank({ fabricCosts: { F001: 120 }, favorites: { fabric: [] } });
    const b = extractPricing(src, '2026-06-15T00:00:00.000Z');
    expect(b.updatedAt).toBe('2026-06-15T00:00:00.000Z');
    expect(b.fabricCosts).toEqual({ F001: 120 });
    const fields = applyPricingFields(b);
    expect(fields).not.toHaveProperty('updatedAt');
    expect(fields.fabricCosts).toEqual({ F001: 120 });
  });
});

describe('mergePricing — union, cloud ชนะเมื่อชน', () => {
  it('vault: union key + cloud ทับ key ที่ชน', () => {
    const local = blank({ fabricCosts: { F001: 100, F002: 200 } });
    const cloud = extractPricing(blank({ fabricCosts: { F002: 999, F003: 300 } }));
    const merged = mergePricing(local, cloud);
    expect(merged.fabricCosts).toEqual({ F001: 100, F002: 999, F003: 300 });
  });

  it('favorites: union by code (UPPERCASE) ต่อ category + cloud ชนะ', () => {
    const local = blank({
      favorites: { fabric: [{ id: 'a', code: 'F001', default_price_per_m: 50 }] },
    });
    const cloud = extractPricing(
      blank({
        favorites: {
          fabric: [
            { id: 'b', code: 'f001', default_price_per_m: 99 }, // ชน (case-insensitive) → cloud ชนะ
            { id: 'c', code: 'F002', default_price_per_m: 70 },
          ],
        },
      })
    );
    const merged = mergePricing(local, cloud);
    const codes = merged.favorites.fabric.map((f) => f.code).sort();
    expect(codes).toEqual(['F002', 'f001']);
    const f001 = merged.favorites.fabric.find((f) => f.code.toUpperCase() === 'F001');
    expect(f001?.default_price_per_m).toBe(99); // cloud ชนะ
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
  it('ว่างจริง (ไม่มีสินค้า + vault ว่าง) → true (costInclude default ไม่นับ)', () => {
    expect(isPricingEmpty(blank())).toBe(true);
    expect(isPricingEmpty(blank({ favorites: { fabric: [] } }))).toBe(true);
  });
  it('มีสินค้า หรือ มี vault → false', () => {
    expect(isPricingEmpty(blank({ fabricCosts: { F001: 1 } }))).toBe(false);
    expect(
      isPricingEmpty(blank({ favorites: { fabric: [{ id: 'a', code: 'F1', default_price_per_m: 1 }] } }))
    ).toBe(false);
  });
});
