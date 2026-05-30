// src/store/slices/ShopProfileSlice.test.ts
// Shop config + discount + logo actions

import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '@/store/useAppStore';
import { DEFAULT_SHOP_CONFIG } from '@/config/constants';

const store = () => useAppStore.getState();

beforeEach(() => {
  useAppStore.setState({
    shopConfig: DEFAULT_SHOP_CONFIG,
    discount: { type: 'amount', value: 0, is_enabled: false },
  });
});

describe('ShopProfileSlice — discount', () => {
  it('setDiscount เปิดส่วนลด percent', () => {
    store().setDiscount({ type: 'percent', value: 5, is_enabled: true });
    expect(store().discount).toEqual({ type: 'percent', value: 5, is_enabled: true });
  });

  it('setDiscount is_enabled gate ปิดได้', () => {
    store().setDiscount({ type: 'amount', value: 100, is_enabled: false });
    expect(store().discount.is_enabled).toBe(false);
    expect(store().discount.value).toBe(100);
  });
});

describe('ShopProfileSlice — shopConfig', () => {
  it('updateShopConfig merge partial', () => {
    store().updateShopConfig({ name: 'ร้านใหม่' });
    expect(store().shopConfig.name).toBe('ร้านใหม่');
    // field อื่นยังอยู่ครบ
    expect(store().shopConfig.phone).toBe(DEFAULT_SHOP_CONFIG.phone);
  });

  it('updateShopConfig แก้ baseVatRate', () => {
    store().updateShopConfig({ baseVatRate: 0 });
    expect(store().shopConfig.baseVatRate).toBe(0);
  });

  it('updateLogo ตั้ง logoUrl โดยไม่แตะ field อื่น', () => {
    store().updateLogo('data:image/png;base64,AAA');
    expect(store().shopConfig.logoUrl).toBe('data:image/png;base64,AAA');
    expect(store().shopConfig.name).toBe(DEFAULT_SHOP_CONFIG.name);
  });
});
