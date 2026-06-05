# Handoff — 2026-04 Refactor Session

Comprehensive summary of architectural changes, design philosophy, and workflow decisions from the 2026-04 refactor session. Any developer (human or AI) picking up this project should read this document first to understand the *why* behind the current codebase shape.

---

## 1. Design Philosophy (READ THIS FIRST)

These are the core principles that drive every design decision in this codebase. Violate them only with deliberate cause.

### 1.1 Save-First, Validate-Later

**Rule:** Forms auto-save on every committed change (debounced), immediately. Validation provides inline hints but **NEVER gates saving**.

**Why:** Users work on-site entering partial data across a day. A validation gate that blocks saving produces "I clicked save but nothing happened" bugs — the single most common complaint before this refactor.

**How it's implemented:**
- Every feature form (`CurtainForm`, `WallpaperForm`, `RollerBlindsForm`, etc.) calls `useFormAutoSave(formData, onAutoSave)` — a `useLayoutEffect` that fires `onAutoSave` on each committed `formData` change (skips the mount render).
  - *History:* this replaced the original form-level `<form onBlur={() => onAutoSave?.(formData)}>` (2026-06-03). The blur snapshot missed the just-`smart-parse`d dimension (e.g. `250`→`2.50`) and lost the last-edited field (usually "ความสูง") when the modal closed before the debounce fired. Save-on-change captures every committed value.
- `useZodForm.handleSubmit` always calls `onSubmit` — with parsed data if valid, raw `formData` as fallback
- `useItemForm`-based forms call `validate()` for hint display only, then unconditionally `onSubmit(formData)`
- `ItemModal` owns the actual store write via `handleAutoSave` (debounced 400ms) and `handleSubmit`, and **flushes any pending debounced save on close/unmount** (`flushAutoSave` / `handleClose`) so the last edit is never dropped.

### 1.2 Priority Chain for Cost Lookups

When looking up a cost, check sources in order and fall back gracefully:

```
1. Vault (fabricCosts[code])       — shop-wide shared cost registry
2. Direct entry (price_sqyd, etc.) — user entered in item form
3. Pro Mode (_cost_fabric)         — total cost override
4. Flag `hasMissingCost = true`    — only if ALL sources fail
```

**Why:** Users enter cost data in different places depending on context. The system shouldn't punish a user for entering a price directly instead of via the Vault.

**Applied in:** `src/lib/pricing/CostEngine.ts` Section A (main fabric) and Section B (sheer fabric).

### 1.3 Transparent Cost Attribution + Click-to-Edit

Every cost line shows its source (fabric code, rail type, labor style). Every fabric code is a clickable jump button that opens the Vault with that code pre-searched. If the code doesn't exist yet → the Vault auto-opens the "add new" form pre-filled with that code.

**Why:** The loop between "I see a missing cost" and "I can add it" must be one tap, not a guided tour.

**Applied in:** `CodeJumpButton` in `FinancialDashboardModal`, `pendingPrefillRef` in `InventoryManagerModal`.

### 1.4 Double-Layer (ทึบ+โปร่ง) Awareness

Two-layer curtains are not single-layer curtains with a sheer add-on. They require:

- **Separate sheer fabric cost** (own priority chain)
- **Separate sheer sewing labor** — key `'ผ้าโปร่ง'` in `laborCosts`
- **+30% brackets** for weight load (in MaterialSummaryModal)
- **Visible ผ้าโปร่ง row** in Financial Dashboard whenever `sheer_code` is set (independent of cost data)

**Why:** Before this refactor, ทึบ+โปร่ง items appeared more profitable than reality because sheer cost was invisible.

### 1.5 Smart Defaults, User Override

Thai market 2025 prices are baked into `DEFAULT_LABOR_COSTS` and `DEFAULT_ACCESSORY_COSTS`. Users can:
- Override individual entries in ProductionSettingsModal
- Reset everything to defaults with "โหลดค่ามาตรฐาน 2025"
- Use Pro Mode to override per-item

