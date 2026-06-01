import { describe, it, expect } from 'vitest';
import { isItemIncomplete, hasMinimumItemData, incompleteLabel } from './item-status';
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

const area = (over: Record<string, unknown>): ItemData =>
  ({
    type: ITEM_TYPES.ROLLER_BLIND,
    id: 'a1',
    width_m: '2.5',
    height_m: '2.0',
    price_sqyd: '',
    code: '',
    ...over,
  }) as ItemData;

const wallpaper = (over: Record<string, unknown>): ItemData =>
  ({
    type: ITEM_TYPES.WALLPAPER,
    id: 'w1',
    widths: ['3.0'],
    height_m: '2.5',
    price_per_roll: '',
    ...over,
  }) as ItemData;

const removal = (over: Record<string, unknown>): ItemData =>
  ({
    type: ITEM_TYPES.REMOVAL,
    id: 'r1',
    quantity: 1,
    price_per_item: 0,
    description: 'รื้อม่านเก่า',
    ...over,
  }) as ItemData;

describe('isItemIncomplete — สินค้าพื้นที่ (มู่ลี่/พาร์ทิชัน)', () => {
  it('มีขนาดแต่ไม่มีราคา → true', () => {
    expect(isItemIncomplete(area({}))).toBe(true);
  });
  it('ใส่ราคา (price_sqyd) แล้ว → false', () => {
    expect(isItemIncomplete(area({ price_sqyd: '350' }))).toBe(false);
  });
  it('ยังไม่มีขนาด → false', () => {
    expect(isItemIncomplete(area({ width_m: '' }))).toBe(false);
  });
  it('กำหนดราคาเอง → false', () => {
    expect(isItemIncomplete(area({ enable_set_price: true, set_price_override: 1200 }))).toBe(false);
  });
  it('พาร์ทิชันใช้เกณฑ์เดียวกัน', () => {
    expect(isItemIncomplete(area({ type: ITEM_TYPES.PARTITION }))).toBe(true);
  });
});

describe('isItemIncomplete — วอลเปเปอร์', () => {
  it('มีผนัง+สูงแต่ไม่มีราคา/ม้วน → true', () => {
    expect(isItemIncomplete(wallpaper({}))).toBe(true);
  });
  it('ใส่ราคา/ม้วนแล้ว → false', () => {
    expect(isItemIncomplete(wallpaper({ price_per_roll: '900' }))).toBe(false);
  });
  it('ยังไม่มีผนัง → false', () => {
    expect(isItemIncomplete(wallpaper({ widths: [''] }))).toBe(false);
  });
});

describe('isItemIncomplete — งานรื้อถอน', () => {
  it('มีรายละเอียดแต่ไม่มีราคา → true', () => {
    expect(isItemIncomplete(removal({}))).toBe(true);
  });
  it('ใส่ราคาต่อหน่วยแล้ว → false', () => {
    expect(isItemIncomplete(removal({ price_per_item: 300 }))).toBe(false);
  });
  it('ไม่มีรายละเอียด → false', () => {
    expect(isItemIncomplete(removal({ description: '' }))).toBe(false);
  });
});

describe('incompleteLabel', () => {
  it('ผ้าม่าน → "ยังไม่ใส่ผ้า"', () => {
    expect(incompleteLabel(curtain({}))).toBe('ยังไม่ใส่ผ้า');
  });
  it('ประเภทอื่น → "ยังไม่ใส่ราคา"', () => {
    expect(incompleteLabel(area({}))).toBe('ยังไม่ใส่ราคา');
  });
});
