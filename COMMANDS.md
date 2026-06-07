# COMMANDS.md — project command reference

Every command needed to work on **Marnthara Smart Quotation**, grouped by purpose, with the expected
"green" result. Source of truth = `package.json` `scripts`. Node + npm; Windows/PowerShell or bash both work.

> Section markers follow the emoji legend in **[DESIGN.md §4.1](./DESIGN.md)** (✅ gate · 🎨 design · 💻 dev · 🧪 test · 🎯 quality · 📌 notes).

---

## ✅ Verification gate (run before handing off any change)

These are the three that must pass. Per HANDOFF §7, running them is **expected** (don't skip).

```bash
npm run lint          # ESLint — must be 0 warnings (hard gate)
npm run test:run      # Vitest single run — must be 456/456 passing
npm run build         # tsc -b && vite build — must succeed
```

Expected green output:
- `lint` → no errors/warnings (a `baseline-browser-mapping` info line is harmless).
- `test:run` → `Test Files 43 passed · Tests 456 passed`.
- `build` → `✓ built` (the chunk-size warning + empty `vendor-react` chunk are pre-existing, ignore).

One-liner (bash):
```bash
npm run lint && npm run test:run && npm run build
```

---

## 🎨 Design system (UI work — see DESIGN.md)

```bash
npm run lint:design   # Design guard — lists every <12px text on content (the readability worklist)
```
- **Non-gating** in Phase 1: it is NOT part of `npm run lint` yet, so it WILL report findings
  (currently **79**). That's its job — it's the Phase-2 input. (Phase 2 promotes it into the gated `lint`.)
- **Design Probe** (not a CLI — in-app dev tool): `npm run dev`, then press **Alt+L** (or click the
  "Probe" button, bottom-left) → hover/click any element to read its *text · file:line · font-size/
  line-height/weight · classes · DESIGN.md role · ⚠ if <12px*, and copy a paste-ready block.

---

## 💻 Develop

```bash
npm run dev           # Vite dev server on http://localhost:3000 (opens browser; dev-only DevInspector active)
npm run preview       # Serve the production build locally (after `npm run build`)
```

---

## 🧪 Test

```bash
npm run test          # Vitest watch mode (interactive, during development)
npm run test:run      # Vitest single run (CI / verification)
npm run test:ui       # Vitest browser UI
npm run test:coverage # Vitest single run + coverage report
npm run test:e2e      # Playwright E2E (Chrome, Firefox, Safari, iOS)  [alias: npx playwright test]
npm run test:mutation # Stryker mutation testing (slow; quality audit)
```

Run a single file:
```bash
npx vitest run src/path/to/file.test.ts      # one unit test file
npx playwright test tests/specific.spec.ts   # one E2E spec
```

---

## 🎯 Quality & formatting

```bash
npm run lint          # ESLint, zero-warnings gate (eslint.config.js)
npm run lint:design   # Design-system guard (eslint.design.config.mjs) — see above
npm run format        # Prettier — format all files
```

> `prepare` (husky) is an npm lifecycle script, not run by hand. The pre-commit hook auto-runs
> `eslint --fix` + `prettier` on staged `.ts/.tsx` and `prettier` on staged `.json/.md` (lint-staged).

---

## 📌 Notes

- **Git / PRs are user-driven** — Claude does not commit/push unless asked (see memory `feedback-workflow-no-cli`).
- Config files (`vite.config.ts` / `vitest.config.ts`) are the source of truth; `tsc -b` emits to
  `node_modules/.tmp/config` so it never drops `.js`/`.d.ts` into the project root (HANDOFF §7).
