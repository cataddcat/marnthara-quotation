// src/lib/pricing/CostEngine.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { CostEngine } from './CostEngine';
import { useAppStore } from '@/store/useAppStore';
import { ITEM_TYPES, LAYER_MODES } from '@/config/enums';
import type { LaborCost } from '@/store/slices/CostDataSlice';
import { makeItem } from './__test-helpers';
import { FORMULAS } from '@/config/formulas';

// ─────────────────────────────────────────────────────────────────────────────
// Test fixtures — ใช้ค่าจริงจาก src/config/formulas.ts (FORMULAS เป็น compile-time const)
//
// width = 1.0, style = 'จีบ' → multiplier_pleated = 2.3, hem_offset = 0.30
// totalMeters = 1.0 × 2.3 + 0.30 = 2.60
// fabricYards = ceil(2.60 / 0.90 × 100) / 100 = 2.89
// ─────────────────────────────────────────────────────────────────────────────
const EXPECTED_FABRIC_YARDS = 2.89;

const setupStore = (overrides?: {
  fabricCosts?: Record<string, number>;
  wallpaperCosts?: Record<string, number>;
  areaCosts?: Record<string, number>;
  accessoryCosts?: Record<string, number>;
  laborCosts?: Record<string, LaborCost>;
}) => {
  useAppStore.setState({
    fabricCosts: overrides?.fabricCosts ?? {},
    wallpaperCosts: overrides?.wallpaperCosts ?? {},
    areaCosts: overrides?.areaCosts ?? {},
    accessoryCosts: overrides?.accessoryCosts ?? {},
    laborCosts: overrides?.laborCosts ?? {},
  });
};

// แต่ละ item factory — สร้าง item ที่ใช้ค่าตัวคูณ predictable
const makeCurtainItem = (extra: Record<string, unknown> = {}) => makeItem({
  type: ITEM_TYPES.CURTAIN,
  id: 'test-item',
  width_m: 1.0,
  height_m: 2.0,
  style: 'จีบ',
  layer_mode: LAYER_MODES.MAIN,
  price_per_m_raw: 800, // sellingPrice = 800 (ทำให้ margin > 30% ถ้าต้นทุนต่ำ)
  ...extra,
});

const cheapLabor: LaborCost = {
  style: 'จีบ',
  rate: 100,
  unit: 'meter',
  min_price: 50, // ต่ำกว่า rate × width → ไม่ trigger min
};

