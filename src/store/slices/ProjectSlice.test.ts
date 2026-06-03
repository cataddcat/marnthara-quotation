// src/store/slices/ProjectSlice.test.ts
// Room + Item CRUD actions + zundo undo/redo round-trip
// (store reset อัตโนมัติใน src/test/setup.ts afterEach)

import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '@/store/useAppStore';
import { FAVORITE_CATEGORIES, ITEM_TYPES } from '@/config/enums';
import { asItemData, makeCurtain, makeWallpaper, makeAreaItem } from '@/test/factories';

const store = () => useAppStore.getState();
const temporal = () => useAppStore.temporal.getState();

beforeEach(() => {
  useAppStore.setState({ rooms: [] });
  temporal().clear();
});

describe('ProjectSlice — Room actions', () => {
  it('addRoom เพิ่มห้อง + ใช้ชื่อ default ตามลำดับ', () => {
    store().addRoom();
    store().addRoom();
    const rooms = store().rooms;
    expect(rooms).toHaveLength(2);
    expect(rooms[0].name).toBe('ห้อง 1');
    expect(rooms[1].name).toBe('ห้อง 2');
    expect(rooms[0].items).toEqual([]);
    expect(rooms[0].is_suspended).toBe(false);
  });

  it('addRoom รับชื่อกำหนดเองได้', () => {
    store().addRoom('ห้องนอนใหญ่');
    expect(store().rooms[0].name).toBe('ห้องนอนใหญ่');
  });

  it('updateRoom แก้เฉพาะห้องเป้าหมาย (merge partial)', () => {
    store().addRoom('A');
    store().addRoom('B');
    const targetId = store().rooms[0].id;
    store().updateRoom(targetId, { name: 'A-renamed' });
    expect(store().rooms[0].name).toBe('A-renamed');
    expect(store().rooms[1].name).toBe('B');
  });

  it('removeRoom ลบเฉพาะห้องเป้าหมาย', () => {
    store().addRoom('A');
    store().addRoom('B');
    const targetId = store().rooms[0].id;
    store().removeRoom(targetId);
    expect(store().rooms).toHaveLength(1);
    expect(store().rooms[0].name).toBe('B');
  });

  it('duplicateRoom สร้างสำเนา + id ใหม่ทั้งห้องและ items', () => {
    store().addRoom('A');
    const roomId = store().rooms[0].id;
    store().addItem(roomId, asItemData(makeCurtain()));
    store().duplicateRoom(roomId);

    const rooms = store().rooms;
    expect(rooms).toHaveLength(2);
    expect(rooms[1].name).toBe('A (Copy)');
    expect(rooms[1].id).not.toBe(rooms[0].id);
    expect(rooms[1].items[0].id).not.toBe(rooms[0].items[0].id);
  });

  it('toggleRoomSuspension สลับ is_suspended', () => {
    store().addRoom('A');
    const roomId = store().rooms[0].id;
    store().toggleRoomSuspension(roomId);
    expect(store().rooms[0].is_suspended).toBe(true);
    store().toggleRoomSuspension(roomId);
    expect(store().rooms[0].is_suspended).toBe(false);
  });
});

