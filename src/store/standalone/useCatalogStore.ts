// src/store/standalone/useCatalogStore.ts
// ────────────────────────────────────────────────────────────────────────────
// แค็ตตาล็อกสินค้า + ราคาทุน "ที่ดึงจาก DB ภายนอก" (read-only overlay) — transient
// ────────────────────────────────────────────────────────────────────────────
// product master (ผู้ผลิต/SKU/ราคาทุน) ไม่อยู่ในแอป → fetch จาก Firestore shops/{uid}/catalog
// แยกจาก useAppStore: ไม่ persist (localStorage) + ไม่เข้า undo — เป็นภาพสะท้อนของ DB ภายนอก
// ป้อนโดย catalogSync (onSnapshot). CostEngine อ่านทุนสินค้าจากที่นี่เมื่อ status==='ready'
// ────────────────────────────────────────────────────────────────────────────

import { create } from 'zustand';
import type { CatalogEntry } from '@/lib/catalog/contract';
import { categoryVault } from '@/lib/vault';
import { normalizeCode } from '@/lib/codes';

// 'disabled' = ยังไม่ subscribe (ไม่ sign-in / ไม่ตั้งค่า Firebase)
// 'loading'  = subscribe แล้ว รอ snapshot แรก
// 'empty'    = snapshot มาแล้วแต่ไม่มี entry ใช้ได้ (DB ว่าง) → CostEngine fallback vault เดิม
// 'ready'    = มี entry ≥ 1 → CostEngine ใช้ทุนจาก catalog เป็นหลัก
export type CatalogStatus = 'disabled' | 'loading' | 'empty' | 'ready';

interface CatalogCostMaps {
  fabricCosts: Record<string, number>;
  wallpaperCosts: Record<string, number>;
  areaCosts: Record<string, number>;
  hardwareCosts: Record<string, number>;
}

interface CatalogState extends CatalogCostMaps {
  /** entry เต็ม (provenance + SKU identity) — สำหรับคลังวัสดุ read-only view */
  entries: CatalogEntry[];
  status: CatalogStatus;
  fromCache: boolean;
  /** เปลี่ยนทุก snapshot → ใช้เป็น cache-invalidation hint ให้ผู้บริโภค CostEngine recalc */
  updatedAt: string | null;

  setLoading: () => void;
  setCatalog: (entries: CatalogEntry[], fromCache: boolean) => void;
  reset: () => void;
}

const emptyMaps = (): CatalogCostMaps => ({
  fabricCosts: {},
  wallpaperCosts: {},
  areaCosts: {},
  hardwareCosts: {},
});

/** สร้าง cost lookup 4 ถัง จาก entries (route ตาม categoryVault, key = normalizeCode)
 *  — ตรรกะเดียวกับ InventorySlice.importCatalog เพื่อให้ค่าทุนเข้า vault เดียวกันเสมอ */
const buildCostMaps = (entries: CatalogEntry[]): CatalogCostMaps => {
  const maps = emptyMaps();
  for (const e of entries) {
    if (typeof e.cost !== 'number' || e.cost <= 0) continue;
    const code = normalizeCode(e.code);
    const vault = categoryVault(e.category);
    if (vault === 'wallpaper') maps.wallpaperCosts[code] = e.cost;
    else if (vault === 'area') maps.areaCosts[code] = e.cost;
    else if (vault === 'hardware') maps.hardwareCosts[code] = e.cost;
    else maps.fabricCosts[code] = e.cost;
  }
  return maps;
};

export const useCatalogStore = create<CatalogState>((set) => ({
  ...emptyMaps(),
  entries: [],
  status: 'disabled',
  fromCache: false,
  updatedAt: null,

  setLoading: () => set({ status: 'loading' }),
  setCatalog: (entries, fromCache) =>
    set({
      ...buildCostMaps(entries),
      entries,
      status: entries.length > 0 ? 'ready' : 'empty',
      fromCache,
      updatedAt: new Date().toISOString(),
    }),
  reset: () =>
    set({
      ...emptyMaps(),
      entries: [],
      status: 'disabled',
      fromCache: false,
      updatedAt: null,
    }),
}));
