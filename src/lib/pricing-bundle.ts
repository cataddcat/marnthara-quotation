// src/lib/pricing-bundle.ts
// ════════════════════════════════════════════════════════════════════════════
// "ความรู้ราคาทั้งร้าน" (PricingBundle) — ชุดเดียวของร้าน (ไม่ใช่รายการต่องาน)
// ────────────────────────────────────────────────────────────────────────────
// ขอบเขต = แค็ตตาล็อก (favorites) + 7 vault ต้นทุน + costInclude
//   sync ระดับร้าน: 1 doc shops/{uid}/settings/pricing → ทุกเครื่องตรงกัน
// ไฟล์นี้ "บริสุทธิ์" — ไม่ผูก store/Firestore (รับ structural, คืน plain) เพื่อ unit-test ง่าย
//   เหมือน job-bundle.ts. serialize/parse ทำที่ syncEngine.
// ════════════════════════════════════════════════════════════════════════════

import type { InventoryState, InventoryItem } from '@/store/slices/InventorySlice';
import type { LaborCost, CostInclude } from '@/store/slices/CostDataSlice';

/** field ราคาระดับร้านใน store (key ตรงกับ AppState 1:1) */
export interface PricingFields {
  favorites: InventoryState;
  laborCosts: Record<string, LaborCost>;
  serviceCosts: Record<string, number>;
  accessoryCosts: Record<string, number>;
  hardwareCosts: Record<string, number>;
  fabricCosts: Record<string, number>;
  wallpaperCosts: Record<string, number>;
  areaCosts: Record<string, number>;
  costInclude: CostInclude;
}

export type PricingSource = PricingFields;

/** ก้อนราคาที่ sync (= fields + timestamp) — 1 ก้อน = 1 doc */
export interface PricingBundle extends PricingFields {
  updatedAt: string; // ISO
}

const isoNow = () => new Date().toISOString();

const VAULT_KEYS = [
  'laborCosts',
  'serviceCosts',
  'accessoryCosts',
  'hardwareCosts',
  'fabricCosts',
  'wallpaperCosts',
  'areaCosts',
] as const;

/** หยิบ field ราคาออกจาก store → PricingBundle */
export const extractPricing = (s: PricingSource, now: string = isoNow()): PricingBundle => ({
  favorites: s.favorites,
  laborCosts: s.laborCosts,
  serviceCosts: s.serviceCosts,
  accessoryCosts: s.accessoryCosts,
  hardwareCosts: s.hardwareCosts,
  fabricCosts: s.fabricCosts,
  wallpaperCosts: s.wallpaperCosts,
  areaCosts: s.areaCosts,
  costInclude: s.costInclude,
  updatedAt: now,
});

/** คืนเฉพาะ field ที่ apply กลับเข้า store (ตัด updatedAt) — ให้ setState replace */
export const applyPricingFields = (b: PricingBundle): PricingFields => ({
  favorites: b.favorites,
  laborCosts: b.laborCosts,
  serviceCosts: b.serviceCosts,
  accessoryCosts: b.accessoryCosts,
  hardwareCosts: b.hardwareCosts,
  fabricCosts: b.fabricCosts,
  wallpaperCosts: b.wallpaperCosts,
  areaCosts: b.areaCosts,
  costInclude: b.costInclude,
});

const mergeVault = <T>(local: Record<string, T>, cloud: Record<string, T>): Record<string, T> => ({
  ...local,
  ...cloud, // cloud ชนะเมื่อ key ชน
});

/** union favorites ต่อ category by code (UPPERCASE) — cloud ชนะเมื่อ code ชน */
const mergeFavorites = (local: InventoryState, cloud: InventoryState): InventoryState => {
  const out: InventoryState = {};
  const cats = new Set([...Object.keys(local), ...Object.keys(cloud)]);
  for (const cat of cats) {
    const byCode = new Map<string, InventoryItem>();
    for (const it of local[cat] ?? []) byCode.set(it.code.toUpperCase(), it);
    for (const it of cloud[cat] ?? []) byCode.set(it.code.toUpperCase(), it);
    out[cat] = [...byCode.values()];
  }
  return out;
};

/**
 * รวม local↔cloud (sign-in แรกที่ cloud มี doc) — union ไม่ให้ของหาย, cloud ชนะเมื่อชน.
 * คืน fields พร้อม apply (ไม่รวม updatedAt — ผู้เรียกตั้ง now ตอน push).
 */
export const mergePricing = (local: PricingSource, cloud: PricingBundle): PricingFields => ({
  favorites: mergeFavorites(local.favorites, cloud.favorites),
  laborCosts: mergeVault(local.laborCosts, cloud.laborCosts),
  serviceCosts: mergeVault(local.serviceCosts, cloud.serviceCosts),
  accessoryCosts: mergeVault(local.accessoryCosts, cloud.accessoryCosts),
  hardwareCosts: mergeVault(local.hardwareCosts, cloud.hardwareCosts),
  fabricCosts: mergeVault(local.fabricCosts, cloud.fabricCosts),
  wallpaperCosts: mergeVault(local.wallpaperCosts, cloud.wallpaperCosts),
  areaCosts: mergeVault(local.areaCosts, cloud.areaCosts),
  costInclude: { ...local.costInclude, ...cloud.costInclude },
});

/** ว่าง = ไม่มีสินค้า + ทุก vault ว่าง (costInclude เป็น default ไม่นับเป็นเนื้อหา) — ไม่ seed cloud */
export const isPricingEmpty = (b: PricingFields): boolean => {
  const noFav = Object.values(b.favorites).every((arr) => arr.length === 0);
  const noVault = VAULT_KEYS.every((k) => Object.keys(b[k]).length === 0);
  return noFav && noVault;
};