describe('ProjectSlice — Item actions', () => {
  let roomId: string;
  beforeEach(() => {
    store().addRoom('ห้องทดสอบ');
    roomId = store().rooms[0].id;
  });

  it('addItem เพิ่ม item + gen id ใหม่', () => {
    store().addItem(roomId, asItemData(makeCurtain({ id: 'should-be-replaced' })));
    const items = store().rooms[0].items;
    expect(items).toHaveLength(1);
    expect(items[0].id).not.toBe('should-be-replaced');
    expect(items[0].type).toBe(ITEM_TYPES.CURTAIN);
  });

  it('updateItem แก้เฉพาะ item เป้าหมาย', () => {
    store().addItem(roomId, asItemData(makeCurtain()));
    store().addItem(roomId, asItemData(makeWallpaper()));
    const firstId = store().rooms[0].items[0].id;
    store().updateItem(roomId, firstId, { width_m: '9.9' });
    expect(store().rooms[0].items[0]).toMatchObject({ width_m: '9.9' });
    expect(store().rooms[0].items[1].type).toBe(ITEM_TYPES.WALLPAPER);
  });

  it('removeItem ลบเฉพาะ item เป้าหมาย', () => {
    store().addItem(roomId, asItemData(makeCurtain()));
    store().addItem(roomId, asItemData(makeWallpaper()));
    const firstId = store().rooms[0].items[0].id;
    store().removeItem(roomId, firstId);
    const items = store().rooms[0].items;
    expect(items).toHaveLength(1);
    expect(items[0].type).toBe(ITEM_TYPES.WALLPAPER);
  });

  it('duplicateItem แทรกสำเนาถัดจากต้นฉบับ + id ใหม่', () => {
    store().addItem(roomId, asItemData(makeCurtain()));
    store().addItem(roomId, asItemData(makeWallpaper()));
    const firstId = store().rooms[0].items[0].id;
    store().duplicateItem(roomId, firstId);

    const items = store().rooms[0].items;
    expect(items).toHaveLength(3);
    expect(items[1].type).toBe(ITEM_TYPES.CURTAIN); // สำเนาแทรกที่ index 1
    expect(items[1].id).not.toBe(firstId);
    expect(items[2].type).toBe(ITEM_TYPES.WALLPAPER); // ของเดิมเลื่อนไป index 2
  });

  it('action ที่อ้าง roomId ไม่มีจริง → no-op (ไม่ throw)', () => {
    expect(() => store().addItem('nope', asItemData(makeCurtain()))).not.toThrow();
    expect(store().rooms[0].items).toHaveLength(0);
  });
});

describe('ProjectSlice — updatePriceByCode', () => {
  let roomId: string;
  beforeEach(() => {
    store().addRoom('A');
    roomId = store().rooms[0].id;
  });

  it('อัปเดตราคาผ้าทึบตาม code + คืนจำนวนที่แก้', () => {
    store().addItem(roomId, asItemData(makeCurtain({ code: 'F001', price_per_m_raw: '100' })));
    store().addItem(roomId, asItemData(makeCurtain({ code: 'F002', price_per_m_raw: '100' })));
    const count = store().updatePriceByCode(FAVORITE_CATEGORIES.CURTAIN_MAIN, 'F001', 555);
    expect(count).toBe(1);
    expect(store().rooms[0].items[0]).toMatchObject({ price_per_m_raw: '555' });
    expect(store().rooms[0].items[1]).toMatchObject({ price_per_m_raw: '100' });
  });

  it('อัปเดตราคา area item (price_sqyd) ตาม type + code', () => {
    store().addItem(
      roomId,
      asItemData(makeAreaItem(ITEM_TYPES.WOODEN_BLIND, { code: 'WB1' }))
    );
    const count = store().updatePriceByCode(ITEM_TYPES.WOODEN_BLIND, 'WB1', 800);
    expect(count).toBe(1);
    expect(store().rooms[0].items[0]).toMatchObject({ price_sqyd: 800 });
  });

  it('ไม่มี code ตรง → คืน 0 + ไม่แก้อะไร', () => {
    store().addItem(roomId, asItemData(makeCurtain({ code: 'F001' })));
    const count = store().updatePriceByCode(FAVORITE_CATEGORIES.CURTAIN_MAIN, 'NOPE', 999);
    expect(count).toBe(0);
  });
});

describe('ProjectSlice — zundo undo/redo', () => {
  it('addRoom → undo คืนสภาพ → redo กลับมา (round-trip)', () => {
    expect(store().rooms).toHaveLength(0);

    store().addRoom('A');
    expect(store().rooms).toHaveLength(1);

    temporal().undo();
    expect(store().rooms).toHaveLength(0);

    temporal().redo();
    expect(store().rooms).toHaveLength(1);
    expect(store().rooms[0].name).toBe('A');
  });
});
