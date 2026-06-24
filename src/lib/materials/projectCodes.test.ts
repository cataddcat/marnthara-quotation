import { describe, it, expect } from 'vitest';
import { collectProjectCodes } from './projectCodes';
import { ITEM_TYPES, FAVORITE_CATEGORIES } from '@/config/enums';
import type { Room } from '@/types';

const room = (items: unknown[]): Room => ({ id: 'r1', name: 'ห้อง', items } as unknown as Room);

describe('collectProjectCodes', () => {
  it('ผ้าทึบ/ผ้าโปร่ง: อ่าน code/price_per_m_raw + sheer_code/sheer_price_per_m', () => {
    const rooms = [
      room([
        {
          id: 'i1',
          type: ITEM_TYPES.CURTAIN,
          code: 'F001',
          price_per_m_raw: 300,
          sheer_code: 'S001',
          sheer_price_per_m: 150,
        },
      ]),
    ];
    expect(collectProjectCodes(rooms, FAVORITE_CATEGORIES.CURTAIN_MAIN)).toEqual([
      { code: 'F001', sellPrice: 300 },
    ]);
    expect(collectProjectCodes(rooms, FAVORITE_CATEGORIES.CURTAIN_SHEER)).toEqual([
      { code: 'S001', sellPrice: 150 },
    ]);
  });

  it('distinct + normalize (case/space) + ราคาล่าสุดที่ไม่เป็นศูนย์ชนะ', () => {
    const rooms = [
      room([
        { id: 'i1', type: ITEM_TYPES.CURTAIN, code: 'f001', price_per_m_raw: 0 },
        { id: 'i2', type: ITEM_TYPES.CURTAIN, code: ' F001 ', price_per_m_raw: 320 },
      ]),
    ];
    expect(collectProjectCodes(rooms, FAVORITE_CATEGORIES.CURTAIN_MAIN)).toEqual([
      { code: 'F001', sellPrice: 320 },
    ]);
  });

  it('wallpaper: อ่าน wallpaper_code/price_per_roll', () => {
    const rooms = [
      room([{ id: 'i1', type: ITEM_TYPES.WALLPAPER, wallpaper_code: 'W9', price_per_roll: 900 }]),
    ];
    expect(collectProjectCodes(rooms, FAVORITE_CATEGORIES.WALLPAPER)).toEqual([
      { code: 'W9', sellPrice: 900 },
    ]);
  });

  it('area: เลือกเฉพาะ item.type === category (code/price_sqyd)', () => {
    const rooms = [
      room([
        { id: 'i1', type: ITEM_TYPES.ROLLER_BLIND, code: 'RB1', price_sqyd: 450 },
        { id: 'i2', type: ITEM_TYPES.WOODEN_BLIND, code: 'WB1', price_sqyd: 500 },
      ]),
    ];
    expect(collectProjectCodes(rooms, FAVORITE_CATEGORIES.ROLLER_BLIND)).toEqual([
      { code: 'RB1', sellPrice: 450 },
    ]);
  });

  it('ข้ามรหัสว่าง', () => {
    const rooms = [
      room([{ id: 'i1', type: ITEM_TYPES.CURTAIN, code: '', price_per_m_raw: 100 }]),
    ];
    expect(collectProjectCodes(rooms, FAVORITE_CATEGORIES.CURTAIN_MAIN)).toEqual([]);
  });
});
