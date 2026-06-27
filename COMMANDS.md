# COMMANDS.md — project command reference

Every command needed to work on **Marnthara Smart Quotation**, grouped by purpose, with the expected
"green" result. Source of truth = `package.json` `scripts`. Node + npm; Windows/PowerShell or bash both work.

> Section markers follow the emoji legend in **[DESIGN.md §4.1](./DESIGN.md)** (✅ gate · 🎨 design · 💻 dev · 🧪 test · 🎯 quality · 📌 notes).

---

## ✅ Verification gate (run before handing off any change)

These are the three that must pass. Per HANDOFF §7, running them is **expected** (don't skip).

```bash
npm run lint          # ESLint — must be 0 warnings (hard gate)
npm run test:run      # Vitest single run — all tests pass, 0 failures
npm run build         # tsc -b && vite build — must succeed
```

Expected green output:
- `lint` → no errors/warnings (a `baseline-browser-mapping` info line is harmless).
- `test:run` → all test files pass · **0 failures** (counts grow as tests are added — match the latest run; don't hardcode a number).
- `build` → `✓ built` (the chunk-size warning + empty `vendor-react` chunk are pre-existing, ignore).

One-liner (bash):
```bash
npm run lint && npm run test:run && npm run build
```

---

## 🎨 Design system (UI work — see DESIGN.md)

- **Typography guard is GATED** — the `<12px` content ban (DESIGN.md §1/§2) lives in `eslint.config.js`
  as a `no-restricted-syntax` rule at `error`, so **`npm run lint`** blocks any `text-[9/10/11px]` on
  content. Print medium (`src/components/print/**`) is exempt. (The Phase-1 `lint:design` /
  `eslint.design.config.mjs` were retired — see DESIGN.md §6.)
- **Design Probe** (not a CLI — in-app dev tool): `npm run dev`, then press **Alt+L** (or click the
  "Probe" button, bottom-left) → hover/click any element to read its *text · file:line · font-size/
  line-height/weight · classes · DESIGN.md role · ⚠ if <12px*, and copy a paste-ready block.

---

## 💻 Develop

```bash
npm run dev           # Vite dev server on http://localhost:3000 (opens browser; dev-only DevInspector active)
npm run preview       # Serve the production build locally (after `npm run build`)
```

### 📱 ทดสอบจอมือถือบน Brave (ไม่ต้อง F12)

`useIsMobile` ตัดสินจากความกว้าง viewport (<768px) อย่างเดียว → หน้าต่างแคบ = โหมดมือถือแท้ 100%.

**ทางหลัก (1 คลิก):** `npm run dev` → กดปุ่ม **"จอมือถือ"** (DevInspector, มุมล่างซ้าย) →
เปิด popup หน้าต่างจริงขนาด iPhone 13 (390×844) — แอปในนั้นเข้าโหมดมือถือแท้. ปุ่ม **"Notch"** = จำลองระยะ
safe-area iPhone (บน 59px / ล่าง 34px) — *เว้นระยะอย่างเดียว ไม่บีบจอ* ใช้คู่กับปุ่มจอมือถือ.

**ทางเลือก (หน้าต่างไร้ chrome / ทำ Desktop shortcut):** Brave app window:

```
"C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe" --app=http://localhost:3000 --window-size=390,872
```

- **Swipe/gesture:** เมาส์ไม่สร้าง touch event — ทดสอบ swipe ผ่าน DevTools Device Toolbar
  (**Ctrl+Shift+M**, จำลอง touch จากเมาส์ได้) เป็นครั้งคราว
- **Safe-area:** Chromium ให้ `env(safe-area-inset-*)` = 0 เสมอ → กดปุ่ม **"Notch"** (DevInspector,
  มุมล่างซ้าย ข้างปุ่ม Probe) เพื่อจำลองระยะ iPhone จริง (บน 59px / ล่าง 34px + home indicator)
- **เครื่องจริงเป็นระยะ:** `npm run dev -- --host` → เปิด `http://<IP เครื่อง>:3000` จากมือถือใน LAN
  (touch จริง + safe-area จริง)

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
npm run lint          # ESLint, zero-warnings gate (eslint.config.js) — includes the <12px design guard
npm run format        # Prettier — format all files
```

> `prepare` (husky) is an npm lifecycle script, not run by hand. The pre-commit hook auto-runs
> `eslint --fix` + `prettier` on staged `.ts/.tsx` and `prettier` on staged `.json/.md` (lint-staged).

---

## 📌 Notes

- **Git / PRs are user-driven** — Claude does not commit/push unless asked (see memory `feedback-workflow-no-cli`).
- Config files (`vite.config.ts` / `vitest.config.ts`) are the source of truth; `tsc -b` emits to
  `node_modules/.tmp/config` so it never drops `.js`/`.d.ts` into the project root (HANDOFF §7).
