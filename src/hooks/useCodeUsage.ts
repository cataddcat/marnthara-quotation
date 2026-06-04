// src/hooks/useCodeUsage.ts
// ────────────────────────────────────────────────────────────────────────────
// Reverse lookup ของ "รายละเอียดรหัส (Code Detail)" — รหัสหนึ่งถูกใช้ที่ห้อง/จุดไหนบ้าง
// ใช้ buildSummary เป็น single source of truth ของปริมาณ (CONTEXT "Breakdown" — ห้ามคำนวณซ้ำ)
// แล้วเลือก map ตาม category + ผูก roomId/itemId ให้กระโดดไปแก้ที่จุดนั้นได้
// ────────────────────────────────────────────────────────────────────────────

import { useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { buildSummary } from '@/lib/materials/buildSummary';
import { categoryVault } from '@/lib/vault';
import { FAVORITE_CATEGORIES } from '@/config/enums';
import type { ItemData } from '@/types';

export interface CodeUsage {
  roomId: string;
  roomName: string;
  itemId: string;
  item: ItemData | null; // resolved สำหรับส่งเป็น initialData ตอนกระโดดไปแก้
  desc: string;
  qty: number;
  unit: string;
}

export interface CodeUsageResult {
  usages: CodeUsage[];
  totalQty: number;
  unit: string;
}

const EMPTY: CodeUsageResult = { usages: [], totalQty: 0, unit: '' };

export const useCodeUsage = (code: string, category: string): CodeUsageResult => {
  const rooms = useAppStore((s) => s.rooms);

  return useMemo<CodeUsageResult>(() => {
    if (!code) return EMPTY;

    const summary = buildSummary(rooms);
    const findItem = (roomId: string, itemId: string): ItemData | null =>
      rooms.find((r) => r.id === roomId)?.items.find((i) => i.id === itemId) ?? null;

    let usages: CodeUsage[];
    let unit: string;

    if (category === FAVORITE_CATEGORIES.CURTAIN_SHEER) {
      unit = 'หลา';
      usages = (summary.sheersByCode.get(code)?.entries ?? []).map((e) => ({
        roomId: e.roomId,
        roomName: e.roomName,
        itemId: e.itemId,
        item: findItem(e.roomId, e.itemId),
        desc: e.desc,
        qty: e.yards,
        unit,
      }));
    } else if (categoryVault(category) === 'wallpaper') {
      unit = 'ม้วน';
      usages = (summary.wallpapersByCode.get(code)?.entries ?? []).map((e) => ({
        roomId: e.roomId,
        roomName: e.roomName,
        itemId: e.itemId,
        item: findItem(e.roomId, e.itemId),
        desc: e.desc,
        qty: e.rolls,
        unit,
      }));
    } else if (categoryVault(category) === 'area') {
      const g = summary.areaByKey.get(code);
      unit = g?.unit ?? 'ตร.ล.';
      usages = (g?.entries ?? []).map((e) => ({
        roomId: e.roomId,
        roomName: e.roomName,
        itemId: e.itemId,
        item: findItem(e.roomId, e.itemId),
        desc: `${g?.typeName ?? ''} ${e.width.toFixed(2)}×${e.height.toFixed(2)} ม.`.trim(),
        qty: unit === 'ตร.ม.' ? e.sqm : e.sqyd,
        unit,
      }));
    } else {
      // default = curtain_main (ผ้าทึบ) / fabric vault
      unit = 'หลา';
      usages = (summary.fabricsByCode.get(code)?.entries ?? []).map((e) => ({
        roomId: e.roomId,
        roomName: e.roomName,
        itemId: e.itemId,
        item: findItem(e.roomId, e.itemId),
        desc: e.desc,
        qty: e.yards,
        unit,
      }));
    }

    const totalQty = usages.reduce((s, u) => s + u.qty, 0);
    return { usages, totalQty, unit };
  }, [rooms, code, category]);
};
