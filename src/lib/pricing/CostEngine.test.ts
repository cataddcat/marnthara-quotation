// src/lib/pricing/CostEngine.test.ts

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CostEngine } from './CostEngine';
import { useAppStore } from '@/store/useAppStore';
import { useCatalogStore } from '@/store/useCatalogStore';
import { ITEM_TYPES, LAYER_MODES, FAVORITE_CATEGORIES } from '@/config/enums';
import { DEFAULT_COST_INCLUDE, type LaborCost, type CostInclude } from '@/store/slices/CostDataSlice';
import { makeItem } from './__test-helpers';

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
  hardwareCosts?: Record<string, number>;
  laborCosts?: Record<string, LaborCost>;
  serviceCosts?: Record<string, number>;
  costInclude?: CostInclude;
}) => {
  useAppStore.setState({
    fabricCosts: overrides?.fabricCosts ?? {},
    wallpaperCosts: overrides?.wallpaperCosts ?? {},
    areaCosts: overrides?.areaCosts ?? {},
    accessoryCosts: overrides?.accessoryCosts ?? {},
    hardwareCosts: overrides?.hardwareCosts ?? {},
    laborCosts: overrides?.laborCosts ?? {},
    serviceCosts: overrides?.serviceCosts ?? {},
    // reset เสมอ — กัน test ที่ปิดสวิตช์รั่วไป test ถัดไป (store เป็น singleton)
    costInclude: overrides?.costInclude ?? DEFAULT_COST_INCLUDE,
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

    it('C10b: พับ unit "meter" → labor = width × rate (ไม่ใช่ area กว้าง×สูง)', () => {
      setupStore({
        fabricCosts: { F001: 50 },
        laborCosts: { พับ: { style: 'พับ', rate: 300, unit: 'meter', min_price: 0 } },
      });
      const item = makeCurtainItem({ code: 'F001', style: 'พับ', width_m: 2.0, height_m: 3.0 });

      const result = CostEngine.analyze(item);

      // meter: 2.0 × 300 = 600 (ไม่ใช่ 2.0 × 3.0 × 300)
      expect(result.laborCost).toBe(600);
    });

    it('C10c: DOUBLE → ค่าเย็บ = ทึบ + โปร่ง รวมกัน (เท่ากันต่อเมตร)', () => {
      setupStore({
        fabricCosts: { F001: 50, S001: 30 },
        laborCosts: {
          ลอน: { style: 'ลอน', rate: 130, unit: 'meter', min_price: 0 },
          ผ้าโปร่ง: { style: 'ผ้าโปร่ง', rate: 130, unit: 'meter', min_price: 0 },
        },
      });
      const item = makeCurtainItem({
        code: 'F001',
        style: 'ลอน',
        width_m: 2.0,
        layer_mode: LAYER_MODES.DOUBLE,
        sheer_code: 'S001',
        sheer_price_per_m: 300,
      });

      const result = CostEngine.analyze(item);

      // main 2.0×130=260 + sheer 2.0×130=260 = 520
      expect(result.laborCost).toBe(520);
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

    it('D13c: มุ้งจีบ (pleated) คิดทุนต่อ ตร.ม. — ไม่ใช่ ตร.ล. (ตรงกับ vault.ts/AreaStrategy)', () => {
      setupStore({ areaCosts: { PS01: 300 } });
      // width=2.0, height=2.0 → 4 ตร.ม. (เดิมคูณ 4.8 ตร.ล. = ทุนเกิน 20%)
      const item = makeItem({
        type: ITEM_TYPES.PLEATED_SCREEN,
        id: 'ps-1',
        width_m: 2.0,
        height_m: 2.0,
        code: 'PS01',
        price_sqyd: 500, // ป้ายฟอร์ม = บาท/ตร.ม.
      });

      const result = CostEngine.analyze(item);

      expect(result.usedQuantity).toBeCloseTo(4.0, 2);
      expect(result.unit).toBe('ตร.ม.');
      expect(result.fabricCost).toBeCloseTo(4.0 * 300, 2); // 1200
      expect(result.sellingPrice).toBeCloseTo(4.0 * 500, 2); // ขายก็ต่อ ตร.ม. เช่นกัน
      expect(result.status).not.toBe('unknown');
    });

    it('D13d: ทุนเขียนด้วยรหัสพิมพ์เล็ก → vaultLookup ยังหาเจอ (normalize fallback)', () => {
      setupStore({ areaCosts: { B009: 300 } }); // vault เก็บ UPPERCASE (ผ่าน importCatalog)
      const item = makeItem({
        type: ITEM_TYPES.WOODEN_BLIND,
        id: 'wb-3',
        width_m: 2.0,
        height_m: 2.0,
        code: 'b009', // ผู้ใช้พิมพ์เล็กในฟอร์ม
        price_sqyd: 500,
      });

      const result = CostEngine.analyze(item);

      expect(result.fabricCost).toBeCloseTo(4.8 * 300, 2);
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

    it('D14: Removal ไม่มีอัตรารื้อถอน (serviceCosts ว่าง) → totalCost = 0 (ไม่ผูกกับราคาขาย)', () => {
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

    it('D14b: Removal → totalCost = removal_per_point × จำนวนจุด', () => {
      setupStore({ serviceCosts: { removal_per_point: 300 } });
      const item = makeItem({
        type: ITEM_TYPES.REMOVAL,
        id: 'rm-2',
        quantity: 5,
        price_per_item: 200,
        description: 'รื้อม่านเก่า',
      });

      const result = CostEngine.analyze(item);

      expect(result.totalCost).toBe(1500); // 300 × 5
      expect(result.laborCost).toBe(1500); // นับเป็นค่าแรงบริการ
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  // กลุ่ม Rail: Priority chain (catalog SKU → legacy)
  // ───────────────────────────────────────────────────────────────────────
  describe('Rail cost priority (catalog SKU vs legacy)', () => {
    it('rail_code + hardwareCosts → ใช้ทุน SKU (ไม่ใช่ legacy)', () => {
      setupStore({ accessoryCosts: { rail_wave: 130 }, hardwareCosts: { 'RW-SKU': 300 } });
      const item = makeCurtainItem({ style: 'ลอน', width_m: 2.0, rail_code: 'RW-SKU' });
      expect(CostEngine.analyze(item).railCost).toBe(600); // 2.0 × 300
    });

    it('ไม่มี rail_code → legacy accessoryCosts[rail_wave]', () => {
      setupStore({ accessoryCosts: { rail_wave: 130 }, hardwareCosts: { 'RW-SKU': 300 } });
      const item = makeCurtainItem({ style: 'ลอน', width_m: 2.0 });
      expect(CostEngine.analyze(item).railCost).toBe(260); // 2.0 × 130
    });

    it('rail_code แต่ SKU ไม่มีทุน (0) → fallback legacy', () => {
      setupStore({ accessoryCosts: { rail_wave: 130 }, hardwareCosts: {} });
      const item = makeCurtainItem({ style: 'ลอน', width_m: 2.0, rail_code: 'MISSING' });
      expect(CostEngine.analyze(item).railCost).toBe(260); // 2.0 × 130
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
  // กลุ่ม F: component (ขาจับ/ลูกล้อ/เทป) รวมในชุดราง → ไม่คิดทุนแยก
  // ───────────────────────────────────────────────────────────────────────
  describe('Bundled rail components (ไม่คิดทุน component แยก)', () => {
    it('F19: แป๊บ → accCost = 0 (ขาจับรวมในชุดราง) · totalCost ไม่บวกขาจับ', () => {
      setupStore({
        fabricCosts: { F001: 50 },
        accessoryCosts: { rail_rod: 70 },
        laborCosts: { แป๊บ: { style: 'แป๊บ', rate: 100, unit: 'meter', min_price: 50 } },
      });
      const item = makeCurtainItem({
        code: 'F001',
        style: 'แป๊บ',
        price_per_m_raw: 1000,
      });

      const result = CostEngine.analyze(item);

      expect(result.accCost).toBe(0);
      expect(result.railCost).toBeCloseTo(70, 2); // width 1.0 × rail_rod 70
      // totalCost = fabric(2.89×50) + rail(70) + labor(1.0×100) — ไม่มี acc แยก
      expect(result.totalCost).toBeCloseTo(EXPECTED_FABRIC_YARDS * 50 + 70 + 100, 2);
    });

    it('F20: style อื่น (จีบ) → accCost = 0', () => {
      setupStore({
        fabricCosts: { F001: 50 },
        laborCosts: { จีบ: cheapLabor },
      });
      const item = makeCurtainItem({ code: 'F001' }); // style 'จีบ' (default)

      const result = CostEngine.analyze(item);

      expect(result.accCost).toBe(0);
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  // กลุ่ม G: สวิตช์ costInclude — "ปิดนับ" ทุนส่วนที่ไม่แน่นอน (ProductionSettings)
  // ปิดแล้วต้อง: ข้ามทุนส่วนนั้น · ไม่ขึ้น unknown · รายงานใน excludedComponents
  // ───────────────────────────────────────────────────────────────────────
  describe('costInclude toggles (ปิดการคำนวณบางส่วน)', () => {
    it('G21: labor=false → laborCost 0 (ทั้งทึบ+โปร่ง), excludedComponents มี "ค่าเย็บ", ไม่ unknown', () => {
      setupStore({
        fabricCosts: { F001: 50, S001: 30 },
        laborCosts: {
          จีบ: cheapLabor,
          ผ้าโปร่ง: { style: 'ผ้าโปร่ง', rate: 130, unit: 'meter', min_price: 0 },
        },
        costInclude: { labor: false, rail: true, service: true, shipping: false },
      });
      const item = makeCurtainItem({
        code: 'F001',
        layer_mode: LAYER_MODES.DOUBLE,
        sheer_code: 'S001',
      });

      const result = CostEngine.analyze(item);

      expect(result.laborCost).toBe(0);
      expect(result.excludedComponents).toContain('ค่าเย็บ');
      expect(result.status).not.toBe('unknown');
      // ทุนผ้ายังคิดปกติ
      expect(result.fabricCost).toBeGreaterThan(0);
      expect(result.sheerCost).toBeGreaterThan(0);
    });

    it('G22: rail=false → railCost 0 แม้มี accessoryCosts, excludedComponents มี "ค่าราง/อุปกรณ์"', () => {
      setupStore({
        fabricCosts: { F001: 50 },
        accessoryCosts: { rail_pleated: 100 },
        laborCosts: { จีบ: cheapLabor },
        costInclude: { labor: true, rail: false, service: true, shipping: false },
      });
      const item = makeCurtainItem({ code: 'F001' });

      const result = CostEngine.analyze(item);

      expect(result.railCost).toBe(0);
      expect(result.excludedComponents).toContain('ค่าราง/อุปกรณ์');
      // totalCost = fabric + labor เท่านั้น
      expect(result.totalCost).toBeCloseTo((result.fabricCost ?? 0) + (result.laborCost ?? 0), 2);
    });

    it('G23: service=false → removal item ทุน 0, excludedComponents มี "ค่าบริการ"', () => {
      setupStore({
        serviceCosts: { removal_per_point: 300 },
        costInclude: { labor: true, rail: true, service: false, shipping: false },
      });
      const item = makeItem({
        type: ITEM_TYPES.REMOVAL,
        id: 'removal-1',
        quantity: 4,
        price_per_item: 500,
      });

      const result = CostEngine.analyze(item);

      expect(result.totalCost).toBe(0);
      expect(result.excludedComponents).toContain('ค่าบริการ');
      expect(result.status).not.toBe('unknown');
    });

    it('G24: ทุกสวิตช์เปิด (default) → excludedComponents ว่าง', () => {
      setupStore({
        fabricCosts: { F001: 50 },
        laborCosts: { จีบ: cheapLabor },
      });
      const item = makeCurtainItem({ code: 'F001' });

      const result = CostEngine.analyze(item);

      expect(result.excludedComponents).toEqual([]);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 🔌 External catalog overlay (useCatalogStore) — ดึงทุนสินค้าจาก DB ภายนอก (HANDOFF §11.9)
// หลักการ: คลังทับเมื่อมี · ของฉันเติมเมื่อคลังไม่มี · ออฟไลน์ใช้ของฉัน.
// status==='ready' → merge ต่อ key: catalog ทับ vault (รหัสซ้ำ DB ชนะ; รหัสที่ DB ไม่มี → vault เติม)
// ค่าแรง/บริการ = ของร้านเอง อ่าน vault เดิมเสมอ
// ─────────────────────────────────────────────────────────────────────────────
describe('🔌 CostEngine — External catalog overlay', () => {
  beforeEach(() => {
    setupStore();
    useCatalogStore.getState().reset();
  });
  afterEach(() => {
    useCatalogStore.getState().reset(); // กัน status 'ready' รั่วไป test อื่น (store เป็น singleton)
  });

  it('catalog ready + รหัสซ้ำ → DB ทับ vault (รหัสซ้ำ DB ชนะ)', () => {
    setupStore({ fabricCosts: { F001: 999 } }); // vault ซ้ำกับ catalog → ถูก DB ทับ
    useCatalogStore
      .getState()
      .setCatalog([{ code: 'F001', category: FAVORITE_CATEGORIES.CURTAIN_MAIN, cost: 100 }], false);
    const result = CostEngine.analyze(makeCurtainItem({ code: 'F001' }));
    expect(result.fabricCost).toBeCloseTo(EXPECTED_FABRIC_YARDS * 100, 2); // ×100 (catalog) ไม่ใช่ ×999
    expect(result.status).not.toBe('unknown');
  });

  it('catalog ready แต่ไม่มีรหัสนั้น → vault (ทุนที่จด) เติมช่องว่าง (§11.9)', () => {
    setupStore({ fabricCosts: { F001: 100 } }); // vault มี แต่ catalog ไม่มี → ของฉันเติม
    useCatalogStore
      .getState()
      .setCatalog([{ code: 'OTHER', category: FAVORITE_CATEGORIES.CURTAIN_MAIN, cost: 50 }], false);
    const result = CostEngine.analyze(makeCurtainItem({ code: 'F001' }));
    expect(result.fabricCost).toBeCloseTo(EXPECTED_FABRIC_YARDS * 100, 2); // ×100 จาก vault (เติมช่องว่าง)
    expect(result.status).not.toBe('unknown');
  });

  it('catalog ready + ทั้งซ้ำและช่องว่าง → DB ชนะรหัสซ้ำ, vault เติมรหัสที่ DB ไม่มี (§11.9)', () => {
    setupStore({ fabricCosts: { F001: 999, F002: 100 } }); // F001 ซ้ำกับ catalog, F002 มีแต่ใน vault
    useCatalogStore
      .getState()
      .setCatalog([{ code: 'F001', category: FAVORITE_CATEGORIES.CURTAIN_MAIN, cost: 100 }], false);
    // รหัสซ้ำ F001 → DB ชนะ (×100 ไม่ใช่ ×999)
    expect(CostEngine.analyze(makeCurtainItem({ code: 'F001' })).fabricCost).toBeCloseTo(
      EXPECTED_FABRIC_YARDS * 100,
      2
    );
    // รหัส F002 ที่ DB ไม่มี → vault เติม (×100)
    const gap = CostEngine.analyze(makeCurtainItem({ code: 'F002' }));
    expect(gap.fabricCost).toBeCloseTo(EXPECTED_FABRIC_YARDS * 100, 2);
    expect(gap.status).not.toBe('unknown');
  });

  it("catalog 'empty' (DB ว่าง) → fallback persisted vault เดิม", () => {
    setupStore({ fabricCosts: { F001: 100 } });
    useCatalogStore.getState().setCatalog([], false); // empty → status 'empty'
    const result = CostEngine.analyze(makeCurtainItem({ code: 'F001' }));
    expect(result.fabricCost).toBeCloseTo(EXPECTED_FABRIC_YARDS * 100, 2);
    expect(result.status).not.toBe('unknown');
  });

  it('catalog ready ไม่กระทบค่าแรง (labor ยังอ่าน vault ของร้าน)', () => {
    setupStore({ laborCosts: { จีบ: cheapLabor } });
    useCatalogStore
      .getState()
      .setCatalog([{ code: 'F001', category: FAVORITE_CATEGORIES.CURTAIN_MAIN, cost: 100 }], false);
    const result = CostEngine.analyze(makeCurtainItem({ code: 'F001' }));
    expect(result.laborCost).toBe(100); // 1.0 × 100 จาก vault labor เดิม
  });

  it('area item: catalog ready → ทุน/ตร.ล. มาจาก catalog (route เข้า areaCosts)', () => {
    setupStore({ areaCosts: { B009: 999 } }); // vault ในแอป ควรถูกข้าม
    useCatalogStore
      .getState()
      .setCatalog([{ code: 'B009', category: FAVORITE_CATEGORIES.WOODEN_BLIND, cost: 300 }], false);
    const item = makeItem({
      type: ITEM_TYPES.WOODEN_BLIND,
      id: 'wb-cat',
      width_m: 2.0,
      height_m: 2.0,
      code: 'B009',
      price_sqyd: 500,
    });
    const result = CostEngine.analyze(item);
    expect(result.fabricCost).toBeCloseTo(4.8 * 300, 2); // ×300 (catalog) ไม่ใช่ ×999 (vault)
    expect(result.status).not.toBe('unknown');
  });
});