**Why:** A brand-new install should give reasonable cost calculations immediately, not zeros.

### 1.6 UX Baseline — Apple HIG + NN/g (mandatory for every screen)

The standing UX contract for all UI. Apple Human Interface Guidelines + Nielsen Norman Group usability heuristics, mapped to this codebase's primitives. **New or changed UI must satisfy all five before merge.**

1. **Visual hierarchy & clarity.** Drive the eye with typography (weight / size / line-height) and contrast. **Reserve the `primary` color exclusively for the primary CTA** — don't tint secondary affordances, nav chevrons, or decorative icons with `primary` where it competes with the real action.
2. **Touch targets & ergonomics (HIG ≥ 44×44).** Every interactive element gets a ≥ 44×44px hit area. Reuse `Button` (`size="icon"` / `"md"` = 48px) or apply `h-11 w-11` (44px) + a centered icon — never ship a bare icon with only `p-1.5`. Drive control size by tier via `useTierSize().control` (Lite = lg/56px); never hardcode input heights per tier.
3. **Minimize cognitive load (NN/g).** Group related fields by the Law of Proximity; use universal `lucide` icons; apply progressive disclosure via `AdvancedSection` (installation-spec fields collapse in Lite). Don't surface every field at once.
4. **System status & fluid feedback.** Every control ships the full state set — `hover`, `active`, `focus-visible` (NOT `focus`, which also fires on mouse click), plus `loading` / `disabled` where applicable. `Button` already encodes these; custom controls must match.
5. **Error prevention & forgiveness (NN/g).** Prevent mistakes with smart constraints + input formatting (smart-parse). Irreversible actions use the `destructive` variant + an explicit confirm. **Coexists with §1.1 Save-First:** autosave makes *closing a form* non-destructive (no confirm needed), so reserve confirmations for true data deletion (delete room / item / cost entry), never for navigation.

**Reference implementation:** `src/components/ui/Modal.tsx` — 44px header close/back buttons via the reused `Button`, tier resolved from `useExperienceMode()` (respects the persisted override, not raw screen width — see §10), and a visible drawer close button.

---

## 2. System Map

### 2.1 Modal System

All modals are registered in `UISlice.ts` ModalType union. Render via `ModalManager.tsx`. Open via `useAppStore.openModal(type, props?)`.

| Modal | Purpose | Key Props |
|---|---|---|
| `item` | Add/edit a room item | `roomId`, `itemId`, `mode`, `itemType` |
| `customer` | Customer info | — |
| `pdf` | Quotation print | — |
| `shopSettings` | Shop profile | — |
| `inventoryManager` | **คลังรหัสผ้าและต้นทุน** — fabric code + price/cost | `initialSearch`, `initialTab`, `prefillCode` |
| `discount` | End-of-bill discount | — |
| `data` | Import/Export/Reset | — |
| `lookbook` | Visual catalog | — |
| `projectOverview` | Room list overview | — |
| `mainMenu` | Main menu drawer | (many callbacks) |
| `productionSettings` | **Cost Vault** — labor/accessory/fabric costs | — |
| `costDashboard` | **Financial Health** — P&L overview | — |
| `formulaStudio` | Multiplier/conversion config | — |
| `materialSummary` | **Material Summary / BOM** (NEW) | — |

### 2.2 Pricing Pipeline

```
User input (form)
    ↓
Zustand store (rooms[].items[])
    ↓
PricingEngine.calculatePrice(item, context?)
    ├─ Dispatches by item.type to Strategy
    ├─ CurtainStrategy / WallpaperStrategy / AreaStrategy(factory) / RemovalStrategy
    └─ Returns { total, breakdown: { fabricYards, sheerYards, rolls, ... } }
    ↓
For heavy load (≥50 items): runs in Web Worker via useAsyncCalculator
    ↓
useCalculations hook
    ├─ Applies discount (Discount.is_enabled gate)
    ├─ Applies VAT (shopConfig.baseVatRate)
    └─ Returns { grandTotal, discountAmount, vatAmount, finalTotal, netTotal }
```

