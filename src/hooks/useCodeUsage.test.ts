// src/hooks/useCodeUsage.test.ts
// Reverse lookup ของ Code Detail — รหัส → ห้อง/จุดที่ใช้ (roomId+itemId+qty) แยกตาม role/category

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCodeUsage } from './useCodeUsage';
import { useAppStore } from '@/store/useAppStore';
import { FAVORITE_CATEGORIES, ITEM_TYPES } from '@/config/enums';
import {
  asItemData,
  makeCurtain,
  makeDoubleCurtain,
  makeWallpaper,
  makeAreaItem,
  makeRoom,
  resetIdSeq,
} from '@/test/factories';

beforeEach(() => {
  resetIdSeq();
  useAppStore.setState({ rooms: [] });
});

describe('useCodeUsage — reverse code lookup', () => {
  it('ผ้าทึบ (curtain_main): คืน roomId+itemId+qty ของจุดที่ใช้รหัส', () => {
    const item = asItemData(makeCurtain({ code: 'F001' }));
    useAppStore.setState({
      rooms: [makeRoom({ id: 'room-1', name: 'ห้องนอน', items: [item] })],
    });

    const { result } = renderHook(() => useCodeUsage('F001', FAVORITE_CATEGORIES.CURTAIN_MAIN));

    expect(result.current.usages).toHaveLength(1);
    const u = result.current.usages[0];
    expect(u.roomId).toBe('room-1');
    expect(u.itemId).toBe(item.id);
    expect(u.unit).toBe('หลา');
    expect(u.qty).toBeGreaterThan(0);
    expect(u.item).not.toBeNull();
    expect(result.current.totalQty).toBeGreaterThan(0);
  });

  it('รหัสเดียวกันใช้หลายห้อง → รวมทุกจุด', () => {
    const a = asItemData(makeCurtain({ code: 'F001' }));
    const b = asItemData(makeCurtain({ code: 'F001' }));
    useAppStore.setState({
      rooms: [
        makeRoom({ id: 'room-1', items: [a] }),
        makeRoom({ id: 'room-2', items: [b] }),
      ],
    });

    const { result } = renderHook(() => useCodeUsage('F001', FAVORITE_CATEGORIES.CURTAIN_MAIN));

    expect(result.current.usages).toHaveLength(2);
    expect(result.current.usages.map((u) => u.roomId).sort()).toEqual(['room-1', 'room-2']);
  });

  it('ผ้าโปร่ง (curtain_sheer): จับจากม่านสองชั้นด้วย sheer_code', () => {
    const item = asItemData(makeDoubleCurtain({ code: 'F001', sheer_code: 'S001' }));
    useAppStore.setState({ rooms: [makeRoom({ id: 'room-1', items: [item] })] });

    const { result } = renderHook(() => useCodeUsage('S001', FAVORITE_CATEGORIES.CURTAIN_SHEER));

    expect(result.current.usages).toHaveLength(1);
    expect(result.current.usages[0].itemId).toBe(item.id);
    expect(result.current.usages[0].unit).toBe('หลา');
  });

  it('วอลเปเปอร์: หน่วยเป็น "ม้วน"', () => {
    const item = asItemData(makeWallpaper({ wallpaper_code: 'WP01' }));
    useAppStore.setState({ rooms: [makeRoom({ id: 'room-1', items: [item] })] });

    const { result } = renderHook(() => useCodeUsage('WP01', FAVORITE_CATEGORIES.WALLPAPER));

    expect(result.current.usages).toHaveLength(1);
    expect(result.current.usages[0].unit).toBe('ม้วน');
    expect(result.current.usages[0].qty).toBeGreaterThan(0);
  });

  it('สินค้าพื้นที่ (มู่ลี่ไม้): หน่วยเป็น "ตร.ล." และจับด้วย item.code', () => {
    const item = asItemData(makeAreaItem(ITEM_TYPES.WOODEN_BLIND, { code: 'B001' }));
    useAppStore.setState({ rooms: [makeRoom({ id: 'room-1', items: [item] })] });

    const { result } = renderHook(() =>
      useCodeUsage('B001', FAVORITE_CATEGORIES.WOODEN_BLIND)
    );

    expect(result.current.usages).toHaveLength(1);
    expect(result.current.usages[0].itemId).toBe(item.id);
    expect(result.current.usages[0].unit).toBe('ตร.ล.');
  });

  it('รหัสที่ไม่มีใครใช้ → ว่าง', () => {
    useAppStore.setState({
      rooms: [makeRoom({ items: [asItemData(makeCurtain({ code: 'F001' }))] })],
    });

    const { result } = renderHook(() => useCodeUsage('NOPE', FAVORITE_CATEGORIES.CURTAIN_MAIN));

    expect(result.current.usages).toHaveLength(0);
    expect(result.current.totalQty).toBe(0);
  });

  it('code ว่าง → ว่าง (ไม่ throw)', () => {
    useAppStore.setState({
      rooms: [makeRoom({ items: [asItemData(makeCurtain({ code: 'F001' }))] })],
    });

    const { result } = renderHook(() => useCodeUsage('', FAVORITE_CATEGORIES.CURTAIN_MAIN));

    expect(result.current.usages).toHaveLength(0);
  });

  it('ข้ามห้อง/รายการที่ถูกพัก (suspended) — ตรงกับ buildSummary', () => {
    const item = asItemData(makeCurtain({ code: 'F001', is_suspended: true }));
    useAppStore.setState({ rooms: [makeRoom({ id: 'room-1', items: [item] })] });

    const { result } = renderHook(() => useCodeUsage('F001', FAVORITE_CATEGORIES.CURTAIN_MAIN));

    expect(result.current.usages).toHaveLength(0);
  });
});
