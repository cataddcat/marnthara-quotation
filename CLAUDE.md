# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **📖 Start here:** Read [`HANDOFF.md`](./HANDOFF.md) for a full architectural handoff covering design philosophy, system map, critical invariants, and bug history from the 2026-04 refactor. This document is intentionally brief — HANDOFF.md has the deep context.

## Project Overview

**Marnthara Smart Quotation** — A React + TypeScript PWA for generating interior decoration quotations (curtains, wallpapers, blinds, partitions, etc.) for the Thai market. Mobile-first, offline-capable via service worker, deployed to Vercel at root domain (`base: '/'`).

## Commands

```bash
npm run dev          # Dev server (port 3000)
npm run build        # tsc -b && vite build
npm run lint         # ESLint (max-warnings 0 — zero tolerance)
npm run format       # Prettier format all files
npm run test         # Vitest watch mode
npm run test:run     # Vitest single run (CI)
npm run test:ui      # Vitest with browser UI
npx playwright test  # E2E tests (Chrome, Firefox, Safari, iOS)
```

## Architecture

### State Management (Zustand)

`useAppStore` composes 6 slices with three middleware layers in order:
1. `temporal` (Zundo, limit 20) — undo/redo
2. `persist` — localStorage under key `"marnthara.input.v6.4"` (**version 3**; see `migrations.ts`)
3. `partialize` — excludes modal/UI state from persistence and undo history

Slices: `ProjectSlice` (rooms + items), `CustomerSlice`, `ShopProfileSlice`, `InventorySlice` (code registry + catalog import/export), `UISlice` (modal stack), `CostDataSlice` (7 cost vaults: labor/service/accessory/hardware/fabric/wallpaper/area — see HANDOFF §11). Pricing formulas are compile-time constants in `src/config/formulas.ts` (the old `FormulaSlice` was removed).

### Feature Module Pattern

Each of the 9 product types (`curtains`, `wallpapers`, `roller-blinds`, `vertical-blinds`, `wooden-blinds`, `partition`, `pleated-screen`, `removal`, `shared`) lives under `src/features/<type>/` with a consistent structure:

```
features/<type>/
├── components/        # <Type>Form.tsx + section sub-components
├── hooks/             # use<Type>FormLogic.ts (form state)
├── logic/             # <Type>Strategy.ts (pricing algorithm)
└── schemas.ts         # Zod validation schemas
```

### Pricing Data Flow

User input → feature `*Strategy.ts` → `lib/pricing/PricingEngine.ts` → `lib/pricing/CostEngine.ts`

Heavy calculations are offloaded to a Web Worker (`lib/pricing/pricing.worker.ts`) via `useAsyncCalculator`. The `useCalculations` hook handles the synchronous path.

### Modal System

All modals are routed through `components/managers/ModalManager.tsx`. Modal state (open/close, props, stack) lives entirely in `UISlice` — never local component state. Open modals with `openModal(modalName, props)` from the store.

### Core Types

`src/types.ts` defines the central discriminated union `ItemData` (keyed on `type` from `ITEM_TYPES` enum). All item-specific inputs extend `BaseItemInput`. `Room` contains an array of `ItemData`. These types are the contract between features and the store.

### Key Constants

- `src/config/constants.ts` — app version (currently `v6.7.0`), localStorage key, default shop config, pricing surcharge tables
- `src/config/enums.ts` — `ITEM_TYPES`, `FAVORITE_CATEGORIES`, `LAYER_MODES`, `HOOK_TYPES`, etc.

### Path Alias

`@/` maps to `src/` (configured in both `vite.config.ts` and `tsconfig.json`).

## UX/UI Standards (Apple HIG + NN/g)

All new or changed UI must satisfy the 5-pillar UX baseline before merge:

1. **Visual hierarchy** — typography + contrast drive the eye; reserve the `primary` color **exclusively** for the primary CTA (don't tint secondary affordances/icons with it).
2. **Touch targets ≥ 44×44 (HIG)** — reuse the `Button` primitive (`size="icon"`/`"md"` = 48px) or `h-11 w-11` + centered icon; size controls by tier via `useTierSize().control`, never hardcode heights.
3. **Minimize cognitive load (NN/g)** — Law of Proximity grouping, universal `lucide` icons, progressive disclosure via `AdvancedSection`.
4. **System status & feedback** — every control ships `hover`/`active`/`focus-visible` (NOT `focus`)/`loading`/`disabled`.
5. **Error prevention & forgiveness (NN/g)** — smart constraints + input formatting; `destructive` variant + explicit confirm for irreversible actions only (autosave already makes closing a form non-destructive — see HANDOFF §1.1).

See **[`HANDOFF.md`](./HANDOFF.md) §1.6** for the full contract + reference implementation (`src/components/ui/Modal.tsx`).

## TypeScript & Linting

- Strict mode with `noUnusedLocals`, `noUnusedParameters`, `noUncheckedSideEffectImports`
- ESLint flat config (`eslint.config.js`), zero warnings allowed
- Husky pre-commit runs ESLint fix + Prettier on staged `.ts/.tsx` and `.json/.md` files

## Testing

- **Unit**: Vitest with jsdom, setup in `src/test/setup.ts`
- **E2E**: Playwright, test files in `/tests/`, runs on CI via `.github/workflows/playwright.yml`
- Run a single Vitest test file: `npx vitest run src/path/to/file.test.ts`
- Run a single Playwright test: `npx playwright test tests/specific.spec.ts`

## Build Notes

- Chunk split strategy: `vendor-react`, `vendor-ui`, `vendor-utils`, `vendor-print` (react-to-print is heavy)
- Chunk size warning at 1000 KB
- Source maps disabled in production
- PWA service worker caches assets; Google Fonts cached for 1 year