**Race condition fix:** `useCalculations` uses `runIdRef` counter — any late-arriving worker result is ignored if a newer request has been dispatched.

### 2.3 Cost Analysis Pipeline (separate from pricing)

```
item
  ↓
PricingEngine.calculateDetailedPrice(item)  → { total, breakdown }
  ↓
CostEngine.analyze(item)
  ├─ A. Main fabric cost (Priority chain)
  ├─ B. Sheer fabric cost (Priority chain) — DOUBLE mode only
  ├─ C. Rail cost (accessoryCosts[railKey] × width)
  ├─ D. Main labor (laborCosts[style])
  └─ D2. Sheer labor (laborCosts['ผ้าโปร่ง']) — DOUBLE mode only
  ↓
Returns CostBreakdown {
  totalCost, sellingPrice, profitAmount, marginPercent,
  status: 'profit' | 'warning' | 'loss' | 'unknown',
  fabricCost, sheerCost, railCost, laborCost, accCost,
  isLaborMinApplied, usedQuantity, unit
}
```

### 2.4 Form Architecture

**Pattern:** Feature hook → feature form component → ItemModal → store

```
useCurtainFormLogic(initialData, onSubmit)     ← thin wrapper over useZodForm
    ↓
<CurtainForm onAutoSave={...} onSubmit={...} />
    ├─ useFormAutoSave(formData, onAutoSave)  ← change-to-save (debounced), skips mount
    │    └─ <DimensionSection> / <FabricSection> / <StyleSection>
    └─ Save button → handleSubmit → onSubmit(formData)
    ↓
ItemModal owns store writes (debounced 400ms; flushed on close/unmount):
  - mode === 'edit': updateItem(roomId, itemId, data)
  - mode === 'add' first qualifying change: addItem with stable autoCreatedIdRef
  - mode === 'add' subsequent: updateItem(roomId, autoCreatedIdRef.current, data)
  - close (X / back / backdrop / Esc): handleClose → flushAutoSave → persist pending, then onClose
```

---

## 3. Feature Modules (Key Files)

### Cost Vault
- `src/store/slices/CostDataSlice.ts` — state + DEFAULT_LABOR_COSTS + DEFAULT_ACCESSORY_COSTS
- `src/components/modals/ProductionSettingsModal.tsx` — 3-tab CRUD UI
- Actions: `updateLaborCost`, `removeLaborCost`, `updateAccessoryCost`, `removeAccessoryCost`, `updateFabricCost`, `removeFabricCost`, `loadDefaultCosts`, `resetProductionCosts`

### Financial Dashboard
- `src/components/modals/FinancialDashboardModal.tsx`
- Sort: loss → warning → unknown → profit (worst first)
- Each item expandable: fabric breakdown (main + sheer) with clickable `CodeJumpButton`
- Cost structure bar: violet (fabric) / blue (labor) / orange (rail+acc)

### Material Summary (NEW)
- `src/components/modals/MaterialSummaryModal.tsx`
- 3 tabs: ผ้า / ราง / อุปกรณ์
- Accessory formulas (see `src/components/modals/MaterialSummaryModal.tsx`):
  - Brackets: `ceil(width / 1.2) + 1`, ×1.3 for DOUBLE
  - Eyelet rings: `ceil(width × 2.7 / 0.10)` (only ตาไก่)
  - Pin hooks: `ceil(width × 2.7 / 0.14) + 4` (only จีบ)
  - Wave tape: `width × 2.7` meters (only ลอน)
  - Roman sets: 1 per window (only พับ)
- Copy-to-clipboard button generates text shopping list

### Formula Studio
- `src/store/slices/FormulaSlice.ts` — FormulaConfig + updateFormula + resetFormulas
- `src/components/modals/FormulaStudioModal.tsx`
- Input validation: `MUST_BE_POSITIVE` fields reject ≤ 0; all fields reject negative
- Multipliers default: ลอน 2.7, จีบ 2.7, ตาไก่ 2.7, Roman offset 0.45m, hem 0.30m, yard_conversion 1.11

