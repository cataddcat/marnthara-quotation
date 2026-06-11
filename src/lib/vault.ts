// src/lib/vault.ts
// ────────────────────────────────────────────────────────────────────────────
// แหล่งกลางของการแมป "หมวดรหัส (FAVORITE_CATEGORIES)" → คลังต้นทุน (vault) + ป้าย + หน่วย
// เดิมการแมปนี้ซ้ำอยู่ 3 ที่ (useInventory, InventorySlice.routeCostToVault, MaterialSummaryModal)
// รวมไว้ที่เดียวเพื่อกัน drift — ต้นทุนผ้า→fabricCosts, วอลเปเปอร์→wallpaperCosts, พื้นที่→areaCosts
// ────────────────────────────────────────────────────────────────────────────

import { FAVORITE_CATEGORIES } from '@/config/enums';
import { MATERIAL_ACCENT, MATERIAL_DOT, type MaterialKind } from '@/config/dataTones';

export type VaultKind = 'fabric' | 'wallpaper' | 'area' | 'hardware';

export interface CatalogCategoryDef {
  id: string;
  label: string;
  costUnit: string;
  vault: VaultKind;
}

export const CATALOG_CATEGORIES: CatalogCategoryDef[] = [
  { id: FAVORITE_CATEGORIES.CURTAIN_MAIN, label: 'ผ้าทึบ', costUnit: 'หลา', vault: 'fabric' },
  { id: FAVORITE_CATEGORIES.CURTAIN_SHEER, label: 'ผ้าโปร่ง', costUnit: 'หลา', vault: 'fabric' },
  { id: FAVORITE_CATEGORIES.WALLPAPER, label: 'วอลเปเปอร์', costUnit: 'ม้วน', vault: 'wallpaper' },
  { id: FAVORITE_CATEGORIES.ROLLER_BLIND, label: 'มู่ลี่ม้วน', costUnit: 'ตร.ล.', vault: 'area' },
  { id: FAVORITE_CATEGORIES.WOODEN_BLIND, label: 'มู่ลี่ไม้', costUnit: 'ตร.ล.', vault: 'area' },
  { id: FAVORITE_CATEGORIES.VERTICAL_BLIND, label: 'มู่ลี่แนวตั้ง', costUnit: 'ตร.ล.', vault: 'area' },
  { id: FAVORITE_CATEGORIES.ALUMINUM_BLIND, label: 'มู่ลี่อลูมิเนียม', costUnit: 'ตร.ล.', vault: 'area' },
  { id: FAVORITE_CATEGORIES.PARTITION, label: 'ฉากกั้นห้อง', costUnit: 'ตร.ล.', vault: 'area' },
  { id: FAVORITE_CATEGORIES.PLEATED_SCREEN, label: 'มุ้งจีบ', costUnit: 'ตร.ม.', vault: 'area' },

  // ── ราง + ฮาร์ดแวร์ (ชุดประกอบ — SKU มียี่ห้อ/รุ่น/สี ราคารวมอุปกรณ์ในตัว) ──
  { id: 'rail_wave', label: 'รางม่านลอน', costUnit: 'เมตร', vault: 'hardware' },
  { id: 'rail_pleated', label: 'รางม่านจีบ', costUnit: 'เมตร', vault: 'hardware' },
  { id: 'rail_eyelet', label: 'รางม่านตาไก่', costUnit: 'เมตร', vault: 'hardware' },
  { id: 'rail_roman', label: 'ชุดรางม่านพับ', costUnit: 'เมตร', vault: 'hardware' },
  { id: 'rail_rod', label: 'ราวม่านแป๊บ', costUnit: 'เมตร', vault: 'hardware' },
  { id: 'rail_louis', label: 'ราง/กล่องม่านหลุยส์', costUnit: 'เมตร', vault: 'hardware' },
];

const BY_ID = new Map<string, CatalogCategoryDef>(CATALOG_CATEGORIES.map((c) => [c.id, c]));

export const categoryDef = (category: string): CatalogCategoryDef | undefined => BY_ID.get(category);

/** หมวด → คลังต้นทุนที่ถูกต้อง (default 'fabric' สำหรับ curtain_main/curtain_sheer และค่าที่ไม่รู้จัก) */
export const categoryVault = (category: string): VaultKind => BY_ID.get(category)?.vault ?? 'fabric';

export const categoryLabel = (category: string): string => BY_ID.get(category)?.label ?? category;

export const categoryCostUnit = (category: string): string => BY_ID.get(category)?.costUnit ?? 'หน่วย';

/**
 * สินค้าพื้นที่ที่ "คิดราคา/ทุนต่อ ตร.ม." (ปัจจุบัน: มุ้งจีบ) — ที่เหลือคิดต่อ ตร.ล.
 * single source ของหน่วยพื้นที่ต่อประเภท: AreaStrategy (ราคาขาย), CostEngine (ทุน),
 * MaterialSummaryModal/buildSummary (สรุปวัสดุ) ต้องตัดสินใจตรงกันเสมอ
 */
export const isSqmPriced = (typeOrCategory: string): boolean =>
  BY_ID.get(typeOrCategory)?.costUnit === 'ตร.ม.';

// ── สีประจำหมวด (color-coding) — hue จากทะเบียน DESIGN.md §2.1 (dataTones.ts) ──
/** หมวดวัสดุของ category — ตัวกลางระหว่าง vault ↔ ทะเบียนสี */
const categoryMaterialKind = (category: string): MaterialKind => {
  if (category === FAVORITE_CATEGORIES.CURTAIN_SHEER) return 'sheer';
  const v = categoryVault(category);
  return v === 'wallpaper' || v === 'area' || v === 'hardware' ? v : 'fabric';
};

/** text color ของหมวด — ใช้กับรหัส/ป้ายในคลังรหัส */
export const categoryAccent = (category: string): string =>
  MATERIAL_ACCENT[categoryMaterialKind(category)];

/** bg color ของจุดนำหน้า (dot) — คู่กับ categoryAccent */
export const categoryDotClass = (category: string): string =>
  MATERIAL_DOT[categoryMaterialKind(category)];
