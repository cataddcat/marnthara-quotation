// src/lib/pricing/properties.test.ts
// Property-based tests (fast-check) — invariants ของ pricing core ที่ต้องจริงทุก input
// numRuns=100 + seed คงที่ (deterministic ใน CI)

import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { calculateFabricYardage, CurtainStrategy } from '@/features/curtains/logic/CurtainStrategy';
import { WallpaperStrategy } from '@/features/wallpapers/logic/WallpaperStrategy';
import { createAreaStrategy } from '@/features/shared/logic/AreaStrategy';
import { CostEngine, buildCostContext } from './CostEngine';
import { FORMULAS } from '@/config/formulas';
import { ITEM_TYPES, LAYER_MODES } from '@/config/enums';
import { useAppStore } from '@/store/useAppStore';
import { useCatalogStore } from '@/store/standalone/useCatalogStore';
import { asItemData } from '@/test/factories';
import type {
  CurtainItemInput,
  WallpaperItemInput,
  AreaItemInput,
  ItemData,
} from '@/types';

// ประกอบ CostContext จาก store ที่ test seed ไว้ (ทางเดียวกับ useActiveCostMaps ในแอปจริง)
const analyze = (item: ItemData) =>
  CostEngine.analyze(item, buildCostContext(useAppStore.getState(), useCatalogStore.getState()));

const RUN = { numRuns: 100, seed: 42 } as const;
const YC = FORMULAS.curtain.yard_conversion; // 0.90
const STYLES = ['จีบ', 'ลอน', 'ตาไก่', 'พับ'];

const areaStrategy = createAreaStrategy({ name: 'มู่ลี่ไม้' });
const posDouble = (min: number, max: number) =>
  fc.double({ min, max, noNaN: true, noDefaultInfinity: true });

beforeEach(() => {
  useAppStore.setState({ fabricCosts: {}, accessoryCosts: {}, laborCosts: {} });
});

describe('calculateFabricYardage — invariants', () => {
  it('forall width > 0, style ใดๆ → fabricYards > 0', () => {
    fc.assert(
      fc.property(posDouble(0.1, 20), fc.constantFrom(...STYLES), (width, style) => {
        expect(calculateFabricYardage(width, style)).toBeGreaterThan(0);
      }),
      RUN
    );
  });

  it('forall width > 0 → fabricYards >= width / yard_conversion (ปัดขึ้นเสมอ)', () => {
    fc.assert(
      fc.property(posDouble(0.1, 20), fc.constantFrom(...STYLES), (width, style) => {
        const yards = calculateFabricYardage(width, style);
        expect(yards + 1e-9).toBeGreaterThanOrEqual(width / YC);
      }),
      RUN
    );
  });
});

describe('CurtainStrategy — invariants', () => {
  it('forall DOUBLE curtain (width>0) → fabricYards และ sheerYards > 0 ทั้งคู่', () => {
    fc.assert(
      fc.property(
        posDouble(0.1, 20),
        posDouble(0.1, 5),
        fc.constantFrom(...STYLES),
        (width, height, style) => {
          const item = asItemData({
            type: ITEM_TYPES.CURTAIN,
            width_m: width,
            height_m: height,
            style,
            layer_mode: LAYER_MODES.DOUBLE,
            price_per_m_raw: 100,
            sheer_price_per_m: 80,
          }) as unknown as CurtainItemInput;
          const r = CurtainStrategy.calculate(item);
          expect(r.breakdown?.fabricYards).toBeGreaterThan(0);
          expect(r.breakdown?.sheerYards).toBeGreaterThan(0);
        }
      ),
      RUN
    );
  });
});