### Inventory Manager (คลังรหัสผ้าและต้นทุน)
- `src/components/modals/InventoryManagerModal.tsx`
- Supports deep-link props via `modalProps`:
  - `initialSearch` — pre-fill search box
  - `initialTab` — set active `FAVORITE_CATEGORIES` tab
  - `prefillCode` — if code not found in filteredItems → auto-open create form with that code
- **Naming:** previously "รายการโปรด" (Favorites) — renamed to "คลังผ้า" / "คลังรหัสผ้าและต้นทุน" throughout UI

### Lookbook — A4 print sheet (NEW, 2026-06)
- `src/components/modals/LookbookModal.tsx` — on-screen A4 preview + one-click export.
- **Pagination:** room-grouped, deterministic *fixed-height* packing into A4 pages (mm budget in
  `paginate()`); per-room 📍 headers, 2-col cards, odd count → empty trailing cell, long rooms
  continue on the next page with a "(ต่อ)" header. No DOM measuring, no mid-card clipping.
- **Export:** **PDF** via `jsPDF` (one A4 image per page) and **PNG** via `html2canvas-pro`
  (one A4 PNG per page — single file when 1 page, bundled `.zip` via `jszip` when many). Capture is
  done from **off-screen natural-size** page nodes (transform-free → exact A4); the visible preview is
  the same component wrapped in `transform: scale()` + manual zoom.
  - ⚠️ Must use **`html2canvas-pro`** (not `html2canvas`): Tailwind v4's palette compiles to `oklch()`,
    which `html2canvas@1` cannot parse → export throws.
- **Filter:** item-type chips; `presentTypes` + derived `effective` set (no setState-in-effect);
  empty rooms vanish after filtering.
- **Proportional, semantic drawings:** `src/lib/svgGenerator.ts` (`generateItemVisualSvg`) — aspect-correct
  per item + W×H labels; communicates **style** (ลอน/จีบ/ตาไก่/พับ/แป๊บ/หลุยส์, wallpaper, each blind type),
  **opening direction** (curtain `opening_style` is Thai `แยกกลาง`→🡄🡆 / `เก็บซ้าย`→🡄 / `เก็บขวา`→🡆;
  partition/pleated use `'center'`/`'side'` codes + `adjustment_side`), and **cord/chain side**
  (blinds `adjustment_side` ซ้าย/ขวา). All styling INLINE (survives html2canvas). Roller count
  ("ลูกล้อ N+N") for ลอน via `calcWaveHardware`. Covered by `svgGenerator.test.ts`.
- Replaced the old `react-to-print`-based `LookbookDocument` (deleted; `react-to-print` is still used by
  `PdfPreviewModal`).

---

## 4. Critical Invariants (Do Not Break)

1. **Labor keys = item.style** — `laborCosts['ลอน']`, `laborCosts['จีบ']`, etc. If you add a new curtain style, add matching labor entry.
2. **Sheer labor key = `'ผ้าโปร่ง'`** — single entry applies to all double-layer curtains regardless of main style.
3. **Rail key mapping** — same mapping in `CostEngine.ts` and `MaterialSummaryModal.tsx`. Keep in sync.
4. **`formData` always auto-saves on change** (debounced via `useFormAutoSave`); `ItemModal` **flushes the pending save on close/unmount** so the last edit never drops. Never add validation gates in `handleSubmit`.
5. **`autoCreatedIdRef` resets on modal open** — managed by `useEffect` on `isOpen`.
6. **`PricingEngine.calculateDetailedPrice(item).breakdown`** — source of truth for `fabricYards`, `sheerYards`, `rolls`. Consuming code should NOT re-derive these.
7. **`formulas` passed via `PricingContext`** in worker — NEVER call `useAppStore.getState()` inside a Web Worker (separate JS context, store not shared).
8. **`Discount.is_enabled: boolean`** — required field. Default `false` in `ShopProfileSlice` and `ProjectSlice.resetProject`.
9. **Modal stack** — `openModal` pushes current to stack; `closeModal` pops. Don't manually mutate `modalStack`.

