import { describe, it, expect } from 'vitest';
import { ITEM_TYPES, EXPENSE_CATEGORIES } from '@/config/enums';
import { CATALOG_CATEGORIES } from '@/lib/vault';
import { CATALOG_CONTRACT_MAGIC } from '@/lib/catalog/contract';
import { CUSTOMER_CONTRACT_MAGIC, CUSTOMER_CONTRACT_VERSION } from '@/lib/customers/contract';

// ไฟล์ตัวอย่างใน test-data/ (import JSON ตรงๆ — vitest/vite รองรับ)
import demoFull from '../../test-data/demo-full-coverage.json';
import demoMinimal from '../../test-data/demo-minimal.json';
import demoCosts from '../../test-data/demo-costs-only.json';
import demoFavorites from '../../test-data/demo-favorites-only.json';
import fullBackup from '../../test-data/mtr-test-full-backup.json';
import costImport from '../../test-data/mtr-test-cost-import.json';
import favImport from '../../test-data/mtr-test-favorites-import.json';
import catalogImport from '../../test-data/mtr-test-catalog-import.json';
import customersImport from '../../test-data/mtr-test-customers-import.json';

/**
 * Regression guard: ตรวจว่าไฟล์ใน test-data/ ยังตรงกับ schema ปัจจุบันของแอป
 * (import path: DataModal.handleFileChange / CostDataSlice.importSecrets /
 *  InventorySlice.importFavorites + importCatalog / CustomerRegistrySlice.importCustomers)
 * ถ้า refactor schema แล้วลืมอัปเดตไฟล์ทดสอบ → test ชุดนี้จะ fail
 *
 * วางใน src/ เพื่อให้รันอัตโนมัติกับ `npm run test:run` (include = src/**)
 */

type Json = Record<string, unknown>;
const asJson = (v: unknown): Json => v as Json;

const VALID_ITEM_TYPES = new Set<string>(Object.values(ITEM_TYPES));
const VALID_LAYER_MODES = new Set(['main', 'sheer', 'double']);
const VALID_FAV_CATEGORIES = new Set([
  'curtain_main',
  'curtain_sheer',
  'wallpaper',
  'wooden_blind',
  'roller_blind',
  'vertical_blind',
  'aluminum_blind',
  'partition',
  'pleated_screen',
]);
const VALID_EXPENSE_CATEGORIES = new Set<string>(Object.values(EXPENSE_CATEGORIES));
const VALID_CATALOG_CATEGORIES = new Set(CATALOG_CATEGORIES.map((c) => c.id));
const SKU_FIELDS = ['brand', 'model', 'color', 'variant'] as const;
// ฟิลด์ schema เก่าที่ต้องไม่หลงเหลือ (legacy 'set' curtain + field ที่เลิกใช้)
const LEGACY_FIELDS = [
  'fabric_code',
  'sheer_fabric_code',
  'track_color',
  'rail_price_per_m',
  'use_rail',
];
// ครบ 7 vault ปัจจุบัน (เพิ่ม serviceCosts + hardwareCosts จาก 5 เดิม)
const PRODUCTION_KEYS = [
  'laborCosts',
  'serviceCosts',
  'accessoryCosts',
  'hardwareCosts',
  'fabricCosts',
  'wallpaperCosts',
  'areaCosts',
];

const allItems = (file: Json): Json[] => {
  const rooms = (file.rooms as Json[] | undefined) ?? [];
  return rooms.flatMap((r) => (asJson(r).items as Json[] | undefined) ?? []);
};

const allFavItems = (favorites: Json): Json[] =>
  Object.values(favorites).flatMap((items) => (items as Json[] | undefined) ?? []);

// ไฟล์แบบ full restore (ผ่านปุ่ม Upload File → DataModal.handleFileChange)
const RESTORE_FILES = [
  { name: 'demo-full-coverage', data: asJson(demoFull) },
  { name: 'demo-minimal', data: asJson(demoMinimal) },
  { name: 'mtr-test-full-backup', data: asJson(fullBackup) },
];

