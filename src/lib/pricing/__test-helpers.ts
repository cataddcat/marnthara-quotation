// src/lib/pricing/__test-helpers.ts
// Concentrate the type assertion needed by test files in one place.
//
// Test cases use partial item shapes that don't satisfy the full
// ItemData discriminated union at compile time, but are valid at runtime
// because PricingEngine/CostEngine dispatch on `type` only.
// Using a single factory keeps the `as unknown as ItemData` cast localized.

import type { ItemData } from '@/types';

export const makeItem = <T extends Record<string, unknown>>(base: T): ItemData =>
  ({ id: 'test', ...base }) as unknown as ItemData;
