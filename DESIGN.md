# DESIGN.md — Marnthara design system & requirements

> **This document is the designer.** There is no human UI designer on this project, so this file
> *decides* look-and-feel and is the **source of truth** for every UI decision. When code and this doc
> disagree, the doc wins (or the doc is changed deliberately, in a PR, with reasoning).
>
> Foundations it builds on (read once, then defer here): **[HANDOFF.md §1.6](./HANDOFF.md)** (Apple HIG +
> NN/g ergonomics) and **§1.7** (Geist-aligned visual language). This file is the *applied, enforceable*
> layer on top of them.

---

## 0. 🎯 Philosophy

- **Mobile / on-site first.** The primary user is a technician measuring windows on a phone, then an
  office user quoting on desktop. Design and verify at **360–390px first**.
- **Legible & premium, never cramped.** Readability and a calm, confident feel beat information density.
  If a screen feels busy or the text feels small, it is **wrong** — fix it.
- **Measure, don't guess.** Never adjust by vibe ("make that smaller"). Use the **Design Probe** (§6) to
  read an element's *what / where / exact size* first, then change the exact line. "Bigger" is not
  automatically "better" — but the UI must never be hard to read.
- **The doc decides.** New/changed UI must satisfy this spec before merge (§6 checklist).

---

## 1. 📐 Typography — the core standard (STRICT)

The #1 readability rule. Primary content (**Body**) is **14–16px**, no compromise. **`12px` is heavily
restricted — Meta only** (dates, counts, units, micro-labels). **Anything below 12px is banned** for any
human-readable content.

| Role | Size | Class | Use |
|---|---|---|---|
| **Display** / หัวใหญ่ | 20–24px | `text-xl` / `text-2xl` + `font-bold` | screen / section hero |
| **Title** / ชื่อ | 16px | `text-base font-semibold` | card / room / item titles |
| **Body** / เนื้อหา | **16px** (dense: **14px floor**) | `text-base` / `text-sm` | primary reading text — **never < 14px** |
| **Label** / รอง | 14px | `text-sm` | secondary labels, specs |
| **Meta** / ป้ายเล็ก | **12px — META ONLY** | `text-xs` | dates / counts / units only |
| **Numeric** / ตัวเลข | mono, **≥ 14px** | `font-mono tabular-nums` | prices / dims / codes (§1.7) |

**Hard rules**
- ❌ No `text-[9px] / text-[10px] / text-[11px]` (or any < 12px) on content. (Enforced — §6.)
- ❌ No `12px` for Body/primary content — `12px` is for Meta only.
- ✅ Thai needs air: body `line-height ≥ 1.5` (`leading-normal`+); **never** `leading-none` / `leading-tight`
  on multi-line Thai. Negative tracking (`tracking-tight`) is for **Latin headings / numbers only**, never Thai body.
- *Exempt:* `src/components/print/**` (print medium has its own sizing).

Machine-readable mirror: [`src/config/typography.ts`](./src/config/typography.ts) (`TYPOGRAPHY`,
`CONTENT_MIN_PX = 12`, `BODY_MIN_PX = 14`, `classifySizePx`). The `Text` primitive and the Probe both read it.

---

## 2. 🎨 Color & contrast

- **Content text uses `text-foreground`.** `text-muted-foreground` is allowed **only** for genuinely
  secondary text **and only at ≥ 14px** (muted at 12px fails comfortable contrast).
- Target **WCAG AA** (4.5:1 for body text).
- **Monochrome-first / `primary` = CTA only** (§1.7): decorative icons, chips, labels default to
  `text-foreground` / `text-muted-foreground`. `bg-primary text-primary-foreground` *fills* are for the
  real CTA and selected states only. Status / brand / traffic-light colors are the sanctioned exceptions.
- **Borders over shadows** (§1.7): separate surfaces with `border-border` + a bg shift, not elevation.

---

## 3. 📱 Spacing, radii & touch

- **Touch targets ≥ 44×44** (HIG). Reuse `Button` (`size="icon"`/`"md"` = 48px) or `h-11 w-11` + centered icon.
- **Control size by tier** via `useTierSize().control` (Lite = lg/56px) — never hardcode per-tier heights.
- **Radii:** controls `rounded-lg`/`rounded-xl`; cards/containers `rounded-xl`. Avoid `rounded-2xl`+ on controls.
- **Density by tier:** `useTierSize().section` (Lite roomier, Full denser). Don't let cards feel cramped on mobile.

---

## 4. 🎨 Icons, emoji & motion

