import { describe, it, expect } from 'vitest';
import { ITEM_TYPES } from '@/config/enums';

// ไฟล์ตัวอย่างใน test-data/ (import JSON ตรงๆ — vitest/vite รองรับ)
import demoFull from '../../test-data/demo-full-coverage.json';
import demoMinimal from '../../test-data/demo-minimal.json';
import demoCosts from '../../test-data/demo-costs-only.json';
import demoFavorites from '../../test-data/demo-favorites-only.json';
import fullBackup from '../../test-data/mtr-test-full-backup.json';
import costImport from '../../test-data/mtr-test-cost-import.json';
import favImport from '../../test-data/mtr-test-favorites-import.json';

/**
 * Regression guard: ตรวจว่าไฟล์ใน test-data/ ยังตรงกับ schema ปัจจุบันของแอป
 * (import path: DataModal.handleFileChange / CostDataSlice.importSecrets / InventorySlice.importFavorites)
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
// ฟิลด์ schema เก่าที่ต้องไม่หลงเหลือ (legacy 'set' curtain + field ที่เลิกใช้)
const LEGACY_FIELDS = [
  'fabric_code',
  'sheer_fabric_code',
  'track_color',
  'rail_price_per_m',
  'use_rail',
];
const PRODUCTION_KEYS = [
  'laborCosts',
  'accessoryCosts',
  'fabricCosts',
  'wallpaperCosts',
  'areaCosts',
];

const allItems = (file: Json): Json[] => {
  const rooms = (file.rooms as Json[] | undefined) ?? [];
  return rooms.flatMap((r) => (asJson(r).items as Json[] | undefined) ?? []);
};

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

    it('production (ถ้ามี) มีครบ 5 cost vaults', () => {
      if (data.production) {
        const prod = asJson(data.production);
        for (const k of PRODUCTION_KEYS) {
          expect(prod[k], `production ขาด "${k}"`).toBeDefined();
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
  });

  it('demo-costs-only: costs อยู่ใต้ "production" (สำหรับ Upload File restore)', () => {
    const prod = asJson(asJson(demoCosts).production);
    expect(prod).toBeDefined();
    for (const k of PRODUCTION_KEYS) expect(prod[k], `ขาด "${k}"`).toBeDefined();
  });

  it('mtr-test-cost-import: costs อยู่ top-level (สำหรับ importSecrets — แท็บ "ต้นทุน")', () => {
    const f = asJson(costImport);
    // importSecrets ต้องการอย่างน้อยหนึ่งใน laborCosts/accessoryCosts/fabricCosts ที่ top-level
    expect(f.laborCosts ?? f.accessoryCosts ?? f.fabricCosts).toBeDefined();
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
});
