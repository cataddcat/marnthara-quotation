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

describe('ProjectSlice — reorder', () => {
  const codes = (items: { code?: string }[]) => items.map((i) => i.code);

  it('reorderRooms ย้ายห้องไปตำแหน่งใหม่', () => {
    store().addRoom('A');
    store().addRoom('B');
    store().addRoom('C');
    store().reorderRooms(0, 2); // A → ท้ายสุด
    expect(store().rooms.map((r) => r.name)).toEqual(['B', 'C', 'A']);
  });

  it('reorderRooms index เท่ากัน/นอกช่วง → no-op (ref เดิม)', () => {
    store().addRoom('A');
    store().addRoom('B');
    const before = store().rooms;
    store().reorderRooms(0, 0);
    store().reorderRooms(0, 5);
    store().reorderRooms(-1, 1);
    expect(store().rooms).toBe(before);
    expect(store().rooms.map((r) => r.name)).toEqual(['A', 'B']);
  });

  it('reorderItems ย้ายลำดับ item ภายในห้อง', () => {
    store().addRoom('R');
    const roomId = store().rooms[0].id;
    store().addItem(roomId, asItemData(makeCurtain({ code: 'I0' })));
    store().addItem(roomId, asItemData(makeCurtain({ code: 'I1' })));
    store().addItem(roomId, asItemData(makeCurtain({ code: 'I2' })));
    store().reorderItems(roomId, 2, 0); // I2 → หน้าสุด
    expect(codes(store().rooms[0].items as { code?: string }[])).toEqual(['I2', 'I0', 'I1']);
  });

  it('reorderItems ไม่กระทบห้องอื่น (ref items ห้องอื่นคงเดิม)', () => {
    store().addRoom('R1');
    store().addRoom('R2');
    const r1 = store().rooms[0].id;
    const r2 = store().rooms[1].id;
    store().addItem(r1, asItemData(makeCurtain({ code: 'A' })));
    store().addItem(r1, asItemData(makeCurtain({ code: 'B' })));
    store().addItem(r2, asItemData(makeCurtain({ code: 'X' })));
    const r2ItemsBefore = store().rooms[1].items;
    store().reorderItems(r1, 0, 1);
    expect(codes(store().rooms[0].items as { code?: string }[])).toEqual(['B', 'A']);
    expect(store().rooms[1].items).toBe(r2ItemsBefore);
  });

  it('reorderItems index นอกช่วง → no-op', () => {
    store().addRoom('R');
    const roomId = store().rooms[0].id;
    store().addItem(roomId, asItemData(makeCurtain({ code: 'I0' })));
    const before = store().rooms;
    store().reorderItems(roomId, 0, 9);
    expect(store().rooms).toBe(before);
  });

  it('reorderRooms → undo คืนลำดับเดิม', () => {
    store().addRoom('A');
    store().addRoom('B');
    temporal().clear();
    store().reorderRooms(0, 1);
    expect(store().rooms.map((r) => r.name)).toEqual(['B', 'A']);
    temporal().undo();
    expect(store().rooms.map((r) => r.name)).toEqual(['A', 'B']);
  });

  it('moveItemToRoom ย้าย item ข้ามห้อง + ลบจากต้นทาง', () => {
    store().addRoom('A');
    store().addRoom('B');
    const a = store().rooms[0].id;
    const b = store().rooms[1].id;
    store().addItem(a, asItemData(makeCurtain({ code: 'A0' })));
    store().addItem(a, asItemData(makeCurtain({ code: 'A1' })));
    store().addItem(b, asItemData(makeCurtain({ code: 'B0' })));
    const movedId = store().rooms[0].items[1].id; // A1
    store().moveItemToRoom(a, movedId, b, 0); // A1 → B ตำแหน่งหน้าสุด
    expect(codes(store().rooms[0].items as { code?: string }[])).toEqual(['A0']);
    expect(codes(store().rooms[1].items as { code?: string }[])).toEqual(['A1', 'B0']);
  });

  it('moveItemToRoom toIndex เกินความยาว → ต่อท้าย (clamp)', () => {
    store().addRoom('A');
    store().addRoom('B');
    const a = store().rooms[0].id;
    const b = store().rooms[1].id;
    store().addItem(a, asItemData(makeCurtain({ code: 'A0' })));
    store().addItem(b, asItemData(makeCurtain({ code: 'B0' })));
    const movedId = store().rooms[0].items[0].id;
    store().moveItemToRoom(a, movedId, b, 99);
    expect(codes(store().rooms[1].items as { code?: string }[])).toEqual(['B0', 'A0']);
  });

  it('moveItemToRoom ห้องเดียวกัน / itemId ไม่มีจริง → no-op (ref เดิม)', () => {
    store().addRoom('A');
    const a = store().rooms[0].id;
    store().addItem(a, asItemData(makeCurtain({ code: 'A0' })));
    const before = store().rooms;
    store().moveItemToRoom(a, store().rooms[0].items[0].id, a, 0);
    store().moveItemToRoom(a, 'nope', a, 0);
    expect(store().rooms).toBe(before);
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
