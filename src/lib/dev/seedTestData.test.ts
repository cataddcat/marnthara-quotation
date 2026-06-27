import { describe, it, expect, beforeEach } from 'vitest';
import { TEST_CODES, TEST_CODE_COUNT, TEST_CUSTOMER_IDS, seedTestData } from './seedTestData';
import { useAppStore } from '@/store/useAppStore';
import { ITEM_TYPES, FAVORITE_CATEGORIES } from '@/config/enums';
import { isItemIncomplete } from '@/lib/item-status';
import type { ItemData } from '@/types';

const VALID_FAV_CATEGORIES = new Set<string>(Object.values(FAVORITE_CATEGORIES));
const ALL_ITEM_TYPES = new Set<string>(Object.values(ITEM_TYPES));

describe('seedTestData — รหัสทดสอบ 2/หมวด', () => {
  it('มี 9 หมวด หมวดละ 2 รหัส (รวม 18) และทุกหมวดเป็น FAVORITE_CATEGORIES', () => {
    const cats = Object.keys(TEST_CODES);
    expect(cats).toHaveLength(9);
    for (const cat of cats) {
      expect(VALID_FAV_CATEGORIES.has(cat), `หมวดไม่รู้จัก: ${cat}`).toBe(true);
      expect(TEST_CODES[cat]).toHaveLength(2);
    }
    expect(TEST_CODE_COUNT).toBe(18);
  });

  it('ทุกรหัสมี cost < sellPrice (เห็นส่วนต่างเสมอ)', () => {
    for (const arr of Object.values(TEST_CODES)) {
      for (const c of arr) {
        expect(c.cost).toBeGreaterThan(0);
        expect(c.cost, `${c.code}: cost ต้อง < sellPrice`).toBeLessThan(c.sellPrice);
      }
    }
  });
});

describe('seedTestData — ลูกค้าทดสอบ 3 ราย', () => {
  // global afterEach (src/test/setup.ts) คืน store เป็น pristine ทุก test → ต้อง seed ใหม่ทุกครั้ง
  beforeEach(() => {
    seedTestData();
  });

  it('คืนสรุป 18 รหัส · 3 ลูกค้า · 10 ห้อง', () => {
    const r = seedTestData();
    expect(r).toEqual({ codes: 18, customers: 3, rooms: 10 });
  });

  it('เก็บงานลง jobs[] ครบ 3 ราย ด้วย id คงที่ + เปิดงาน A เป็นงานปัจจุบัน', () => {
    const s = useAppStore.getState();
    for (const id of TEST_CUSTOMER_IDS) {
      expect(s.jobs.some((j) => j.id === id), `ขาดงาน ${id}`).toBe(true);
    }
    // งาน A (ครบทุกเคส, 5 ห้อง) = งานปัจจุบันหลัง seed
    expect(s.currentJobId).toBe(TEST_CUSTOMER_IDS[0]);
    expect(s.customer.id).toBe(TEST_CUSTOMER_IDS[0]);
    expect(s.rooms).toHaveLength(5);
  });

  it('งาน A ครอบคลุมสินค้าครบทั้ง 9 ชนิด', () => {
    const types = new Set<string>(
      useAppStore.getState().rooms.flatMap((room) => room.items.map((it: ItemData) => it.type))
    );
    expect(types).toEqual(ALL_ITEM_TYPES);
  });

  it('ทุกรายการของทุกงานมีข้อมูลครบ (ไม่ติดธง isItemIncomplete)', () => {
    const items = useAppStore
      .getState()
      .jobs.flatMap((j) => j.rooms.flatMap((room) => room.items));
    for (const it of items) {
      expect(isItemIncomplete(it), `ยังไม่ครบ: ${it.type} ${it.id}`).toBe(false);
    }
  });

  it('seed material drafts ครบ 9 หมวด หมวดละ 2', () => {
    const drafts = useAppStore.getState().materialDrafts;
    for (const cat of Object.keys(TEST_CODES)) {
      expect(Object.keys(drafts[cat] ?? {}), `หมวด ${cat}`).toHaveLength(2);
    }
  });

  it('idempotent — กดซ้ำไม่เกิดงานทดสอบซ้ำในชั้นวาง', () => {
    seedTestData();
    const ids = useAppStore.getState().jobs.map((j) => j.id);
    for (const id of TEST_CUSTOMER_IDS) {
      expect(ids.filter((x) => x === id), `งาน ${id} ซ้ำ`).toHaveLength(1);
    }
  });
});