describe('test-data — โครงสร้างตรงกับ schema ปัจจุบัน', () => {
  describe.each(RESTORE_FILES)('ไฟล์ restore: $name', ({ data }) => {
    it('มี top-level keys ที่ handleFileChange ต้องใช้', () => {
      for (const k of ['customer', 'shopConfig', 'discount', 'rooms', 'favorites']) {
        expect(data[k], `ขาด key "${k}"`).toBeDefined();
      }
      expect(Array.isArray(data.rooms)).toBe(true);
    });

    it('ไม่มี block "formulas" (formulas เป็น compile-time constant แล้ว แอปไม่ import)', () => {
      expect(data.formulas).toBeUndefined();
    });

    it('production (ถ้ามี) มีครบ 7 cost vaults + costInclude', () => {
      if (data.production) {
        const prod = asJson(data.production);
        for (const k of PRODUCTION_KEYS) {
          expect(prod[k], `production ขาด "${k}"`).toBeDefined();
        }
        expect(prod.costInclude, 'production ขาด "costInclude"').toBeDefined();
        const ci = asJson(prod.costInclude);
        for (const k of ['labor', 'rail', 'service', 'shipping']) {
          expect(typeof ci[k], `costInclude.${k} ต้องเป็น boolean`).toBe('boolean');
        }
      }
    });

    it('payments (ถ้ามี) — receipts/expenses เป็น array + field ครบ', () => {
      if (data.payments) {
        const pay = asJson(data.payments);
        const receipts = (pay.receipts as Json[] | undefined) ?? [];
        const expenses = (pay.expenses as Json[] | undefined) ?? [];
        expect(Array.isArray(pay.receipts)).toBe(true);
        expect(Array.isArray(pay.expenses)).toBe(true);
        for (const r of receipts) {
          expect(typeof r.id).toBe('string');
          expect(typeof r.label).toBe('string');
          expect(typeof r.amount).toBe('number');
        }
        for (const e of expenses) {
          expect(typeof e.id).toBe('string');
          expect(typeof e.amount).toBe('number');
          expect(typeof e.paid).toBe('boolean');
          expect(
            VALID_EXPENSE_CATEGORIES.has(e.category as string),
            `expense category ไม่ถูกต้อง: ${String(e.category)}`
          ).toBe(true);
        }
      }
    });

    it('ทุก item ใช้ type ที่ถูกต้อง (ไม่ใช่ legacy "set")', () => {
      for (const item of allItems(data)) {
        expect(
          VALID_ITEM_TYPES.has(item.type as string),
          `type ไม่ถูกต้อง: ${String(item.type)}`
        ).toBe(true);
      }
    });

    it('ไม่มีฟิลด์ schema เก่าหลงเหลือในแต่ละ item', () => {
      for (const item of allItems(data)) {
        for (const f of LEGACY_FIELDS) {
          expect(item[f], `พบฟิลด์เก่า "${f}" ใน item ${String(item.id)}`).toBeUndefined();
        }
      }
    });

    it('curtain ทุกตัวมี layer_mode ที่ถูกต้อง (กันคิดราคาผิดเหมือน type:set เดิม)', () => {
      for (const item of allItems(data)) {
        if (item.type === ITEM_TYPES.CURTAIN) {
          expect(
            VALID_LAYER_MODES.has(item.layer_mode as string),
            `layer_mode ไม่ถูกต้อง: ${String(item.layer_mode)}`
          ).toBe(true);
        }
      }
    });

    it('favorites SKU (ถ้ามี brand/model/color/variant) ต้องเป็น string', () => {
      const favorites = asJson(data.favorites);
      for (const item of allFavItems(favorites)) {
        for (const f of SKU_FIELDS) {
          if (item[f] !== undefined) {
            expect(typeof item[f], `favorites.${f} ต้องเป็น string`).toBe('string');
          }
        }
      }
    });
  });

  it('demo-full-coverage: มี SKU อย่างน้อย 1 รายการ + payments + 7 vault (coverage หลัก)', () => {
    const data = asJson(demoFull);
    const hasSku = allFavItems(asJson(data.favorites)).some((it) =>
      SKU_FIELDS.some((f) => typeof it[f] === 'string')
    );
    expect(hasSku, 'ไฟล์หลักควรมีตัวอย่าง SKU').toBe(true);
    expect(data.payments, 'ไฟล์หลักควรมี payments').toBeDefined();
    const prod = asJson(data.production);
    expect(prod.serviceCosts).toBeDefined();
    expect(prod.hardwareCosts).toBeDefined();
  });

  it('demo-costs-only: costs อยู่ใต้ "production" ครบ 7 vault (สำหรับ Upload File restore)', () => {
    const prod = asJson(asJson(demoCosts).production);
    expect(prod).toBeDefined();
    for (const k of PRODUCTION_KEYS) expect(prod[k], `ขาด "${k}"`).toBeDefined();
    expect(prod.costInclude).toBeDefined();
  });

  it('mtr-test-cost-import: costs อยู่ top-level (สำหรับ importSecrets — แท็บ "ต้นทุน")', () => {
    const f = asJson(costImport);
    // importSecrets ต้องการอย่างน้อยหนึ่งใน laborCosts/accessoryCosts/fabricCosts ที่ top-level
    expect(f.laborCosts ?? f.accessoryCosts ?? f.fabricCosts).toBeDefined();
    // ครบ vault ใหม่ + costInclude
    expect(f.serviceCosts).toBeDefined();
    expect(f.hardwareCosts).toBeDefined();
    expect(f.costInclude).toBeDefined();
  });

  it('favorites: หมวดหมู่ถูกต้อง + ทุกรายการมี code', () => {
    const favBlocks: Json[] = [
      asJson(asJson(demoFavorites).favorites), // demo-favorites-only: { favorites: {...} }
      asJson(favImport), // mtr-test-favorites-import: category map ตรงๆ
    ];
    for (const block of favBlocks) {
      for (const [cat, items] of Object.entries(block)) {
        expect(VALID_FAV_CATEGORIES.has(cat), `หมวดไม่รู้จัก: ${cat}`).toBe(true);
        for (const item of items as Json[]) {
          expect(typeof item.code, `รายการใน "${cat}" ขาด code`).toBe('string');
        }
      }
    }
  });

  it('catalog contract (marnthara.catalog): magic/version + entries category valid', () => {
    const c = asJson(catalogImport);
    expect(c.contract).toBe(CATALOG_CONTRACT_MAGIC);
    expect([1, 2]).toContain(c.version);
    const entries = (c.entries as Json[] | undefined) ?? [];
    expect(entries.length).toBeGreaterThan(0);
    for (const e of entries) {
      expect(typeof e.code, 'entry ขาด code').toBe('string');
      expect(
        VALID_CATALOG_CATEGORIES.has(e.category as string),
        `catalog category ไม่รู้จัก: ${String(e.category)}`
      ).toBe(true);
      if (e.cost !== undefined) expect(typeof e.cost).toBe('number');
      if (e.sell_price !== undefined) expect(typeof e.sell_price).toBe('number');
    }
    // ครอบทุก category (สินค้า + ราง) — coverage guard
    const covered = new Set(entries.map((e) => e.category as string));
    for (const def of CATALOG_CATEGORIES) {
      expect(covered.has(def.id), `catalog ตัวอย่างขาดหมวด: ${def.id}`).toBe(true);
    }
  });

  it('customer contract (marnthara.customers): magic/version + entries มี code/name', () => {
    const c = asJson(customersImport);
    expect(c.contract).toBe(CUSTOMER_CONTRACT_MAGIC);
    expect(c.version).toBe(CUSTOMER_CONTRACT_VERSION);
    const entries = (c.entries as Json[] | undefined) ?? [];
    expect(entries.length).toBeGreaterThan(0);
    for (const e of entries) {
      expect(typeof e.code, 'customer entry ขาด code').toBe('string');
      expect(typeof e.name, 'customer entry ขาด name').toBe('string');
    }
  });
});