---

## 5. Bugs Fixed in This Session

| # | Bug | Root Cause | Fix |
|---|---|---|---|
| 1 | WallpaperForm crash on save | `validate` undefined (not destructured) | Fixed destructuring + added missing handlers to `useWallpaperFormLogic` |
| 2 | Formulas disappear on backup restore | `formulas` not included in DataModal export | Added `formulas: state.formulas` to export + import |
| 3 | Stale worker results overwriting state | No request generation tracking | Added `runIdRef` counter; ignore when `runIdRef.current !== runId` |
| 4 | Worker uses stale store formulas | Worker has separate JS context | Pass `formulas` via `PricingContext` in postMessage |
| 5 | Formula Studio accepts negative/zero values | No input validation | Added `MUST_BE_POSITIVE` + negative guard in `handleDraftChange` |
| 6 | Sheer cost = 0 silently for DOUBLE mode | Only `sheer_code` path, no fallbacks | Priority chain: code → sheer_price_sqyd → _cost_sheer → flag |
| 7 | Save button does nothing with partial data | Zod validation gate in `handleSubmit` | Always call onSubmit; validation shows inline hints only |
| 8 | Edit mode requires clicking Save | No auto-save | Form-level `onBlur` + ItemModal's `handleAutoSave` |
| 9 | "รายการโปรด" naming confusing | Actual purpose is cost registry | Renamed to "คลังผ้า"/"คลังรหัสผ้าและต้นทุน" |
| 10 | Sheer sewing labor missing for DOUBLE | Only main labor charged | Added `'ผ้าโปร่ง'` labor entry + Section D2 in CostEngine |
| 11 | Labor can't be per-yard | Only 'meter'/'sqm'/'set' units | Added `'yard'` unit → uses `breakdown.fabricYards` |
| 12 | Code jump hides missing-cost items | `{fabricTotal > 0 && ...}` guard | Always show codes with jump button |
| 13 | Jump to non-existent code shows empty list | No auto-prefill | Added `prefillCode` prop + auto-open create form |
| 14 | `discount.is_enabled` optional but used as required | Type was `?: boolean` | Changed to `is_enabled: boolean` + defaults |
| 15 | Financial Dashboard aggregation approximations | `usage = width * 2.5` hardcoded | Use `analysis.usedQuantity` from CostEngine |

---

## 6. Known Tech Debt (NOT addressed this session)

> Updated 2026-05-29 after PRs #1–#8.
> `npm run lint --max-warnings 0` ผ่าน. Bundle 998 KiB (เล็กลง 40+ KiB จาก initial baseline).
> สูตรคำนวณทั้งระบบ centralized ที่ `src/config/formulas.ts` (single source of truth).

### Still open
- **Aluminum Blind feature stub** — appears in `ITEM_TYPES` + menu but no form directory exists
- **`breakdown?: Record<string, number>`** — untyped in `PriceResult` (`src/lib/pricing/types.ts`); a typed shape per item-type would let `CostEngine` consume `fabricYards` / `sheerYards` / `rolls` / `areaSqyd` with editor assist instead of optional-chaining everywhere
- **PricingEngine.test.ts coverage** — `CostEngine.test.ts` covers 18 cases, `PricingEngine.test.ts` 7 cases. No tests yet for undo/redo, import/export, or schema validation hints.
- **Tool-centric IA** — `MainMenuModal` opens 11 modals; primary task "create quotation" lacks a sticky FAB or top-level CTA (P1-B in Design Review backlog).

