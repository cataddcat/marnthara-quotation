import { describe, it, expect } from 'vitest';
import { isItemIncomplete, hasMinimumItemData } from './item-status';
import { ItemData } from '@/types';
import { ITEM_TYPES, LAYER_MODES } from '@/config/enums';

const curtain = (over: Partial<Extract<ItemData, { type: 'curtain' }>>): ItemData =>
  ({
    type: ITEM_TYPES.CURTAIN,
    id: 'c1',
    width_m: '2.5',
    height_m: '2.0',
    style: 'ลอน',
    layer_mode: LAYER_MODES.MAIN,
    ...over,
  }) as ItemData;

describe('isItemIncomplete — ผ้าม่าน', () => {
  it('มีขนาดแต่ยังไม่ใส่ผ้า (main) → true', () => {
    expect(isItemIncomplete(curtain({}))).toBe(true);
  });

  it('ใส่รหัสผ้าแล้ว → false', () => {
    expect(isItemIncomplete(curtain({ code: 'CT-001' }))).toBe(false);
  });

  it('ใส่ราคาผ้า (ไม่ใส่รหัส) → false', () => {
    expect(isItemIncomplete(curtain({ price_per_m_raw: '450' }))).toBe(false);
  });

  it('ยังไม่มีขนาด → false (ยังไม่เริ่ม)', () => {
    expect(isItemIncomplete(curtain({ width_m: '', height_m: '' }))).toBe(false);
  });

  it('กำหนดราคาเอง > 0 → false', () => {
    expect(
      isItemIncomplete(curtain({ enable_set_price: true, set_price_override: 1500 }))
    ).toBe(false);
  });

  it('กำหนดราคาเองแต่ override = 0 → ยังถือว่า incomplete', () => {
    expect(
      isItemIncomplete(curtain({ enable_set_price: true, set_price_override: 0 }))
    ).toBe(true);
  });

  describe('โหมดผ้าโปร่ง (SHEER)', () => {
    it('ใส่แต่ผ้าทึบ ไม่ใส่โปร่ง → true', () => {
      expect(
        isItemIncomplete(curtain({ layer_mode: LAYER_MODES.SHEER, code: 'CT-001' }))
      ).toBe(true);
    });
    it('ใส่ผ้าโปร่งแล้ว → false', () => {
      expect(
        isItemIncomplete(curtain({ layer_mode: LAYER_MODES.SHEER, sheer_code: 'SH-001' }))
      ).toBe(false);
    });
  });

  describe('โหมดทึบ+โปร่ง (DOUBLE)', () => {
    it('ใส่ทึบแต่ขาดโปร่ง → true', () => {
      expect(
        isItemIncomplete(curtain({ layer_mode: LAYER_MODES.DOUBLE, code: 'CT-001' }))
      ).toBe(true);
    });
    it('ใส่ครบทั้งทึบและโปร่ง → false', () => {
      expect(
        isItemIncomplete(
          curtain({ layer_mode: LAYER_MODES.DOUBLE, code: 'CT-001', sheer_code: 'SH-001' })
        )
      ).toBe(false);
    });
  });
});

describe('hasMinimumItemData', () => {
  it('ผ้าม่าน/มู่ลี่: ต้องมีความกว้าง', () => {
    expect(hasMinimumItemData(ITEM_TYPES.CURTAIN, { width_m: '2.5' })).toBe(true);
    expect(hasMinimumItemData(ITEM_TYPES.CURTAIN, { width_m: '' })).toBe(false);
    expect(hasMinimumItemData(ITEM_TYPES.WOODEN_BLIND, { width_m: 1.2 })).toBe(true);
  });

  it('วอลเปเปอร์: ดูจากผนังแรก (widths[0])', () => {
    expect(hasMinimumItemData(ITEM_TYPES.WALLPAPER, { widths: ['3.0'] })).toBe(true);
    expect(hasMinimumItemData(ITEM_TYPES.WALLPAPER, { widths: [''] })).toBe(false);
    expect(hasMinimumItemData(ITEM_TYPES.WALLPAPER, {})).toBe(false);
  });

  it('งานรื้อถอน: ดูจาก description', () => {
    expect(hasMinimumItemData(ITEM_TYPES.REMOVAL, { description: 'รื้อม่านเก่า' })).toBe(true);
    expect(hasMinimumItemData(ITEM_TYPES.REMOVAL, { description: '   ' })).toBe(false);
    expect(hasMinimumItemData(ITEM_TYPES.REMOVAL, {})).toBe(false);
  });
});

describe('isItemIncomplete — ประเภทอื่น (ยังไม่รองรับ)', () => {
  it('งานรื้อถอน → false เสมอ', () => {
    const removal = {
      type: ITEM_TYPES.REMOVAL,
      id: 'r1',
      quantity: 1,
      price_per_item: 0,
      description: '',
    } as ItemData;
    expect(isItemIncomplete(removal)).toBe(false);
  });
});
