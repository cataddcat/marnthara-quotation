# DESIGN-AUDIT.md — "Marnthara Design System" bundle vs. this repo

> 🗄️ **ARCHIVED 2026-06-08 — historical, not a living doc.** Kept for the record only; nothing here is
> an active standard. Bottom line: the external bundle is a reverse-generated mirror of this repo →
> **0 code changes**. Doc index: [DOCS.md](/DOCS.md). (Links below are relative to the repo root.)

> 📖 One-time audit (2026-06-08) of a design bundle fetched from **claude.ai/design**. Records the
> finding that the bundle is a **reverse-generated mirror of this repo**, so the next agent does not
> waste effort trying to "implement" it. Uses the [DESIGN.md](/DESIGN.md) emoji legend.

## 🎯 TL;DR

A design file was fetched and we were asked to "implement the designs." On extraction it proved to be
a **design system the `claude.ai/design` assistant reverse-generated from this very codebase**
(`cataddcat/marnthara-quotation`) — it read our `DESIGN.md`, `index.css`, and UI components and
re-expressed them as static HTML/CSS/JS prototypes. It is a **faithful but lossier mirror**: there is
**no genuine drift where the design leads the repo**, with one debatable exception (the UI font).

**Outcome of the "audit & sync" pass: zero app-code changes** — every candidate change is either dead
code, a regression, or already shipped. The lone real decision is whether to adopt a UI webfont
(`IBM Plex Sans Thai`), offered as an explicit opt-in below.

## 📦 What the bundle contained

`README.md` + 2 chat transcripts + `project/` with: `tokens/*.css`, 9 components
(`components/core/*` + `components/features/*`), a 5-surface `ui_kits/quotation/` kit, `guidelines/*`
specimen cards, self-hosted Geist Mono, gold logo PNGs, `SKILL.md`, and compiler artifacts
(`_ds_bundle.js`, `_ds_manifest.json`). Styling is inline `style` objects over CSS custom properties
(no Tailwind) — prototype-grade, React 18 UMD + in-browser Babel, no build step.

## 🎨 Tokens — identical core + unused scaffolding

- The design's `tokens/colors.css` is **byte-identical** to [src/index.css](/src/index.css): same
  Eye-Care 2025 palette, same `--brand-*` product categories, same `.dark` scope, same Geist Mono
  `@font-face`. Verified value-by-value against the bundle's `_ds_manifest.json`.
- The design adds convenience tokens we do **not** define: `--text-display|title|body|label|meta`,
  `--control-sm|md|lg|icon`, `--space-N`, `--press-scale`, `--ease-out-expo`, `--duration-*`,
  `--tracking-*`, `--radius-sm|md|lg|xl|full`, `--content-min-px`, `--body-min-px`.
- **Grep confirms none of these are referenced anywhere in our code.** We express the same concepts
  via Tailwind v4 utilities + the rules in `DESIGN.md`. Porting them would be dead code.
- **Verdict: no token changes.**

## 💻 Components — the design is a lossier subset

The bundle ships 9 prototype components; this repo ships **22** richer primitives in
`src/components/ui/`. Each design component is a simplified inline-`style` re-creation of one of ours:

| Design (prototype) | Repo (production) | Verdict |
|---|---|---|
| `Button.jsx` (inline styles) | [Button.tsx](/src/components/ui/Button.tsx) — haptics, differential shadows, `focus-visible` ring, Tailwind | repo ahead |
| `Badge` / `Card` / `Input` / `Select` / `Switch` / `Toast` | repo equivalents in `src/components/ui/` | repo ahead |
| `ItemCard` / `RoomCard` | [ItemCard.tsx](/src/components/workspace/ItemCard.tsx) · [RoomCard.tsx](/src/components/workspace/RoomCard.tsx) | repo ahead |
| — (not in bundle) | Modal, AlertDialog, Text, ComboboxInput, OptionSheet, AdvancedSection, FormLayout, … | repo-only |

- **Verdict: no component changes.** Adopting any prototype would be a regression.

## 🖥️ Surfaces — all five already exist, more capable

The kit's 5 "surfaces" already ship in-app, and the prototypes are static/fixed-width recreations
(the bundle's own HANDOFF flags them non-responsive, prototype-grade):

| Bundle surface | Already in repo |
|---|---|
| Mobile quotation app | room/item views (`RoomSlider`, `RoomDashboard`, `ItemCard`, `RoomCard`) |
| Financial Dashboard | `src/components/modals/FinancialDashboard/*` |
| Material Summary / BOM | `MaterialSummaryModal` |
| The Vault (fabric registry) | `CodeDetailModal` + code-registry modals |
| A4 Lookbook / PDF | `LookbookModal`, `PrintDocument` |

- **Verdict: no surface changes.**

## ⚠️ The one genuine delta — UI font (a decision, not a clear win)

- This repo defines **no `--font-sans`**; the UI renders on Tailwind's bare `system-ui` stack
  (grep finds only `font-sans` utility usages, no font declaration).
- The design sets `--font-sans: 'IBM Plex Sans Thai'`. The chat transcripts show this was a
  **substitution the design tool invented** because it found no UI webfont in the repo — approved
  *for the design system*, not for production. The font file is **not in the bundle** (only Geist
  Mono is).
- Tradeoffs: this is a mobile-first **offline PWA** that deliberately avoids a UI webfont
  (`system-ui` renders Thai natively, zero payload, no FOUT). A Thai webfont means a self-hosted
  woff2 + flash risk.
- **Recommendation: do not auto-apply.** Opt-in recipe if ever wanted:
  1. Self-host the IBM Plex Sans Thai subset woff2 in `public/fonts/` (parity with Geist Mono).
  2. Add an `@font-face` block in [src/index.css](/src/index.css) beside the Geist Mono one.
  3. Add `--font-sans: 'IBM Plex Sans Thai', system-ui, …` to the `@theme` block.
  4. Verify Thai rendering + bundle size; confirm the PWA precache covers the new woff2.

## ✅ Net result

The "audit & sync" pass touched **no app code** — the design is a faithful, lossier mirror of what we
already ship. The only open choice is the optional UI-font swap above.