**Functional icons = `lucide` only** (from §1.7): `strokeWidth={1.5}`, 16px grid (`w-3.5`/`w-4`/`w-5`),
`currentColor` (monochrome). Motion subtle + fast (`cubic-bezier(0.16,1,0.3,1)`); no gradient/glow flourishes.

### 4.1 Emoji legend (project convention — fixed meanings)

Emoji are a **semantic labelling convention**, not decoration. Each has **one fixed meaning** (below).
- **In documents:** use them as **section markers / status** consistently — every doc here follows this legend.
- **In the app:** use them **only as much as necessary** — as a category/status accent on headers, empty
  states, status lines, help/onboarding. **Never** replace functional/affordance icons (those stay
  lucide-monochrome) and never stack them. They're an accent, not the icon system.

| Emoji | Meaning | | Emoji | Meaning |
|---|---|---|---|---|
| ✅ | done / pass / verified | | 🗺️ | map / index / overview |
| 🎨 | design / UI / visual | | ⚙️ | config / workflow / build |
| 💻 | develop / code / run | | ⚠️ | warning / invariant / open issue |
| 🧪 | test / QA | | 🐛 | bug / fix |
| 🎯 | goal / verification gate / focus | | 💰 | cost / pricing / catalog |
| 📖 | required reading / docs | | 📱 | mobile / two-tier |
| 📐 | design spec / standard | | 📌 | note / tech debt |
| 🏗️ | architecture / structure | | ▶ | next action / phase |

Extend the legend only when a genuinely new recurring category needs one — keep it tight (no emoji soup).

---

## 5. 💰 Numeric layer (from §1.7)

Every number/code the eye scans or compares → `font-mono tabular-nums` (renders in self-hosted **Geist Mono**,
`--font-mono`). Prices, dimensions, codes, units, counts. Minimum 12px (Meta) / 14px (in Body).

---

## 6. ⚙️ Workflow & enforcement — how the doc stays real

1. **Measure with the Design Probe** (`src/components/dev/DevInspector.tsx`, dev only). `npm run dev` →
   **Alt+L** (or the floating "Probe" button) → hover/click any element. It shows **text · file:line ·
   font-size / line-height / weight · the `text-*`/`font-*` classes · the DESIGN.md role · ⚠ if < 12px**,
   and **copies a paste-ready block**. Use it to give precise instructions ("this 11px → Label/14px"),
   never vague ones.
2. **Size text via the `Text` primitive** (`src/components/ui/Text.tsx`):
   `<Text variant="title|body|label|meta|display" numeric muted>` resolves to the scale above (floor baked
   in). Prefer it over ad-hoc `text-*` classes for new/changed content.
3. **Lint guard (gated)** — the `no-restricted-syntax` rule in [`eslint.config.js`](./eslint.config.js)
   blocks every `< 12px` content size; `npm run lint` (the 0-warning gate) fails on regressions. Print
   (`src/components/print/**`) is exempt. See §7.
4. **Per-screen checklist before merge:** Body ≥ 14px · Meta(12px) only on dates/counts/units · no < 12px
   content · content = `text-foreground` (muted only ≥ 14px, secondary) · 44px taps · numbers `font-mono` ·
   icons stroke 1.5 · borders over shadows · `primary` only on CTA/selected · verified at 360–390px.

---

## 7. ✅ Phase-2 readability pass — DONE

Phase 1 defined the standard + tooling (Probe, `typography.ts`, `Text`, the lint guard) with **no
rendered UI changed**. **Phase 2 is complete:**

- **Worklist cleared** — all sub-12px content sizes (was **79 sites / ~22 files**) migrated to the scale:
  Meta (units · counts · codes · chips · eyebrow micro-labels) → `text-xs` (12px); genuine readable
  sentences (helper / explanatory text) → `text-sm` (14px). The A4 **lookbook** preview keeps its print
  sizing (`text-[12px]`, matching its siblings).
- **Guard is gated** — the `no-restricted-syntax` rule now lives in [`eslint.config.js`](./eslint.config.js)
  at `error`, so **`npm run lint`** (the 0-warning gate) blocks any future `< 12px` content. The standalone
  `eslint.design.config.mjs` + `npm run lint:design` were retired.
- **Exempt:** `src/components/print/**` (print medium has its own sizing).

> Ongoing discipline: keep new/changed UI on the scale (§1) and **measure with the Probe** (§6) before
> adjusting — don't blanket-enlarge (the reverted "ภาพรวม" enlarge is the cautionary tale).