describe('💵 CostEngine — Priority Chain & Dispatch', () => {
  beforeEach(() => {
    setupStore();
  });

  // ───────────────────────────────────────────────────────────────────────
  // กลุ่ม A: Section A — Main Fabric Priority Chain
  // ───────────────────────────────────────────────────────────────────────
  describe('Section A — Main Fabric Priority Chain', () => {
    it('A1: Priority 1 — Vault hit (item.code → fabricCosts[code])', () => {
      setupStore({ fabricCosts: { F001: 100 } });
      const item = makeCurtainItem({ code: 'F001' });

      const result = CostEngine.analyze(item);

      expect(result.fabricCost).toBeCloseTo(EXPECTED_FABRIC_YARDS * 100, 2); // 289
      expect(result.status).not.toBe('unknown');
      expect(result.usedQuantity).toBeCloseTo(EXPECTED_FABRIC_YARDS, 2);
      expect(result.unit).toBe('หลา');
    });

    it('A2: Priority 2 — direct entry (price_sqyd) when Vault miss', () => {
      setupStore({ fabricCosts: {} });
      const item = makeCurtainItem({ code: undefined, price_sqyd: 50 });

      const result = CostEngine.analyze(item);

      expect(result.fabricCost).toBeCloseTo(EXPECTED_FABRIC_YARDS * 50, 2); // 144.5
      expect(result.status).not.toBe('unknown');
    });

    it('A3: Priority 3 — Pro Mode (_cost_fabric) when no code + no price_sqyd', () => {
      const item = makeCurtainItem({
        code: undefined,
        price_sqyd: 0,
        _cost_fabric: 250, // ต้นทุนรวม override
      });

      const result = CostEngine.analyze(item);

      expect(result.fabricCost).toBe(250);
      expect(result.status).not.toBe('unknown');
    });

    it('A4: All sources empty → hasMissingCost → status "unknown"', () => {
      const item = makeCurtainItem({
        code: undefined,
        price_sqyd: 0,
        _cost_fabric: 0,
      });

      const result = CostEngine.analyze(item);

      expect(result.status).toBe('unknown');
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  // กลุ่ม B: Section B — Sheer Fabric Priority Chain (DOUBLE only)
  // ───────────────────────────────────────────────────────────────────────
  describe('Section B — Sheer Fabric Priority Chain', () => {
    it('B5: DOUBLE + sheer_code hit → sheer Vault used', () => {
      setupStore({
        fabricCosts: { F001: 100, S001: 50 },
      });
      const item = makeCurtainItem({
        code: 'F001',
        layer_mode: LAYER_MODES.DOUBLE,
        sheer_code: 'S001',
        sheer_price_per_m: 300,
      });

      const result = CostEngine.analyze(item);

      expect(result.sheerCost).toBeCloseTo(EXPECTED_FABRIC_YARDS * 50, 2); // 144.5
      expect(result.fabricCost).toBeCloseTo(EXPECTED_FABRIC_YARDS * 100, 2);
      // หมายเหตุ: usedQuantity นับเฉพาะผ้าทึบ (main fabric) ไม่บวก sheerYards
      // — sheerQuantity แยกไว้ต่างหากสำหรับ DOUBLE
      expect(result.usedQuantity).toBeCloseTo(EXPECTED_FABRIC_YARDS, 2);
      expect(result.sheerQuantity).toBeCloseTo(EXPECTED_FABRIC_YARDS, 2);
    });

    it('B6: DOUBLE + sheer_code miss + sheer_price_sqyd → direct used', () => {
      setupStore({ fabricCosts: { F001: 100 } }); // no S001
      const item = makeCurtainItem({
        code: 'F001',
        layer_mode: LAYER_MODES.DOUBLE,
        sheer_code: undefined,
        sheer_price_sqyd: 40,
        sheer_price_per_m: 300,
      });

      const result = CostEngine.analyze(item);

      expect(result.sheerCost).toBeCloseTo(EXPECTED_FABRIC_YARDS * 40, 2); // 115.6
    });

    it('B7: DOUBLE + no sheer source → status "unknown"', () => {
      setupStore({ fabricCosts: { F001: 100 } });
      const item = makeCurtainItem({
        code: 'F001',
        layer_mode: LAYER_MODES.DOUBLE,
        sheer_code: undefined,
        sheer_price_sqyd: 0,
        sheer_price_per_m: 300, // sellingPrice ยังคำนวณได้
      });

      const result = CostEngine.analyze(item);

      expect(result.status).toBe('unknown');
    });

    it('B8: SINGLE mode → Section B ไม่ run → sheerCost = 0', () => {
      setupStore({ fabricCosts: { F001: 100 } });
      const item = makeCurtainItem({
        code: 'F001',
        layer_mode: LAYER_MODES.MAIN, // SINGLE
      });

      const result = CostEngine.analyze(item);

      expect(result.sheerCost).toBe(0);
      expect(result.sheerQuantity).toBe(0);
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  // กลุ่ม C: Labor edge cases
  // ───────────────────────────────────────────────────────────────────────
  describe('Labor edge cases', () => {
    it('C9: labor min_price applied when computed labor < min', () => {
      setupStore({
        fabricCosts: { F001: 100 },
        laborCosts: {
          จีบ: { style: 'จีบ', rate: 100, unit: 'meter', min_price: 500 },
        },
      });
      const item = makeCurtainItem({ code: 'F001' });

      const result = CostEngine.analyze(item);

      // computed = 1.0 × 100 = 100, min = 500 → min applied
      expect(result.laborCost).toBe(500);
      expect(result.isLaborMinApplied).toBe(true);
    });

    it('C10: DOUBLE mode adds separate "ผ้าโปร่ง" labor', () => {
      setupStore({
        fabricCosts: { F001: 100, S001: 50 },
        laborCosts: {
          จีบ: cheapLabor,
          ผ้าโปร่ง: { style: 'ผ้าโปร่ง', rate: 70, unit: 'meter', min_price: 50 },
        },
      });
      const item = makeCurtainItem({
        code: 'F001',
        layer_mode: LAYER_MODES.DOUBLE,
        sheer_code: 'S001',
        sheer_price_per_m: 300,
      });

      const result = CostEngine.analyze(item);

      // mainLabor = 1.0 × 100 = 100 / sheerLabor = 1.0 × 70 = 70 → total = 170
      expect(result.laborCost).toBe(170);
    });

    it('C11: labor key missing (no entry) → laborCost = 0, no crash', () => {
      setupStore({
        fabricCosts: { F001: 100 },
        laborCosts: {}, // ไม่มี 'จีบ' key
      });
      const item = makeCurtainItem({ code: 'F001' });

      const result = CostEngine.analyze(item);

      expect(result.laborCost).toBe(0);
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  // กลุ่ม D: Item type dispatch
  // ───────────────────────────────────────────────────────────────────────
  describe('Item type dispatch', () => {
    it('D12: Wallpaper → rolls × wallpaperCosts[wallpaper_code]', () => {
      setupStore({ wallpaperCosts: { W001: 800 } });
      // FORMULAS.wallpaper: roll_width=0.53, roll_length=10, waste_margin=0.10
      // input: widths=['2.0'], height_m=2.5
      //   cutLength = 2.5 + 0.10 = 2.60
      //   stripsPerRoll = floor(10/2.60) = 3
      //   totalStripsNeeded = ceil(2.0/0.53) = 4
      //   rolls = ceil(4/3) = 2
      const item = makeItem({
        type: ITEM_TYPES.WALLPAPER,
        id: 'wp-1',
        widths: ['2.0'],
        height_m: 2.5,
        wallpaper_code: 'W001',
        price_per_roll: 1500,
      });

      const result = CostEngine.analyze(item);

      expect(result.usedQuantity).toBe(2); // 2 ม้วน
      expect(result.unit).toBe('ม้วน');
      expect(result.fabricCost).toBe(1600); // 2 × 800
      expect(result.totalCost).toBe(1600);
      expect(result.status).not.toBe('unknown');
    });

    it('D12b: Wallpaper cost ใน fabricCosts (vault ผิด) → ไม่ถูกใช้ → unknown', () => {
      // regression guard: ต้นทุนวอลเปเปอร์ต้องอยู่ wallpaperCosts เท่านั้น
      setupStore({ fabricCosts: { W001: 800 } });
      const item = makeItem({
        type: ITEM_TYPES.WALLPAPER,
        id: 'wp-2',
        widths: ['2.0'],
        height_m: 2.5,
        wallpaper_code: 'W001',
        price_per_roll: 1500,
      });

      const result = CostEngine.analyze(item);

      expect(result.fabricCost).toBe(0);
      expect(result.status).toBe('unknown');
    });

    it('D13: Area-type (Wooden Blind) → areaSqyd × areaCosts[code]', () => {
      setupStore({ areaCosts: { B001: 300 } });
      // width=2.0, height=2.0 → 4 sqm × 1.2 = 4.8 sqyd
      const item = makeItem({
        type: ITEM_TYPES.WOODEN_BLIND,
        id: 'wb-1',
        width_m: 2.0,
        height_m: 2.0,
        code: 'B001',
        price_sqyd: 500,
      });

      const result = CostEngine.analyze(item);

      expect(result.usedQuantity).toBeCloseTo(4.8, 2);
      expect(result.unit).toBe('ตร.ล.');
      expect(result.fabricCost).toBeCloseTo(4.8 * 300, 2); // 1440
      expect(result.status).not.toBe('unknown');
    });

    it('D13b: Area-type ไม่มี code → ใช้ areaCosts[item.type] เป็น fallback', () => {
      // ตรงกับ buildSummary: costKey = code || item.type
      setupStore({ areaCosts: { [ITEM_TYPES.WOODEN_BLIND]: 250 } });
      const item = makeItem({
        type: ITEM_TYPES.WOODEN_BLIND,
        id: 'wb-2',
        width_m: 2.0,
        height_m: 2.0,
        code: undefined,
        price_sqyd: 500,
      });

      const result = CostEngine.analyze(item);

      expect(result.fabricCost).toBeCloseTo(4.8 * 250, 2); // 1200
      expect(result.status).not.toBe('unknown');
    });

    it('D13c: Area-type ไม่มีต้นทุนเลย → unknown', () => {
      setupStore({ areaCosts: {} });
      const item = makeItem({
        type: ITEM_TYPES.WOODEN_BLIND,
        id: 'wb-3',
        width_m: 2.0,
        height_m: 2.0,
        code: 'B999',
        price_sqyd: 500,
      });

      const result = CostEngine.analyze(item);

      expect(result.fabricCost).toBe(0);
      expect(result.status).toBe('unknown');
    });

    it('D14: Removal → totalCost = 0 regardless of selling price', () => {
      const item = makeItem({
        type: ITEM_TYPES.REMOVAL,
        id: 'rm-1',
        quantity: 5,
        price_per_item: 200,
        description: 'รื้อม่านเก่า',
      });

      const result = CostEngine.analyze(item);

      expect(result.totalCost).toBe(0);
      expect(result.unit).toBe('จุด');
      expect(result.usedQuantity).toBe(5);
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  // กลุ่ม E: Status flag transitions
  // ───────────────────────────────────────────────────────────────────────
  describe('Status flag transitions', () => {
    it('E15: marginPercent >= 30% → "profit"', () => {
      setupStore({
        fabricCosts: { F001: 50 }, // ถูก → กำไรเยอะ
        accessoryCosts: { rail_pleated: 0 },
        laborCosts: { จีบ: cheapLabor },
      });
      const item = makeCurtainItem({
        code: 'F001',
        price_per_m_raw: 1000, // sellingPrice = 1000
      });

      const result = CostEngine.analyze(item);

      // fabricCost = 2.89 × 50 = 144.5
      // laborCost = 1.0 × 100 = 100
      // totalCost ≈ 244.5
      // margin = (1000 - 244.5) / 1000 × 100 = 75.55% → profit
      expect(result.status).toBe('profit');
      expect(result.marginPercent).toBeGreaterThanOrEqual(30);
    });

    it('E16: 0 ≤ marginPercent < 30% → "warning"', () => {
      setupStore({
        fabricCosts: { F001: 200 }, // แพงพอที่จะ margin ต่ำแต่ไม่ขาดทุน
        accessoryCosts: { rail_pleated: 100 },
        laborCosts: { จีบ: { style: 'จีบ', rate: 100, unit: 'meter', min_price: 50 } },
      });
      const item = makeCurtainItem({
        code: 'F001',
        price_per_m_raw: 1000, // sellingPrice = 1000
      });

      const result = CostEngine.analyze(item);

      // fabricCost = 2.89 × 200 = 578
      // railCost = 1.0 × 100 = 100
      // laborCost = 1.0 × 100 = 100
      // totalCost = 778
      // margin = (1000 - 778) / 1000 × 100 = 22.2% → warning
      expect(result.status).toBe('warning');
      expect(result.marginPercent).toBeGreaterThanOrEqual(0);
      expect(result.marginPercent).toBeLessThan(30);
    });

    it('E17: profitAmount < 0 → "loss"', () => {
      setupStore({
        fabricCosts: { F001: 500 }, // แพงเกินขาย
        accessoryCosts: { rail_pleated: 100 },
        laborCosts: { จีบ: { style: 'จีบ', rate: 200, unit: 'meter', min_price: 50 } },
      });
      const item = makeCurtainItem({
        code: 'F001',
        price_per_m_raw: 500, // sellingPrice = 500 (น้อยกว่าทุน)
      });

      const result = CostEngine.analyze(item);

      // fabricCost = 2.89 × 500 = 1445 → profit = 500 - (1445 + 100 + 200) < 0
      expect(result.status).toBe('loss');
      expect(result.profitAmount).toBeLessThan(0);
    });

    it('E18: hasMissingCost overrides all → "unknown" (เหนือ profit/loss)', () => {
      setupStore({
        fabricCosts: {}, // ไม่มีต้นทุนเลย
        accessoryCosts: { rail_pleated: 0 },
        laborCosts: { จีบ: cheapLabor },
      });
      const item = makeCurtainItem({
        code: 'F001', // มี code แต่ Vault ไม่มี
        price_per_m_raw: 1000,
      });

      const result = CostEngine.analyze(item);

      // แม้ profit margin จะดูดี แต่ฟ้า code ใน Vault ไม่เจอ → unknown
      expect(result.status).toBe('unknown');
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  // กลุ่ม F: ขาจับราง ม่านแป๊บ/สอดราง (accessory cost)
  // ───────────────────────────────────────────────────────────────────────
  describe('Rod brackets (ม่านแป๊บ)', () => {
    it('F19: แป๊บ → accCost = rod_brackets_per_set × rod_bracket และรวมใน totalCost', () => {
      setupStore({
        fabricCosts: { F001: 50 },
        accessoryCosts: { rail_rod: 70, rod_bracket: 35 },
        laborCosts: { แป๊บ: { style: 'แป๊บ', rate: 100, unit: 'meter', min_price: 50 } },
      });
      const item = makeCurtainItem({
        code: 'F001',
        style: 'แป๊บ',
        price_per_m_raw: 1000,
      });

      const result = CostEngine.analyze(item);

      const expectedAcc = FORMULAS.materials.rod_brackets_per_set * 35; // 4 × 35 = 140
      expect(result.accCost).toBe(expectedAcc);
      expect(result.railCost).toBeCloseTo(70, 2); // width 1.0 × rail_rod 70
      // totalCost = fabric(2.89×50) + rail(70) + labor(1.0×100) + acc(140)
      expect(result.totalCost).toBeCloseTo(
        EXPECTED_FABRIC_YARDS * 50 + 70 + 100 + expectedAcc,
        2
      );
    });

    it('F20: style อื่น (จีบ) → accCost = 0 แม้มี rod_bracket ในคลัง', () => {
      setupStore({
        fabricCosts: { F001: 50 },
        accessoryCosts: { rod_bracket: 35 },
        laborCosts: { จีบ: cheapLabor },
      });
      const item = makeCurtainItem({ code: 'F001' }); // style 'จีบ' (default)

      const result = CostEngine.analyze(item);

      expect(result.accCost).toBe(0);
    });
  });
});