### Closed (PRs #1–#8, 2026-05-28 → 2026-05-29)
- ~~Features with missing Zod schemas (6 types)~~ → **PR #3** (Zod + factory + deleted `useItemForm`)
- ~~`modalProps: Record<string, any>`~~ → **PR #2** (`ModalPropsMap` discriminated union)
- ~~`'favoriteManager'` string literal~~ → resolved before this batch
- ~~13 pre-existing TypeScript errors~~ → resolved before this batch
- ~~2 broken assertions in `PricingEngine.test.ts`~~ → **PR #1**
- ~~`FinancialDashboardModal.tsx` (675 LOC god component)~~ → **PR #5**: split into 8 files
- ~~20 pre-existing lint errors~~ → **PR #6**
- ~~`InventoryManagerModal` orphan~~ → **PR #6** (deleted)
- ~~Hardcoded curtain catalog + scattered formulas~~ → **PR #8**: centralized to `src/config/formulas.ts`. WAVE catalog extensible via single-file edit. `FormulaSlice` + `FormulaStudioModal` deleted (deterministic, no persist drift). Added `FormulaDocsModal` for read-only inspection.
- ~~Wallpaper height > roll_length silent fail~~ → **PR #8**: now emits `warning: 'height_exceeds_roll'`
- ~~MaterialSummary BOM hardcoded constants~~ → **PR #8**: moved to `FORMULAS.materials`

---

## 7. Workflow & Dev Notes

### Verification policy (updated 2026-06-03)
- After changes, verify with `npm run lint` (zero-warnings is a hard gate), `npm run test:run`, and `npm run build`. Skipping tests previously let a regression slip through (the `ItemCard` title test), so verification is expected — not optional.
- *(Superseded: an earlier note said "do not run build/test — user runs manually." That preference is retired.)*
- **Config files:** `vite.config.ts` / `vitest.config.ts` are the source of truth. `tsc -b` (via `tsconfig.node.json`) emits to `node_modules/.tmp/config` so it never drops `.js`/`.d.ts` into the project root — those would shadow the `.ts` because Vite/Vitest resolve `.js` first.

### Persistence
- Zustand `persist` key: `marnthara.input.v6.4` (localStorage), **`version: 2`**
- `migrate` (`src/store/migrations.ts`): v1→v2 normalizes legacy curtains (`type: 'set'` + old field names `fabric_code`/`sheer_fabric_code`/`track_color`, missing `layer_mode`) into the current curtain schema. Idempotent.
- Zundo `temporal` limit: 20 undo states
- `omitTransientState` excludes: `activeModal`, `modalProps`, `modalStack`

### When Adding a New Item Type
1. Add to `ITEM_TYPES` in `src/config/enums.ts`
2. Add to `ITEM_CONFIG` in `src/config/constants.ts`
3. Add to discriminated union `ItemData` in `src/types.ts`
4. Create feature folder: `src/features/<type>/components/<Type>Form.tsx`, `logic/<Type>Strategy.ts`, `hooks/use<Type>FormLogic.ts`, `schemas.ts`
5. Add case to `PricingEngine.ts` switch statements (both `calculateDetailedPrice` and `getItemSpecs`)
6. Add case to `CostEngine.ts` if needed
7. Add rendering block in `ItemModal.tsx` + pass `onAutoSave`
8. Add to `STYLE_TO_RAIL` map in `MaterialSummaryModal.tsx` if it's a curtain-like item
9. Add type guard in `src/lib/type-guards.ts`

### When Adding a New Modal
1. Add string literal to `ModalType` union in `src/store/slices/UISlice.ts`
2. Create modal component in `src/components/modals/`
3. Import + render in `src/components/managers/ModalManager.tsx`
4. Optionally: add button in `MainMenuModal.tsx`

### When Changing Pricing Logic
1. Update the relevant Strategy in `src/features/<type>/logic/<Type>Strategy.ts`
2. Update `breakdown` field names if added new ones
3. Update `CostEngine.ts` to consume new breakdown fields
4. Update `MaterialSummaryModal.tsx` if material quantities affected
5. Tests in `src/lib/pricing/PricingEngine.test.ts` (minimal but exists)

---

## 8. File Reference Index

