// src/lib/pricing/types.ts

import type { FormulaConfig } from '@/config/formulas';

// Re-export so existing imports `from '@/lib/pricing/types'` continue to work
export type { FormulaConfig };

// Result Structure
export interface PriceResult {
  total: number;
  breakdown?: Record<string, number>;
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
