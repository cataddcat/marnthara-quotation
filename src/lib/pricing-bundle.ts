// src/lib/pricing-bundle.ts
// ════════════════════════════════════════════════════════════════════════════
// "ความรู้ราคาของร้าน" (PricingBundle) — ชุดเดียวของร้าน (ไม่ใช่รายการต่องาน)
// ────────────────────────────────────────────────────────────────────────────
// ขอบเขต = ค่าแรง (laborCosts) + ค่าบริการ (serviceCosts) + accessory legacy + costInclude
//   sync ระดับร้าน: 1 doc shops/{uid}/settings/pricing → ทุกเครื่องตรงกัน
//
// ⚠️ product master (favorites/SKU + ทุนผ้า/วอลฯ/พื้นที่/ราง) ถูกย้ายออกไปเป็น DB ภายนอก
//   (Firestore shops/{uid}/catalog → useCatalogStore, HANDOFF §11.8) → ไม่ sync ผ่าน bundle นี้แล้ว
// ไฟล์นี้ "บริสุทธิ์" — ไม่ผูก store/Firestore (รับ structural, คืน plain) เพื่อ unit-test ง่าย
//   เหมือน job-bundle.ts. serialize/parse ทำที่ syncEngine.
// ════════════════════════════════════════════════════════════════════════════

import type { LaborCost, CostInclude } from '@/store/slices/CostDataSlice';

/** field ราคาระดับร้านใน store (key ตรงกับ AppState 1:1) */
export interface PricingFields {
  laborCosts: Record<string, LaborCost>;
  serviceCosts: Record<string, number>;
  accessoryCosts: Record<string, number>;
  costInclude: CostInclude;
}

export type PricingSource = PricingFields;

/** ก้อนราคาที่ sync (= fields + timestamp) — 1 ก้อน = 1 doc */
export interface PricingBundle extends PricingFields {
  updatedAt: string; // ISO
}

const isoNow = () => new Date().toISOString();

const VAULT_KEYS = ['laborCosts', 'serviceCosts', 'accessoryCosts'] as const;

/** หยิบ field ราคาออกจาก store → PricingBundle */
export const extractPricing = (s: PricingSource, now: string = isoNow()): PricingBundle => ({
  laborCosts: s.laborCosts,
  serviceCosts: s.serviceCosts,
  accessoryCosts: s.accessoryCosts,
  costInclude: s.costInclude,
  updatedAt: now,
});

/** คืนเฉพาะ field ที่ apply กลับเข้า store (ตัด updatedAt) — ให้ setState replace */
export const applyPricingFields = (b: PricingBundle): PricingFields => ({
  laborCosts: b.laborCosts,
  serviceCosts: b.serviceCosts,
  accessoryCosts: b.accessoryCosts,
  costInclude: b.costInclude,
});

const mergeVault = <T>(local: Record<string, T>, cloud: Record<string, T>): Record<string, T> => ({
  ...local,
  ...cloud, // cloud ชนะเมื่อ key ชน
});

/**
 * รวม local↔cloud (sign-in แรกที่ cloud มี doc) — union ไม่ให้ของหาย, cloud ชนะเมื่อชน.
 * คืน fields พร้อม apply (ไม่รวม updatedAt — ผู้เรียกตั้ง now ตอน push).
 */
export const mergePricing = (local: PricingSource, cloud: PricingBundle): PricingFields => ({
  laborCosts: mergeVault(local.laborCosts, cloud.laborCosts),
  serviceCosts: mergeVault(local.serviceCosts, cloud.serviceCosts),
  accessoryCosts: mergeVault(local.accessoryCosts, cloud.accessoryCosts),
  costInclude: { ...local.costInclude, ...cloud.costInclude },
});

/** ว่าง = ทุก vault ว่าง (costInclude เป็น default ไม่นับเป็นเนื้อหา) — ไม่ seed cloud */
export const isPricingEmpty = (b: PricingFields): boolean =>
  VAULT_KEYS.every((k) => Object.keys(b[k]).length === 0);