### Core State
```
src/store/useAppStore.ts              — Root store (temporal + persist v2 + 7 slices)
src/store/migrations.ts               — persist migrate: legacy type:'set' + old field names → current schema
src/store/slices/
  UISlice.ts                          — Modals + toast queue
  ProjectSlice.ts                     — rooms[] + CRUD
  CustomerSlice.ts                    — Customer info
  ShopProfileSlice.ts                 — Shop config + discount
  InventorySlice.ts                   — Favorites / code registry
  CostDataSlice.ts                    — laborCosts, accessoryCosts, fabricCosts + defaults
  FormulaSlice.ts                     — FormulaConfig (multipliers, offsets)
src/store/useThemeStore.ts            — Light/Dark theme
src/store/useUIStore.ts               — addToast
```

### Pricing & Cost
```
src/lib/pricing/
  PricingEngine.ts                    — Strategy dispatcher
  CostEngine.ts                       — Cost analysis + priority chain
  pricing.worker.ts                   — Web Worker entry
  types.ts                            — PriceResult, PricingContext, PricingStrategy
src/hooks/
  useCalculations.ts                  — main calculation hook (with runIdRef fix)
  useAsyncCalculator.ts               — Worker bridge
```

### Forms & Hooks
```
src/hooks/
  useZodForm.ts                       — Zod form (always-save)
  useItemForm.ts                      — Simpler form (always-save)
  useFormAutoSave.ts                  — change-to-save bridge (debounced via ItemModal); skips mount
src/components/modals/ItemModal.tsx   — Save coordinator + single-row sticky footer + flush-on-close
src/features/*/components/*Form.tsx   — 8 feature forms (all call useFormAutoSave + onAutoSave)
src/features/*/hooks/use*FormLogic.ts — Feature-specific form logic
```

### Two-Tier UI (Lite/Full)
```
src/hooks/useExperienceMode.ts        — single source of tier (device + override) + useTierSize
src/store/useExperienceStore.ts       — persisted override (key marnthara-experience)
src/components/ui/ModeGate.tsx         — declarative show-by-tier primitive
src/components/ui/FormTwoColumn.tsx    — Full+lg → input/summary 2-col; else stack
src/components/ui/AdvancedSection.tsx  — disclosure: Full inline / Lite collapsible (escape hatch)
src/components/ui/ItemSummaryCard.tsx  — unified summary (breakdown+ราคาสุทธิ+override+dot+proSlot)
src/components/ui/CostReadout.tsx      — read-only cost/profit panel (proSlot for area/wallpaper)
src/hooks/useCostStatus.ts             — generic CostEngine.analyze for any ItemData
src/lib/item-status.ts                 — isItemIncomplete() / "ค้าง N จุด" (all types)
```

### Modals
```
src/components/modals/
  ItemModal.tsx                       — Item add/edit (owns store writes)
  FinancialDashboardModal.tsx         — P&L dashboard (redesigned)
  MaterialSummaryModal.tsx            — BOM / shopping list (NEW)
  ProductionSettingsModal.tsx         — Cost Vault (redesigned)
  InventoryManagerModal.tsx           — Fabric code registry (renamed)
  FormulaStudioModal.tsx              — Multipliers config (validation added)
  DataModal.tsx                       — Import/Export (formulas added)
  MainMenuModal.tsx                   — Drawer menu (materialSummary button added)
  LookbookModal.tsx                   — A4 lookbook: paginate + PDF/PNG-zip export + type filter (NEW)
  ... (other modals)
src/components/managers/ModalManager.tsx — Modal router
src/lib/svgGenerator.ts                  — proportional semantic item drawings (style/opening/cord + dims)
```

### Config
```
src/config/
  constants.ts                        — ITEM_CONFIG, CURTAIN_STYLES, DEFAULT_SHOP_CONFIG
  enums.ts                            — ITEM_TYPES, LAYER_MODES, FAVORITE_CATEGORIES, HOOK_TYPES
src/types.ts                          — ItemData discriminated union + all inputs
```

---

## 9. Quick Reference: "Where do I…?"

