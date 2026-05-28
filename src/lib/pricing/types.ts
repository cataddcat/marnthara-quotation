// D:\_Projects\mtr-qol-all-green\src\lib\pricing\types.ts

import { FormulaConfig } from '@/store/slices/FormulaSlice';

// Result Structure
export interface PriceResult {
  total: number;
  breakdown?: Record<string, number>;
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