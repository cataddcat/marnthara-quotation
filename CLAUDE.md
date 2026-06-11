# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **🗺️ Full documentation map → [`DOCS.md`](./DOCS.md)** — the single index of every doc (incl.
> `PRINCIPLES.md` · `CONTEXT.md`) + when to read each.
>
> **📖 Required reading for any AI agent (in order):**
> 1. **`CLAUDE.md`** (this file) — project instructions, rules, command index, architecture map. Auto-loaded.
> 2. **[`HANDOFF.md`](./HANDOFF.md)** — deep architectural handoff: design philosophy, system map, critical
>    invariants, cost/catalog model, bug history. The "why" behind the codebase shape.
> 3. **[`DESIGN.md`](./DESIGN.md)** — the canonical **design system & UI requirements** ("the document is the
>    designer"): typography standard (Body 14–16px · 12px Meta-only · <12px banned · **18px cap**), color/contrast, the
>    Design Probe, the `Text` primitive, enforcement. Read before any UI/UX change.
> 4. **[`COMMANDS.md`](./COMMANDS.md)** — every project command + the verification gate.
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

**Verification gate (before handoff):** `npm run lint && npm run test:run && npm run build` — all must pass.

## 🏗️ Architecture

### State Management (Zustand)

`useAppStore` composes 6 slices with three middleware layers in order:
1. `temporal` (Zundo, limit 20) — undo/redo
2. `persist` — localStorage under key `"marnthara.input.v6.4"` (**version 4**; see `migrations.ts`)
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

- `src/config/constants.ts` — app version (read the constant; not duplicated in docs), localStorage key, default shop config, pricing surcharge tables
- `src/config/enums.ts` — `ITEM_TYPES`, `FAVORITE_CATEGORIES`, `LAYER_MODES`, `HOOK_TYPES`, etc.

### Path Alias

`@/` maps to `src/` (configured in both `vite.config.ts` and `tsconfig.json`).

## 🎨 UX/UI Standards

**Canonical → [`DESIGN.md`](./DESIGN.md)** (owns typography · colour · spacing · the Design Probe · the gated `<12px` + `>18px` lint guards) + **[`HANDOFF.md`](./HANDOFF.md) §1.6** (HIG + NN/g ergonomics contract; ref impl `src/components/ui/Modal.tsx`). **Read DESIGN.md before any UI change.**

The 5-pillar baseline in one line: **visual hierarchy · ≥44×44 taps (`useTierSize().control`) · low cognitive load (chunk to ≤ ~7 — Miller's Law, DESIGN.md §0) · status/feedback on every control · error-prevention**. Current law (DESIGN.md §2): typography Body 14–16 / Meta-12 / **<12px banned** / **18px cap — emphasis via colour/plate, never size** · **colourful data on monochrome chrome · high contrast · clear surface separation** · `primary` colour = CTA only · measure with the **Design Probe** first.

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