| Task | Start here |
|---|---|
| Change a pricing formula | `src/features/<type>/logic/<Type>Strategy.ts` |
| Change a cost calculation | `src/lib/pricing/CostEngine.ts` |
| Change multipliers / conversions | `src/store/slices/FormulaSlice.ts` (config) + `FormulaStudioModal` (UI) |
| Change default labor/accessory rates | `src/store/slices/CostDataSlice.ts` constants |
| Add a form field | `src/features/<type>/components/<Type>Form.tsx` + `schemas.ts` |
| Add a new item type | See section 7 "When Adding a New Item Type" |
| Change cost vault UI | `src/components/modals/ProductionSettingsModal.tsx` |
| Change fabric code registry | `src/components/modals/InventoryManagerModal.tsx` |
| Change P&L dashboard | `src/components/modals/FinancialDashboardModal.tsx` |
| Change material summary / BOM | `src/components/modals/MaterialSummaryModal.tsx` |
| Add a new modal | See section 7 "When Adding a New Modal" |
| Fix a save bug | Check section 1.1 — never add validation gates |

---

## 10. Two-Tier Experience & 2026-06 Unification

The app forks into **Lite** (mobile / on-site measuring) and **Full** (desktop / office quoting) — see `useExperienceMode()` (resolves tier from device + persisted override) and `useTierSize()`. PR19–24 brought all 8 forms to a consistent Lite/Full baseline; the 2026-06 pass unified the shared chrome.

### Shared primitives (one source each)
- **`AdvancedSection`** — the single disclosure model. `expanded={isFull}` → Full renders children inline; Lite wraps them in a collapsible that is *always expandable* (the escape hatch). Replaces the old per-form `showAdvancedLite` toggle.
- **`ItemSummaryCard`** — summary for the 7 non-curtain forms: breakdown rows + ราคาสุทธิ + override switch + (Full) traffic-light dot + `proSlot`.
- **`CostReadout`** — read-only cost/profit panel used in `proSlot` for area/wallpaper (these types have no per-item `_cost_*` fields, so no editable Pro Mode).
- **`useCostStatus`** — generic `CostEngine.analyze` for any `ItemData`. Replaced the curtain-only `useSmartPrice` (deleted).

### Rules / invariants (do not break)
1. **Disclosure split by intent, not by "advanced".** Installation-spec fields (ฝั่งดึง / เก็บใบ / รูปแบบการเปิด / ตำแหน่งดึง) → wrap in `AdvancedSection`. Catalog/cost tooling (จัดการรายการ, save-to-catalog ⭐, Pro Mode) → stay `{isFull && ...}` (office-only, no escape hatch).
2. **Honest profit signal.** Traffic-light dot + `CostReadout` render only when `isFull && analysis.totalCost > 0`. Removal (cost always 0) never shows a dot; area/wallpaper need a vault-cost code. Don't show a green dot when cost is unknown.
3. **Curtains keep their richer `PriceSummary`** (editable Pro Mode via `_cost_*`) as the Tier-1 reference. Only the cost hook was converged to `useCostStatus`. Do **not** downgrade it into `ItemSummaryCard`.
4. **ItemModal footer is a single row of `size="md"` (48px) buttons.** Add mode: "บันทึก & เพิ่มจุดถัดไป" (primary, `flex-[1.4]`) + "บันทึก & ปิด" (outline). Don't revert to stacked `lg` buttons.
5. **Touch ergonomics via `useTierSize().control`** → passed to `<Input size>` (Lite = lg/56px). Don't hardcode input heights per tier.

Verified live (Playwright, Lite 390px + Full 1280px): single-row footer, Lite collapsible disclosure + Full inline, and green traffic-light + CostReadout with a seeded vault cost (60% margin). `npm run lint` 0-warn, `npm run test:run` 295 passing.

---

**Last refactor:** 2026-06 (Two-Tier unification) · 2026-04 (core refactor)  
**Persistence key:** `marnthara.input.v6.4` · tier override: `marnthara-experience`  
**App version:** `vite-refactor/6.7.0-strict-mode`
