// src/lib/pricing/types.ts

import type { FormulaConfig } from '@/config/formulas';

// Re-export so existing imports `from '@/lib/pricing/types'` continue to work
export type { FormulaConfig };

// Breakdown ที่ strategy ปล่อยออกมา — ฟิลด์ optional ทั้งหมด (แต่ละ strategy ใช้ชุดย่อยของตัวเอง)
// ผู้บริโภค (CostEngine / buildSummary) อ่านแบบ `breakdown?.x` เสมอ → named interface นี้ให้
// editor autocomplete + กัน typo โดยไม่เปลี่ยน runtime
export interface PriceBreakdown {
  // ผ้าม่าน (CurtainStrategy)
  fabricPrice?: number;
  sheerPrice?: number;
  fabricYards?: number;
  sheerYards?: number;
  fabricMeters?: number;
  sheerMeters?: number;
  // วอลเปเปอร์ (WallpaperStrategy)
  rolls?: number;
  materialPrice?: number;
  laborPrice?: number;
  totalWidth?: number;
  // พื้นที่ — มู่ลี่/ฉาก/มุ้ง (AreaStrategy)
  areaSqm?: number;
  areaSqyd?: number;
  pricedArea?: number;
  pricePerUnit?: number;
}

// Result Structure
export interface PriceResult {
  total: number;
  breakdown?: PriceBreakdown;
  /** Optional warning flag (e.g. 'height_exceeds_roll' for wallpaper) — UI surfaces this in dashboards */
  warning?: string;
}

// Context for calculation (avoiding direct store access in workers)
export interface PricingContext {
  formulas: FormulaConfig;
}

// Strategy Pattern Interface
// T extends ItemData ensures we only process valid items
export interface PricingStrategy<T> {
  calculate(item: T, context?: PricingContext): PriceResult;
  validate(item: T): string[];
  getSpecs(item: T): string[];
}
