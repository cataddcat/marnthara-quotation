// src/lib/catalog/contract.test.ts
// Catalog Contract — schema validation (pure) + importCatalog/exportCatalog (store)

import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '@/store/useAppStore';
import { FAVORITE_CATEGORIES } from '@/config/enums';
import {
  CatalogContractSchema,
  isCatalogContract,
  CATALOG_CONTRACT_MAGIC,
  CATALOG_CONTRACT_VERSION,
} from './contract';

const store = () => useAppStore.getState();

const makeContract = (entries: Record<string, unknown>[]) => ({
  contract: CATALOG_CONTRACT_MAGIC,
  version: CATALOG_CONTRACT_VERSION,
  generated_at: '2026-06-05T00:00:00Z',
  source: 'test',
  entries,
});

describe('CatalogContract — schema validation', () => {
  it('valid contract → parse success', () => {
    const res = CatalogContractSchema.safeParse(
      makeContract([{ code: 'F001', category: FAVORITE_CATEGORIES.CURTAIN_MAIN, cost: 90 }])
    );
    expect(res.success).toBe(true);
  });

  it('wrong contract magic → fail', () => {
    const res = CatalogContractSchema.safeParse({ ...makeContract([]), contract: 'something.else' });
    expect(res.success).toBe(false);
  });

  it('wrong version → fail', () => {
    const res = CatalogContractSchema.safeParse({ ...makeContract([]), version: 99 });
    expect(res.success).toBe(false);
  });

  it('unknown category → fail', () => {
    const res = CatalogContractSchema.safeParse(
      makeContract([{ code: 'X', category: 'not_a_category', cost: 1 }])
    );
    expect(res.success).toBe(false);
  });

  it('entry ขาด code → fail', () => {
    const res = CatalogContractSchema.safeParse(
      makeContract([{ category: FAVORITE_CATEGORIES.CURTAIN_MAIN, cost: 1 }])
    );
    expect(res.success).toBe(false);
  });

  it('isCatalogContract ตรวจ magic', () => {
    expect(isCatalogContract(makeContract([]))).toBe(true);
    expect(isCatalogContract({ foo: 1 })).toBe(false);
    expect(isCatalogContract(null)).toBe(false);
  });
});

describe('CatalogContract — importCatalog (store)', () => {
  beforeEach(() => {
    useAppStore.setState({ favorites: {} });
    store().resetProductionCosts();
  });

  it('cost → vault ตาม category (fabric / wallpaper / area)', () => {
    const res = store().importCatalog(
      makeContract([
        { code: 'F001', category: FAVORITE_CATEGORIES.CURTAIN_MAIN, cost: 90 },
        { code: 'WP01', category: FAVORITE_CATEGORIES.WALLPAPER, cost: 700 },
        { code: 'VL01', category: FAVORITE_CATEGORIES.VERTICAL_BLIND, cost: 320 },
      ])
    );
    expect(res.ok).toBe(true);
    expect(res.imported).toBe(3);
    expect(store().fabricCosts.F001).toBe(90);
    expect(store().wallpaperCosts.WP01).toBe(700);
    expect(store().areaCosts.VL01).toBe(320);
  });

  it('sell_price + note → inventory item (code uppercase)', () => {
    store().importCatalog(
      makeContract([
        { code: 'f002', category: FAVORITE_CATEGORIES.CURTAIN_MAIN, sell_price: 550, note: 'ทึบ' },
      ])
    );
    const list = store().favorites[FAVORITE_CATEGORIES.CURTAIN_MAIN];
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ code: 'F002', default_price_per_m: 550, note: 'ทึบ' });
  });

  it('re-import code เดิม → upsert ไม่ซ้ำ + อัปเดตราคา/ทุน', () => {
    store().importCatalog(
      makeContract([
        { code: 'F001', category: FAVORITE_CATEGORIES.CURTAIN_MAIN, sell_price: 500, cost: 90 },
      ])
    );
    store().importCatalog(
      makeContract([
        { code: 'F001', category: FAVORITE_CATEGORIES.CURTAIN_MAIN, sell_price: 600, cost: 100 },
      ])
    );
    const list = store().favorites[FAVORITE_CATEGORIES.CURTAIN_MAIN];
    expect(list).toHaveLength(1);
    expect(list[0].default_price_per_m).toBe(600);
    expect(store().fabricCosts.F001).toBe(100);
  });

  it('payload ไม่ valid → ok:false + errors', () => {
    const res = store().importCatalog({ contract: 'bad', version: 1, entries: [] });
    expect(res.ok).toBe(false);
    expect(res.errors.length).toBeGreaterThan(0);
  });
});

describe('CatalogContract — exportCatalog round-trip', () => {
  beforeEach(() => {
    useAppStore.setState({ favorites: {} });
    store().resetProductionCosts();
  });

  it('export → valid contract + import กลับได้ค่าเดิม', () => {
    store().importCatalog(
      makeContract([
        { code: 'F001', category: FAVORITE_CATEGORIES.CURTAIN_MAIN, cost: 90, sell_price: 350, note: 'A' },
        { code: 'WP01', category: FAVORITE_CATEGORIES.WALLPAPER, cost: 700, sell_price: 1200 },
      ])
    );
    const json = store().exportCatalog();
    const parsed = CatalogContractSchema.safeParse(JSON.parse(json));
    expect(parsed.success).toBe(true);

    // ล้าง store แล้ว import กลับ
    useAppStore.setState({ favorites: {} });
    store().resetProductionCosts();
    const res = store().importCatalog(JSON.parse(json));
    expect(res.ok).toBe(true);
    expect(store().fabricCosts.F001).toBe(90);
    expect(store().wallpaperCosts.WP01).toBe(700);
    expect(store().favorites[FAVORITE_CATEGORIES.CURTAIN_MAIN][0].default_price_per_m).toBe(350);
  });
});
