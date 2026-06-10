// src/store/slices/InventorySlice.test.ts
// Favorites (inventory) actions + cost routing ไป Cost Vault + import (JSON/base64)

import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '@/store/useAppStore';
import { FAVORITE_CATEGORIES } from '@/config/enums';

const store = () => useAppStore.getState();
const CAT = FAVORITE_CATEGORIES.CURTAIN_MAIN;

beforeEach(() => {
  useAppStore.setState({ favorites: {} });
  store().resetProductionCosts();
});

describe('InventorySlice — addFavorite', () => {
  it('เพิ่ม favorite + gen id', () => {
    store().addFavorite(CAT, { code: 'F001', default_price_per_m: 350 });
    const list = store().favorites[CAT];
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ code: 'F001', default_price_per_m: 350 });
    expect(list[0].id).toBeTruthy();
  });

  it('cost_per_yard > 0 → route ไป fabricCosts + strip ออกจาก favorite', () => {
    store().addFavorite(CAT, { code: 'F001', default_price_per_m: 350, cost_per_yard: 90 });
    expect(store().fabricCosts.F001).toBe(90);
    expect(store().favorites[CAT][0]).not.toHaveProperty('cost_per_yard');
  });

  it('wallpaper category → route cost ไป wallpaperCosts', () => {
    store().addFavorite(FAVORITE_CATEGORIES.WALLPAPER, {
      code: 'WP01',
      default_price_per_m: 1200,
      cost_per_yard: 700,
    });
    expect(store().wallpaperCosts.WP01).toBe(700);
  });

  it('area category (wooden_blind) → route cost ไป areaCosts', () => {
    store().addFavorite(FAVORITE_CATEGORIES.WOODEN_BLIND, {
      code: 'WB1',
      default_price_per_m: 500,
      cost_per_yard: 300,
    });
    expect(store().areaCosts.WB1).toBe(300);
  });
});

describe('InventorySlice — update / remove', () => {
  it('updateFavorite แก้ field', () => {
    store().addFavorite(CAT, { code: 'F001', default_price_per_m: 350 });
    const favId = store().favorites[CAT][0].id;
    store().updateFavorite(CAT, favId, { default_price_per_m: 400 });
    expect(store().favorites[CAT][0].default_price_per_m).toBe(400);
  });

  it('removeFavorite ลบตาม id', () => {
    store().addFavorite(CAT, { code: 'F001', default_price_per_m: 350 });
    store().addFavorite(CAT, { code: 'F002', default_price_per_m: 360 });
    const favId = store().favorites[CAT][0].id;
    store().removeFavorite(CAT, favId);
    const list = store().favorites[CAT];
    expect(list).toHaveLength(1);
    expect(list[0].code).toBe('F002');
  });
});

describe('InventorySlice — importFavorites', () => {
  it('import JSON ตรงๆ (object เป็น category map) → true', () => {
    const payload = JSON.stringify({
      [CAT]: [{ id: 'a', code: 'F001', default_price_per_m: 350 }],
    });
    expect(store().importFavorites(payload)).toBe(true);
    expect(store().favorites[CAT]).toHaveLength(1);
  });

  it('import แบบมี wrapper { favorites: {...} } → true', () => {
    const payload = JSON.stringify({
      favorites: { [CAT]: [{ id: 'a', code: 'F001', default_price_per_m: 350 }] },
    });
    expect(store().importFavorites(payload)).toBe(true);
    expect(store().favorites[CAT]).toHaveLength(1);
  });

  it('import base64-encoded JSON → true', () => {
    const json = JSON.stringify({
      [CAT]: [{ id: 'a', code: 'F001', default_price_per_m: 350 }],
    });
    const b64 = btoa(unescape(encodeURIComponent(json)));
    expect(store().importFavorites(b64)).toBe(true);
    expect(store().favorites[CAT]).toHaveLength(1);
  });

  it('import route cost_per_yard ไป vault + strip', () => {
    const payload = JSON.stringify({
      [CAT]: [{ id: 'a', code: 'F001', default_price_per_m: 350, cost_per_yard: 88 }],
    });
    store().importFavorites(payload);
    expect(store().fabricCosts.F001).toBe(88);
    expect(store().favorites[CAT][0]).not.toHaveProperty('cost_per_yard');
  });

  it('import ขยะที่ไม่ใช่ JSON/base64 → false', () => {
    expect(store().importFavorites('@@@ not valid @@@')).toBe(false);
  });

  it('JSON ถูกไวยากรณ์แต่รูปร่างผิด (item ไม่มี code / ราคาเป็น string) → false ไม่แตะ state', () => {
    expect(store().importFavorites(JSON.stringify({ [CAT]: [{ id: 'a' }] }))).toBe(false);
    expect(
      store().importFavorites(
        JSON.stringify({ [CAT]: [{ code: 'F001', default_price_per_m: 'แพง' }] })
      )
    ).toBe(false);
    expect(store().favorites[CAT] ?? []).toHaveLength(0);
  });

  it('รายการที่ไม่มี id → เติม id ให้อัตโนมัติ', () => {
    const ok = store().importFavorites(
      JSON.stringify({ [CAT]: [{ code: 'F009', default_price_per_m: 100 }] })
    );
    expect(ok).toBe(true);
    expect(store().favorites[CAT][0].id).toBeTruthy();
  });

  it('cost_per_yard ที่พิมพ์เล็ก → เขียน vault ด้วยรหัส normalize, CostEngine อ่านเจอผ่าน vaultLookup', () => {
    const payload = JSON.stringify({
      [CAT]: [{ id: 'a', code: 'f777', default_price_per_m: 350, cost_per_yard: 60 }],
    });
    expect(store().importFavorites(payload)).toBe(true);
    expect(store().fabricCosts.F777).toBe(60); // เขียนเป็น UPPERCASE เสมอ
  });
});
