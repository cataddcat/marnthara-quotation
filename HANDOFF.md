# Handoff — 2026-04 Refactor Session

Comprehensive summary of architectural changes, design philosophy, and workflow decisions from the 2026-04 refactor session. Any developer (human or AI) picking up this project should read this document first to understand the *why* behind the current codebase shape.

---

## 1. 🎯 Design Philosophy (READ THIS FIRST)

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

Thai market 2025 prices are baked into `DEFAULT_LABOR_COSTS`, `DEFAULT_SERVICE_COSTS`, and `DEFAULT_ACCESSORY_COSTS`. Users can:
- Override **ค่าแรง + บริการ** in `ProductionSettingsModal` (the Vault = shop's own labor/service prices)
- Override **product/rail costs** in `MaterialSummaryModal` ("คลังวัสดุ" / catalog — fabric/area/hardware SKUs)
- Reset labor/service/accessory to defaults with "โหลดค่ามาตรฐาน 2025"
- Use Pro Mode to override per-item

**Why:** A brand-new install should give reasonable cost calculations immediately, not zeros.

> ⚠️ **As of the 2026-06 cost split (§11):** `DEFAULT_ACCESSORY_COSTS` is now **rail-only** (`rail_*`) and serves purely as a *legacy fallback* when a curtain hasn't picked a rail SKU from the catalog. It is **not editable in `ProductionSettingsModal` anymore** — real rail costs live in the catalog (`hardwareCosts`). See §11.

### 1.6 UX Baseline — Apple HIG + NN/g (mandatory for every screen)

> 📐 Now consolidated + made enforceable in **[`DESIGN.md`](./DESIGN.md)** (the canonical design spec). §1.6/§1.7 are its foundation.

The standing UX contract for all UI. Apple Human Interface Guidelines + Nielsen Norman Group usability heuristics, mapped to this codebase's primitives. **New or changed UI must satisfy all five before merge.**

1. **Visual hierarchy & clarity.** Drive the eye with typography (weight / size / line-height) and contrast. **Reserve the `primary` color exclusively for the primary CTA** — don't tint secondary affordances, nav chevrons, or decorative icons with `primary` where it competes with the real action.
2. **Touch targets & ergonomics (HIG ≥ 44×44).** Every interactive element gets a ≥ 44×44px hit area. Reuse `Button` (`size="icon"` / `"md"` = 48px) or apply `h-11 w-11` (44px) + a centered icon — never ship a bare icon with only `p-1.5`. Drive control size by tier via `useTierSize().control` (Lite = lg/56px); never hardcode input heights per tier.
3. **Minimize cognitive load (NN/g).** Group related fields by the Law of Proximity; use universal `lucide` icons; apply progressive disclosure via `AdvancedSection` (installation-spec fields collapse in Lite). Don't surface every field at once.
4. **System status & fluid feedback.** Every control ships the full state set — `hover`, `active`, `focus-visible` (NOT `focus`, which also fires on mouse click), plus `loading` / `disabled` where applicable. `Button` already encodes these; custom controls must match.
5. **Error prevention & forgiveness (NN/g).** Prevent mistakes with smart constraints + input formatting (smart-parse). Irreversible actions use the `destructive` variant + an explicit confirm. **Coexists with §1.1 Save-First:** autosave makes *closing a form* non-destructive (no confirm needed), so reserve confirmations for true data deletion (delete room / item / cost entry), never for navigation.

**Reference implementation:** `src/components/ui/Modal.tsx` — 44px header close/back buttons via the reused `Button`, tier resolved from `useExperienceMode()` (respects the persisted override, not raw screen width — see §10), and a visible drawer close button.

### 1.7 Geist-aligned visual language (synthesized from §1.6 + Vercel Geist)

> 📐 The applied/enforceable design law now lives in **[`DESIGN.md`](./DESIGN.md)** (typography floor, Design Probe, `Text` primitive, `lint:design`). This section remains the visual-language rationale it cites.

We have HIG + NN/g (§1.6) but **no UI designer** — this section is the standing visual language, synthesized from §1.6 and Vercel's **Geist** design system, mapped to our tokens/primitives. It decides look-and-feel so we don't have to re-litigate per screen. **§1.7 layers on top of §1.6 — never overrides §1.6's ergonomics.**

*Why this fits us:* our foundation is already ~70% Geist — `--primary` is Slate-900 (≈black) / near-white in dark (Geist's monochrome core), tokens are semantic, headings track tight (-0.02em), base is 16px. The gap is flatness, the numeric layer, radii, and icon discipline.

1. **Monochrome-first ⊇ §1.6#1 (primary = CTA only).** Decorative/affordance icons, chips, and labels default to `text-foreground` / `text-muted-foreground` — **never `text-primary`** unless the element *is* the primary CTA. (Status/brand/traffic-light colors are the sanctioned exceptions — they carry meaning.)
2. **Borders over shadows.** Separate surfaces with a 1px `border-border` + a background shift (`bg-card` / `bg-muted/40`), not elevation. Avoid `shadow-md`/`shadow-2xl`/`shadow-primary/*`, gradients (`gradient-*`), and `.glass-card`. Allowed: a single neutral `shadow-sm` for true overlays (menus/popovers), and the modal backdrop.
3. **Sharper, consistent radii.** Controls (button / input / tab / chip) → ~8px (`rounded-lg`); cards/containers → ~10–12px (`rounded-xl`). Avoid `rounded-2xl`+ on interactive controls (too pillowy for Geist). Token: `--radius: 0.75rem` stays the card baseline.
4. **Geist Mono = the numeric layer.** `--font-mono` is **Geist Mono** (self-hosted `public/fonts/GeistMono-Variable.woff2`, precached for offline). Every `font-mono` (prices, dims, codes, units — ~72 sites) renders in it; being monospaced it aligns numbers into columns for free. Use `font-mono` for any number/code the eye scans or compares. Body text keeps the system Thai sans (Geist has no Thai glyphs).
5. **Icon discipline (keep lucide).** `lucide` everywhere, but Geist-tuned: `strokeWidth={1.5}`, sizes on a 16px grid (`w-3.5`/`w-4`/`w-5`), `currentColor` only (monochrome — see #1). Do **not** migrate icon libraries; tuned lucide ≈ Geist look at zero churn.
6. **Restrained accent + clear focus.** Keep `focus-visible:ring-ring` (NOT `:focus`). Accents (status / brand / amber prices / emerald profit) are *accents* — text/border/dot, not full fills.
7. **Keep §1.6#2 ergonomics — do NOT adopt Geist's desktop density.** 44×44 hit areas, `useTierSize().control` (Lite = 56px), 16px base stay. Geist is desktop-dense; we are mobile/on-site first.
8. **Motion: subtle + fast.** Keep the existing `cubic-bezier(0.16,1,0.3,1)` easings; drop gradient/glow flourishes (they read "2021", not Geist).

**Rollout:** apply per screen when you touch it (don't sweep all 14 modals at once). Reference application = `ProductionSettingsModal` ("ตั้งค่าต้นทุน").

**Rollout status (2026-06):** ✅ **full-app sweep done.** Foundation (control primitives drop `rounded-2xl`→`rounded-xl`; `Button` primary CTA flattened — no `shadow-primary`; dead `.glass-card`/`.gradient-*`/`.hover-glow`/`.hover-lift` + `--gradient-*` removed from `index.css`) + every screen: `ItemCard`, `RoomCard`, shared primitives (`ItemSummaryCard` — dropped the decorative blur glow + the now-dead `accentClass` prop across 8 callers; `FormSection`; `CollapsibleSection`), curtain sections (`Style`/`Hardware`/`Price`/`Fabric`/`CurtainForm` — selected pills now monochrome `border-foreground bg-accent`), `MaterialSummaryModal`, `FinancialDashboard` (+`FinancialRing`/`ItemCard`/`CostRow`/`CodeJumpButton`), and the remaining modals/chrome (`MainMenu`, `Discount`, `Data`, `ProjectOverview`, `ShopSettings`, `Customer`, `CodeDetail`, `FormulaDocs`, `Lookbook`, `CopySummary`, `Modal`, `OptionSheet`, `AlertDialog`, `Toast`, `FormLayout`, `GlobalErrorGuard`, `MainLayout` dock, `SmartNavigator`, `ComboboxInput`, `Input` undo). Recipe applied: borders-over-shadows · `font-mono` on scanned numbers · lucide `strokeWidth={1.5}` · decorative `text-primary`/`bg-primary/10`→neutral (`text-foreground`/`bg-muted`/`bg-accent`). **Kept (sanctioned):** status/brand/traffic-light colors, per-room accents, the dark Pro Mode + Discount invoice cards, `bg-primary text-primary-foreground` *fills* on true CTAs/selected states, neutral overlay shadows (modal `shadow-2xl`, menu/popover `shadow-md`, dock, PDF paper), `FinancialRing` conic chart. Verified: `lint` 0-warn · `test:run` 456 pass · `build` OK.

**Post-sweep follow-ups (2026-06-07):**
- **Dock HOME button** — the `MainLayout` floating dock is now **4 pills** (หน้าหลัก / ห้อง / ภาพรวม / เมนู). `App.handleGoHome` = focus mode + first room + smooth scroll-to-top; dock widened `max-w-[440px]`, pills tightened (`px-2 gap-1.5 text-[12px] whitespace-nowrap`, `focus-visible:ring-ring`).
- **`Modal.tsx` scroll-aware header** — the header separator is **transparent until the content scrolls** (`scrolled` state via `onScroll`, applied to drawer + center/fullscreen; header padding `py-2`→`py-2.5`). A clean flat top that gains a divider only when there's more above — universal polish for *every* modal.
- **⚠️ Overview ("ภาพรวม") readability — STILL OPEN.** The user flagged the overview as **รก / เล็ก / ตัวหนังสือเล็ก** (cluttered / cramped / tiny text). A plan to enlarge type + spacing + ≥44px taps and drop the Full dashboard from 3→2 columns (`RoomDashboard` · `ProjectOverviewModal` · compact `RoomCard` · `RoomSlider`) was implemented **then reverted at the user's request** — the blanket "bigger everywhere + fewer columns" approach didn't land. The underlying complaint **stands**; re-approach with a *different* strategy (reduce what's shown / sharpen hierarchy rather than uniformly scaling fonts; or confirm direction first). **Do not re-apply the reverted diff.**

**▶ Next focus: UI.** The standing design philosophy is **§1.6 (HIG + NN/g ergonomics) + §1.7 (Geist visual language)** above — together they decide look-and-feel (there is no UI designer; the doc is the designer). Meta-lesson from the reverted overview pass: for **density / typography changes on shared screens**, prefer lighter, targeted touches and surface concrete options to the user before a blanket sweep — "make it bigger" is not automatically "make it better."

---

## 2. 🗺️ System Map

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
| `productionSettings` | **Cost Vault** — ค่าแรง + บริการ only (labor/service) since §11 | — |
| `costDashboard` | **Financial Health** — P&L overview | — |
| `materialSummary` | **คลังวัสดุ** — BOM + product/rail catalog cost editor (fabric/area/hardware SKUs) | — |

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
  ├─ C. Rail cost — width × (hardwareCosts[rail_code] SKU → accessoryCosts[railKey] legacy → 0)
  │     (component costs ขาจับ/ลูกล้อ/เทป are bundled in the rail SKU; accCost is always 0 — see §11)
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

## 3. 🏗️ Feature Modules (Key Files)

### Cost Vault
- `src/store/slices/CostDataSlice.ts` — **7 vaults** (`laborCosts`, `serviceCosts`, `accessoryCosts`, `hardwareCosts`, `fabricCosts`, `wallpaperCosts`, `areaCosts`) + `DEFAULT_LABOR_COSTS` / `DEFAULT_SERVICE_COSTS` / `DEFAULT_ACCESSORY_COSTS` (rail-only). Plus `userCostDefaults` (owner baseline snapshot — see §11.7). See §11 for what each vault means + which UI edits it.
- `src/components/modals/ProductionSettingsModal.tsx` — CRUD UI for **ค่าเย็บ + บริการ** in **2 tabs** `[ค่าเย็บ][บริการ]` (`activeTab` state). Product/rail costs live in `MaterialSummaryModal`. ⋯ menu: load factory defaults / save-as-my-defaults / restore-my-defaults / import (auto-detect) / export.
- Defaults: labor = 130/ม. (ลอน/จีบ/ตาไก่/แป๊บ), 300/ม. (พับ — `unit: 'meter'`), 500/ม. (หลุยส์), 130/ม. (ผ้าโปร่ง); all `min_price: 0`. Service = `{ install_point: 300, removal_per_point: 300 }` only.
- Actions: `updateLaborCost`, `removeLaborCost`, `updateServiceCost`, `removeServiceCost`, `updateHardwareCost`, `removeHardwareCost`, `updateFabricCost`, `updateWallpaperCost`, `updateAreaCost`, `loadDefaultCosts`, `resetProductionCosts`, `saveCostDefaults`/`loadCostDefaults`/`clearCostDefaults` (owner baseline), `importCatalog`, `exportCatalog`

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

### Room Dashboard — Full-tier overview + drag-reorder (NEW, 2026-06)
- `src/components/features/RoomDashboard.tsx` — the **Full**-tier rendering of `viewMode === 'overview'` (Lite keeps the compact `RoomCard` stack). Responsive grid (`sm:2 / xl:3`) of room cards, each = header (grip · name→focus · total · ⋯ menu) + its `ItemCard` list + add-item; trailing add-room cell; a project summary header on top (total points / ค้าง / grand total).
- **Reorder via `@dnd-kit`** (dependency added: `@dnd-kit/core` + `/sortable` + `/utilities`) — mouse **+ touch + keyboard** (PointerSensor distance-8 so taps/clicks still work; KeyboardSensor). Grip (`GripVertical`) is the `setActivatorNodeRef` drag handle so `ItemCard` stays clickable.
- **Three drag flows:** rooms reorder (grid `SortableContext`, `rectSortingStrategy`) · items reorder within a room (`verticalListSortingStrategy`) · **items move across rooms with live preview** (multi-container pattern: `onDragOver` mutates a local `localItems: Record<roomId, itemId[]>`, render reads from it; commit **once** in `onDragEnd`). Original room captured in `dragFromRoomRef` (the active sortable's `data.roomId` changes as it previews into other containers — don't rely on it for the source).
- **Store is the source of truth; the drag commits one undoable step.** `onDragEnd` → `reorderRooms` / `reorderItems` / `moveItemToRoom` (see §8 ProjectSlice). Custom `collisionDetection` filters droppables by active type (`room` vs `item`/`roomdrop`) so the nested contexts don't fight.
- **Discoverability:** in Full, the dock **"ภาพรวม"** (`MainLayout` `DockPill`, `active` state) **toggles** overview/focus instead of opening the summary drawer; `App.handleOpenOverview` branches on `useExperienceMode().isLite`. `MainLayout`'s `<main>` widens to `max-w-6xl` when Full+overview.
- The ⋯ room menu also offers **เลื่อนก่อนหน้า/ถัดไป** (`reorderRooms ±1`) as a non-drag, keyboard/touch-friendly reorder fallback, plus คัดลอก/ซ่อน/ลบ (reuses store actions + `useConfirm`).

---

## 4. ⚠️ Critical Invariants (Do Not Break)

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

## 5. 🐛 Bugs Fixed in This Session

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

## 6. 📌 Known Tech Debt (NOT addressed this session)

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

## 7. ⚙️ Workflow & Dev Notes

### Verification policy (updated 2026-06-03)
- After changes, verify with `npm run lint` (zero-warnings is a hard gate), `npm run test:run`, and `npm run build`. Skipping tests previously let a regression slip through (the `ItemCard` title test), so verification is expected — not optional.
- *(Superseded: an earlier note said "do not run build/test — user runs manually." That preference is retired.)*
- **Config files:** `vite.config.ts` / `vitest.config.ts` are the source of truth. `tsc -b` (via `tsconfig.node.json`) emits to `node_modules/.tmp/config` so it never drops `.js`/`.d.ts` into the project root — those would shadow the `.ts` because Vite/Vitest resolve `.js` first.

### Persistence
- Zustand `persist` key: `marnthara.input.v6.4` (localStorage), **`version: 3`**
- `migrate` (`src/store/migrations.ts`), idempotent, all in `migrateLegacyState`:
  - **v1→v2** `migrateLegacyItem` — normalizes legacy curtains (`type: 'set'` + old field names `fabric_code`/`sheer_fabric_code`/`track_color`, missing `layer_mode`) into the current curtain schema.
  - **v2→v3** `migrateCostVaults` — moves service keys (`install_*`/`transport_*`/`fuel_*`/`removal_per_point`) out of `accessoryCosts` into `serviceCosts` (doesn't overwrite a key the user already set in `serviceCosts`).
- Zundo `temporal` limit: 20 undo states; its `partialize` now also tracks `serviceCosts` + `hardwareCosts` (so undo/redo covers all 7 vaults).
- `omitTransientState` excludes: `activeModal`, `modalProps`, `modalStack`
- `factoryReset` (ProjectSlice) resets in-memory state clean **first**, then `localStorage.clear()` + reload — clears all 3 persist keys, avoids the persist-rewrites-just-cleared-key race (see §11 / commit a043368).

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

## 8. 🗺️ File Reference Index

### Core State
```
src/store/useAppStore.ts              — Root store (temporal + persist v3 + 6 slices)
src/store/migrations.ts               — persist migrate: v1→v2 legacy items + v2→v3 cost-vault split
src/store/slices/
  UISlice.ts                          — Modals + toast queue
  ProjectSlice.ts                     — rooms[] + CRUD + factoryReset + reorderRooms/reorderItems/moveItemToRoom (Room Dashboard §3)
  CustomerSlice.ts                    — Customer info
  ShopProfileSlice.ts                 — Shop config + discount
  InventorySlice.ts                   — code registry + importCatalog/exportCatalog (catalog contract)
  CostDataSlice.ts                    — 7 cost vaults + DEFAULT_LABOR/SERVICE/ACCESSORY (§11)
  (FormulaSlice removed — formulas are now compile-time FORMULAS in src/config/formulas.ts)
src/lib/vault.ts                      — CATALOG_CATEGORIES: category id → {label, costUnit, vault} routing
src/lib/catalog/contract.ts           — Zod catalog contract v2 (import/export schema, isCatalogContract)
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

## 9. 🗺️ Quick Reference: "Where do I…?"

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

## 10. 📱 Two-Tier Experience & 2026-06 Unification

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

## 11. 💰 Cost & Catalog Architecture (2026-06) — Quote-first / Cost-optional

A multi-phase refactor that separated **costs** (volatile, optional, externally-sourced) from the **calculator** (the app). Read this before touching cost vaults, the catalog, `ProductionSettingsModal`, or `MaterialSummaryModal`.

### 11.1 Guiding principle

The app is a **pure quotation calculator**. Costs are an **optional overlay**:
- A quote can be produced with **zero cost data** — the user enters a sell price directly, with or without a product code.
- When a cost is missing, `CostEngine` returns `status: 'unknown'` (gray) — it **never fabricates a number or shows false profit**.
- Costs are market-volatile, so they are not baked into quotes; they hydrate from defaults, manual entry, or an **external catalog** (the long-term plan is AI-extracted supplier prices → catalog JSON → import). Catalog generation lives **outside** the app.

### 11.2 The 7 cost vaults (`CostDataSlice`) and who edits them

| Vault | Holds | Edited in | Read by |
|---|---|---|---|
| `laborCosts` | ค่าเย็บ per style (`LaborCost{rate,unit,min_price}`) | ProductionSettings (แท็บ ค่าเย็บ) | CostEngine D/D2 |
| `serviceCosts` | ค่าติดตั้ง + รื้อถอน ต่อจุด (flat) | ProductionSettings (แท็บ บริการ) | CostEngine (removal); install_point = reference |
| `accessoryCosts` | **rail-only `rail_*`** legacy fallback (฿/m) | *(seed-only — not in any UI)* | CostEngine C fallback |
| `hardwareCosts` | rail/hardware **catalog SKU** → ฿/unit | คลังวัสดุ (catalog) | CostEngine C primary |
| `fabricCosts` | ผ้าทึบ/โปร่ง code → ฿/yard | คลังวัสดุ + InventoryManager | CostEngine A/B |
| `wallpaperCosts` | wallpaper code → ฿/roll | คลังวัสดุ | CostEngine (wallpaper) |
| `areaCosts` | blind/screen/partition code or type → ฿/sqyd | คลังวัสดุ | CostEngine (area) |

**Mental model:** `ProductionSettings` = *the shop's own labor/service* (typed by hand, remembered). `คลังวัสดุ` (`MaterialSummaryModal`) = *products* (fabric/area/rail SKUs, ideally imported from a catalog). Don't merge these two UIs — the split is intentional.

### 11.3 Rail cost = catalog SKU (Phase C), components bundled (Phase B)

- A curtain carries an optional `rail_code` (`CurtainItemInput`). The form's rail picker (`HardwareSection`) lists hardware SKUs from `useInventory(STYLE_TO_RAIL[style])` and sets `rail_code` + syncs `rail_color`.
- CostEngine C priority chain: `width × (hardwareCosts[rail_code] → accessoryCosts[railKey] legacy → 0)`.
- **Rails are complete assembled sets** (rollers / brackets / tape included in the SKU price). The old per-component cost keys (`eyelet_ring`, `tape_wave`, `rod_bracket`) were **removed** — `accCost` is now always `0`. (`eyelet_ring`/`tape_wave` were already dead; `rod_bracket` previously added `4×` to rod-curtain cost — that's now assumed bundled.)
- **Pricing unit:** all rails (incl. roman/พับ and louis/หลุยส์) are priced **per meter of track** ("ชุดต่อเมตร" = sold as a set, priced per metre), so `width × rate` is correct. `vault.ts` `costUnit` for every `rail_*` is `'เมตร'`.

### 11.4 Wave-hardware COUNT system is independent of cost

The roller/bracket/snap **counts** for ม่านลอน (shown in คัดลอกสรุป + lookbook) are computed by `calcWaveHardware` / `calcBrackets` and are **unaffected** by the cost-bundling above — they still work.
- **Bracket formula (single source, tested):** ม่านลอน → `ceil(width / FORMULAS.materials.rail_bracket_spacing)` where `rail_bracket_spacing = 0.6`; 2-layer uses the same count. Used by both `buildSummary.calcBrackets` and `summaryGenerator` (rail order) → they always agree.
- **Not yet reconciled:** ม่านตาไก่ (eyelet) brackets still use the generic `ceil(width/1.2)+1 ×1.3` path — deliberately deferred ("ม่านตาไก่ยังไม่ต้องนะ").

### 11.5 Catalog contract (`src/lib/catalog/contract.ts`)

Versioned Zod schema for import/export. `CATALOG_CONTRACT_MAGIC = 'marnthara.catalog'`, current `version: 2` (accepts v1|v2). Each entry: `code`, `category` (validated against `CATALOG_CATEGORIES`), `cost`, plus optional `sell_price`/`unit`/`brand`/`model`/`color`/`variant`/`supplier`/`note`/`captured_at`. `InventorySlice.importCatalog` validates → atomic upsert-by-code + routes cost to the right vault via `categoryVault()`; `exportCatalog` emits the same shape. Import surfaces in `DataModal` (paste tab) + `ProductionSettings`/`MaterialSummary` menus (auto-detect: catalog vs vault-dump).

### 11.7 Owner baseline ("ค่าตั้งต้นของฉัน") — defaults without a developer

The factory `DEFAULT_*` constants are dev-owned and only seed an *empty* vault (persisted localStorage shadows them on every rehydrate — there's no custom `merge`, so a persisted `laborCosts` wholesale replaces the default). To let the shop owner own their own reset point without editing code, `CostDataSlice` carries `userCostDefaults: { laborCosts; serviceCosts; savedAt } | null`:
- `saveCostDefaults()` snapshots the current ค่าเย็บ+บริการ; `loadCostDefaults()` restores from the snapshot (falls back to code `DEFAULT_*` when null); `clearCostDefaults()` nulls it.
- `resetProductionCosts()` (and thus `factoryReset`) also nulls `userCostDefaults` → factory reset = back to code defaults.
- Persists automatically (not transient); intentionally **not** in the temporal/undo partialize. No version bump (additive optional field).
- UI: ProductionSettings ⋯ menu — "บันทึกเป็นค่าตั้งต้นของฉัน" / "โหลดค่าตั้งต้นของฉัน" (shows `savedAt`, hidden until a baseline exists), alongside the existing "โหลดค่ามาตรฐาน 2025" (`loadDefaultCosts` = code factory).

> Note for devs: after editing a `DEFAULT_*` constant, an existing install won't see it until the owner taps "โหลดค่ามาตรฐาน 2025" (or factory-resets) — persisted state shadows the seed.

### 11.6 Open follow-ups (next session — excludes Phase D)

- **Stale test fixtures:** `test-data/*.json` still carry retired keys (`eyelet_ring`/`tape_wave`/`install_*`) inside `accessoryCosts`. Harmless (nothing reads them; v2→v3 migrate relocates the service ones), but worth cleaning so the fixtures match reality.
- **Eyelet bracket reconciliation** (§11.4) — when the user is ready.
- **Provenance display** — `supplier`/`captured_at` are imported + stored on the inventory item but not yet surfaced in คลังวัสดุ ("จาก ABC · อัปเดต …").
- **Phase D (out of scope here):** IndexedDB for 10k+ SKUs, external DB / AI ingestion pipeline, physical-store split.

---

**Last refactor:** 2026-06 (Cost/Catalog split §11) · 2026-06 (Two-Tier unification) · 2026-04 (core refactor)  
**Persistence key:** `marnthara.input.v6.4` (persist **v3**) · tier override: `marnthara-experience`  
**App version:** `vite-refactor/6.7.0-strict-mode`