describe('WallpaperStrategy — invariants', () => {
  it('forall height <= roll_length - waste → rolls > 0 และไม่มี warning', () => {
    // floor(roll_length / (height + waste)) >= 1 ⟺ height <= roll_length - waste
    const maxHeight = FORMULAS.wallpaper.roll_length - FORMULAS.wallpaper.waste_margin;
    fc.assert(
      fc.property(posDouble(0.1, 10), posDouble(0.1, maxHeight), (width, height) => {
        const item = asItemData({
          type: ITEM_TYPES.WALLPAPER,
          widths: [String(width)],
          height_m: height,
          price_per_roll: 1000,
          wallpaper_code: 'W1',
        }) as unknown as WallpaperItemInput;
        const r = WallpaperStrategy.calculate(item);
        expect(r.warning).toBeUndefined();
        expect(r.breakdown?.rolls).toBeGreaterThan(0);
      }),
      RUN
    );
  });
});

describe('AreaStrategy — invariants', () => {
  it('forall พื้นที่ที่ ตร.ล. <= min_yield → คิดราคาที่ min_yield', () => {
    // width × height × sqm_to_sqyd <= min_yield → ใช้ min_yield
    const { sqm_to_sqyd, min_yield } = FORMULAS.area;
    fc.assert(
      fc.property(posDouble(0.05, 0.5), posDouble(0.05, 0.5), fc.integer({ min: 1, max: 9999 }), (w, h, price) => {
        fc.pre(w * h * sqm_to_sqyd <= min_yield);
        const item = asItemData({
          type: ITEM_TYPES.WOODEN_BLIND,
          width_m: w,
          height_m: h,
          price_sqyd: price,
        }) as unknown as AreaItemInput;
        const r = areaStrategy.calculate(item);
        expect(r.breakdown?.areaSqyd).toBe(min_yield);
        expect(r.total).toBe(Math.round(min_yield * price * 100) / 100);
      }),
      RUN
    );
  });
});

describe('CostEngine.analyze — total robustness', () => {
  it('forall ItemData ที่ valid → analyze ไม่ throw + ตัวเลขทุกตัว finite', () => {
    const curtainArb = fc.record({
      width: posDouble(0.1, 20),
      height: posDouble(0.1, 5),
      style: fc.constantFrom(...STYLES),
      layer: fc.constantFrom(LAYER_MODES.MAIN, LAYER_MODES.SHEER, LAYER_MODES.DOUBLE),
      price: fc.integer({ min: 0, max: 5000 }),
    }).map((o) =>
      asItemData({
        type: ITEM_TYPES.CURTAIN,
        width_m: o.width,
        height_m: o.height,
        style: o.style,
        layer_mode: o.layer,
        price_per_m_raw: o.price,
        sheer_price_per_m: o.price,
      })
    );

    const areaArb = fc.record({
      width: posDouble(0.1, 10),
      height: posDouble(0.1, 10),
      price: fc.integer({ min: 0, max: 5000 }),
    }).map((o) =>
      asItemData({ type: ITEM_TYPES.WOODEN_BLIND, width_m: o.width, height_m: o.height, price_sqyd: o.price })
    );

    const wallpaperArb = fc.record({
      widths: fc.array(posDouble(0.1, 5), { minLength: 1, maxLength: 4 }),
      height: posDouble(0.1, 9),
      price: fc.integer({ min: 0, max: 5000 }),
    }).map((o) =>
      asItemData({
        type: ITEM_TYPES.WALLPAPER,
        widths: o.widths.map(String),
        height_m: o.height,
        price_per_roll: o.price,
        wallpaper_code: 'W1',
      })
    );

    const removalArb = fc.record({
      qty: fc.integer({ min: 0, max: 100 }),
      price: fc.integer({ min: 0, max: 5000 }),
    }).map((o) =>
      asItemData({ type: ITEM_TYPES.REMOVAL, description: 'x', quantity: o.qty, price_per_item: o.price })
    );

    fc.assert(
      fc.property(fc.oneof(curtainArb, areaArb, wallpaperArb, removalArb), (item) => {
        const r = analyze(item);
        expect(Number.isFinite(r.totalCost)).toBe(true);
        expect(Number.isFinite(r.sellingPrice)).toBe(true);
        expect(Number.isFinite(r.profitAmount)).toBe(true);
        expect(Number.isFinite(r.marginPercent)).toBe(true);
      }),
      RUN
    );
  });
});
