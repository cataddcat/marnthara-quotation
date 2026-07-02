# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **🗺️ Full documentation map → [`DOCS.md`](./DOCS.md)** — the single index of every doc (incl.
> `PRINCIPLES.md` · `CONTEXT.md`) + when to read each.
>
> **📖 Required reading for any AI agent** — start with this file, then read in the order
> **[DOCS.md](./DOCS.md)** prescribes (DOCS.md owns the reading order). The depth docs:
> - **[`HANDOFF.md`](./HANDOFF.md)** — deep architectural handoff: design philosophy, system map, critical
>    invariants, cost/catalog model, bug history. The "why" behind the codebase shape.
> - **[`DESIGN.md`](./DESIGN.md)** — the canonical **design system & UI requirements** ("the document is the
>    designer"): typography · colour/contrast · the Design Probe · the `Text` primitive · enforcement.
>    *(The actual values — sizes, hues — live there + `typography.ts`/`dataTones.ts`; don't copy them here.)*
>    Read before any UI/UX change.
> - **[`COMMANDS.md`](./COMMANDS.md)** — every project command + the verification gate.
>
> Cross-session memory (`MEMORY.md` + `memory/`) is loaded automatically and records standing preferences,
> project state, and decisions. This file is intentionally brief — the docs above hold the depth.
>
> **✍️ Doc convention:** use the **emoji legend in [DESIGN.md §4.1](./DESIGN.md)** as consistent section
> markers across all docs (✅ done · 🎨 design · 💻 dev · 🧪 test · 🎯 goal/gate · 📖 reading · 📐 spec …),
> and sparingly in the app (accent only — never replacing lucide functional icons).

## 📖 Project Overview

**Marnthara Smart Quotation** — A React + TypeScript PWA for generating interior decoration quotations (curtains, wallpapers, blinds, partitions, etc.) for the Thai market. Mobile-first, offline-capable via service worker, deployed to Vercel at root domain (`base: '/'`).

## 💻 Commands

All commands + expected output → **[`COMMANDS.md`](./COMMANDS.md)** (the single source). Dev server: `npm run dev` (port 3000).

**Verification gate:** the gate command + expected output live in **[`COMMANDS.md`](./COMMANDS.md)**. Ownership (MEMORY 2026-06-18): **the user runs it** — an AI agent edits then stops, and does not run the gate (not even `build`) unless explicitly asked.

## 🏗️ Architecture

### State Management (Zustand)

`useAppStore` composes 10 slices with three middleware layers in order:
1. `temporal` (Zundo, limit 20) — undo/redo
2. `persist` — localStorage under key `"marnthara.input.v6.4"` (**version 6**; see `migrations.ts`)
3. `partialize` — excludes modal/UI state from persistence and undo history

Slices: `ProjectSlice` (rooms + items), `CustomerSlice`, `ShopProfileSlice`, `InventorySlice` (code registry + catalog import/export), `ModalSlice` (modal stack), `CostDataSlice` (7 cost vaults: labor/service/accessory/hardware/fabric/wallpaper/area — see HANDOFF §11), `MaterialDraftSlice` ("ราคาของฉัน" material drafts, offline-first — see HANDOFF §11.9), `PaymentSlice` (มัดจำ/จ่าย/คงเหลือ), `JobsSlice` + `CustomerRegistrySlice` (multi-job switcher + customer directory — see HANDOFF §12). Pricing formulas are compile-time constants in `src/config/formulas.ts` (the old `FormulaSlice` was removed).

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

All modals are routed through `components/managers/ModalManager.tsx`. Modal state (open/close, props, stack) lives entirely in `ModalSlice` — never local component state. Open modals with `openModal(modalName, props)` from the store.

### Core Types

`src/types.ts` defines the central discriminated union `ItemData` (keyed on `type` from `ITEM_TYPES` enum). All item-specific inputs extend `BaseItemInput`. `Room` contains an array of `ItemData`. These types are the contract between features and the store.

### Key Constants

- `src/config/constants.ts` — app version (read the constant; not duplicated in docs), localStorage key, default shop config, pricing surcharge tables
- `src/config/enums.ts` — `ITEM_TYPES`, `FAVORITE_CATEGORIES`, `LAYER_MODES`, `HOOK_TYPES`, etc.

### Path Alias

`@/` maps to `src/` (configured in both `vite.config.ts` and `tsconfig.json`).

## 🎨 UX/UI Standards

**Canonical → [`DESIGN.md`](./DESIGN.md)** (owns typography · colour · spacing · the Design Probe · the gated `<12px` + `>18px` lint guards) + **[`HANDOFF.md`](./HANDOFF.md) §1.6** (HIG + NN/g ergonomics contract; ref impl `src/components/ui/Modal.tsx`). **Read DESIGN.md before any UI change.**

The 5-pillar baseline in one line: **visual hierarchy · ≥44×44 taps (`useTierSize().control`) · low cognitive load (chunk to ≤ ~7 — Miller's Law) · status/feedback on every control · error-prevention**. The actual law + values are owned by **DESIGN.md** — typography in **§1** (+ `typography.ts`: `<12px`/`>18px` both lint-guarded), colour in **§2/§2.1** (+ `dataTones.ts`: every number colour-coded by type, `primary` = CTA only), philosophy in **§0**. Don't restate the numbers/hues here — measure with the **Design Probe** (DESIGN §6) and read DESIGN before any UI change.

## ✅ TypeScript & Linting

- Strict mode with `noUnusedLocals`, `noUnusedParameters`, `noUncheckedSideEffectImports`
- ESLint flat config (`eslint.config.js`), zero warnings allowed
- Husky pre-commit runs ESLint fix + Prettier on staged `.ts/.tsx` and `.json/.md` files

## 🧪 Testing

- **Unit**: Vitest with jsdom, setup in `src/test/setup.ts`
- **E2E**: Playwright, test files in `/tests/`, runs on CI via `.github/workflows/playwright.yml`
- Run a single Vitest test file: `npx vitest run src/path/to/file.test.ts`
- Run a single Playwright test: `npx playwright test tests/specific.spec.ts`

## ⚙️ Build Notes

- Chunk split strategy: `vendor-react`, `vendor-ui`, `vendor-utils`, `vendor-print` (react-to-print is heavy)
- Chunk size warning at 1000 KB
- Source maps disabled in production
- PWA service worker caches assets; Google Fonts cached for 1 year
