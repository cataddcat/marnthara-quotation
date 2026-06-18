# DESIGN.md — Marnthara design system & requirements

> **This document is the designer.** There is no human UI designer on this project, so this file
> *decides* look-and-feel and is the **source of truth** for every UI decision. When code and this doc
> disagree, the doc wins (or the doc is changed deliberately, in a PR, with reasoning).
>
> Foundations it builds on (read once, then defer here): **[HANDOFF.md §1.6](./HANDOFF.md)** (Apple HIG +
> NN/g ergonomics) and **§1.7** (Geist-aligned visual language). This file is the *applied, enforceable*
> layer on top of them.
>
> **📱 Mobile audit worklog:** the ongoing iPhone-13 (390×844) density · safe-area · touch · token pass —
> with its **done/remaining status** — lives in **[docs/MOBILE-UX-AUDIT.md](./docs/MOBILE-UX-AUDIT.md)**.
> Read it (with this file) when continuing mobile UX work.

---

## 0. 🎯 Philosophy

- **Mobile / on-site first.** The primary user is a technician measuring windows on a phone, then an
  office user quoting on desktop. Design and verify at **360–390px first**.
- **High-contrast · colour-coded · clearly separated — the readability law.** The owner has **ageing eyes
  and works outdoors on a small screen**, so **clarity beats soft/minimal**: surfaces separate by a clear
  lightness gap + visible borders (never near-white flatness), text clears WCAG **AA→AAA**, and
  meaning-bearing data is **vividly colour-coded** (§2 · §5). When "calm & soft" fights "readable", readable wins.
- **Legible & premium, never cramped.** Readability and a confident, uncluttered feel beat information density.
  If a screen feels busy or the text feels small, it is **wrong** — fix it.
- **Chunk it — Miller's Law.** Working memory holds only about **7±2** items at once — and for an owner with
  **ageing eyes working outdoors under time pressure, assume fewer**. So **group related controls into
  labelled chunks of ≈5 (never more than ~7) peers**, never a flat wall of options: a menu, a form section,
  a list of specs must read as *a few named groups*, not one long undifferentiated scan. The **main menu is
  the reference impl** — 3 labelled sections (นำเสนอ & ขาย · สินค้า & การเงิน · จัดการระบบ) of ≤4 items each,
  not 11 buttons in a row ([`MainMenuModal.tsx`](./src/components/modals/MainMenuModal.tsx)). More than ~7
  peers in one group → **split, nest, or progressively disclose** (e.g. an "ขั้นสูง" `AdvancedSection`). This
  is the *low-cognitive-load* pillar made measurable.
- **Measure, don't guess.** Never adjust by vibe ("make that smaller"). Use the **Design Probe** (§6) to
  read an element's *what / where / exact size* first, then change the exact line. "Bigger" is not
  automatically "better" — but the UI must never be hard to read.
- **The doc decides.** New/changed UI must satisfy this spec before merge (§6 checklist).

---

## 1. 📐 Typography — the core standard (STRICT)

The #1 readability rule. Primary content (**Body**) is **14–16px**, no compromise. **`12px` is heavily
restricted — Meta only** (dates, counts, units, micro-labels). **Anything below 12px is banned** for any
human-readable content. **The scale is capped at 18px** (2026-06-11): nothing on-screen renders larger —
**hierarchy comes from colour / background tint / border / weight, never from size** (§2's colourful-data
layer is the emphasis tool; see the `Metric` hero *plate*).

| Role | Size | Class | Use |
|---|---|---|---|
| **Display** / หัวใหญ่ | **18px — the cap** | `text-lg font-bold` | text headings only (form/section/room name); weight carries it, never a plate |
| **Title** / ชื่อ | 16px | `text-base font-semibold` | card / room / item titles |
| **Body** / เนื้อหา | **16px** (dense: **14px floor**) | `text-base` / `text-sm` | primary reading text — **never < 14px** |
| **Label** / รอง | 14px | `text-sm` | secondary labels, specs |
| **Meta** / ป้ายเล็ก | **12px — META ONLY** | `text-xs` | dates / counts / units only |
| **Numeric** / ตัวเลข | mono, **14–16px** | `font-mono tabular-nums` | card/list/overview data (`Metric`) = **14px**; summary / document totals (`ItemSummaryCard` · `PriceSummary` · `DiscountModal` · margin %) = **16px + tone plate**. Plate/colour is the real emphasis — size adds at most one coarse 14→16 step |

**Hard rules**
- ❌ No `text-[9px] / text-[10px] / text-[11px]` (or any < 12px) on content. (Enforced — §6.)
- ❌ **No `text-xl` / `text-2xl` / … (or any > 18px) on-screen — 18px is the cap.** (Enforced — §6.)
  Importance = **tone colour + tinted plate (bg/border) + weight** (e.g. `Metric size="lg"`'s plate,
  `ItemSummaryCard` total), never a bigger font. **The numeric/data layer is 14–16px** — dense card/list
  numbers (`Metric`) at **14px**, summary / document totals at **16px + plate**; only *text headings*
  (Display role) use the 18px ceiling. Plate/colour carries importance; size is at most one coarse step.
- ❌ No `12px` for Body/primary content — `12px` is for Meta only.
- ✅ Thai needs air: body `line-height ≥ 1.5` (`leading-normal`+); **never** `leading-none` / `leading-tight`
  on multi-line Thai. Negative tracking (`tracking-tight`) is for **Latin headings / numbers only**, never Thai body.
- *Exempt:* `src/components/print/**` (print medium has its own sizing — both bounds).

Machine-readable mirror: [`src/config/typography.ts`](./src/config/typography.ts) (`TYPOGRAPHY`,
`CONTENT_MIN_PX = 12`, `BODY_MIN_PX = 14`, `CONTENT_MAX_PX = 18`, `classifySizePx`). The `Text` primitive
and the Probe both read it.

---

## 2. 🎨 Color & contrast

> **Evolved 2026-06-18 — "every number is colour-coded by type · high contrast".** This is a field tool for
> **ageing eyes used outdoors**, so the palette is deliberately **vivid + high-contrast + clearly
> separated** — *not* soft/minimal/near-white. (Supersedes the earlier "monochrome-first" *and* the
> "monochrome chrome" framings — the latter is **retired**: numbers no longer sit grey by default.)

- **Colour-code EVERY number by its type.** Each kind of number carries its **category tone** so the eye
  recognizes meaning at a glance — money = **emerald**, cost = **rose**, dimension = **blue** (a true blue,
  *never* cyan/sky), material hues (violet/orange/teal/sky/fuchsia), **count/นับ = slate**, pending/ค้าง =
  **amber**, % follows its subject (full table → §2.1). The old "keep counts/%/refs grey" rule is **gone**.
  Only true **chrome** — containers, nav, section labels, body prose — stays `text-foreground` /
  `text-muted-foreground`. Hue still always *carries meaning*, never decorates; one hue = one meaning.
  *(Rollout is **EEERT-first** during the pilot via the `eeert:` overlays in
  [`dataTones.ts`](./src/config/dataTones.ts) `NUM_TONE_EEERT`; graduate by promoting them to the base tones.)*
- **Contrast: WCAG AA minimum, AAA where practical.** Surfaces must separate by a clear **lightness gap**
  (grey page · white cards) **+ visible borders** — never near-white-on-white flatness.
- **`primary` = CTA only.** `bg-primary text-primary-foreground` fills are for the real CTA / selected
  states only; status / brand / traffic-light colours are the sanctioned data colours above.
- **Content text uses `text-foreground`** (`text-muted-foreground` only for secondary text at ≥ 14px).
- **Borders + soft elevation** (§1.7, evolved 2026-06-07 — was "borders over shadows"): define every
  surface with `border-border` + a bg shift, **and add soft, slate-tinted elevation to lift interactive
  surfaces and guide the eye.** Use it **differentially** so hierarchy stays legible: ghost = flat →
  secondary/outline = `shadow-xs` + visible border → buttons/cards = `shadow-sm` → primary CTA / popovers
  = `shadow-md`. Tuned scale (`--shadow-xs…lg`) lives in [`index.css`](./src/index.css) `@theme`. Keep it
  subtle; dark mode leans on borders (soft shadows read weakly on OLED).

### 2.1 📐 ทะเบียนสีความหมาย — semantic colour registry (one hue = one meaning)

**หนึ่งสีมีเจ้าของเดียวทั้งแอพ** — ผู้ใช้เห็นสีแล้วรู้ความหมายทันทีโดยไม่ต้องอ่าน. Machine-readable
mirror: [`src/config/dataTones.ts`](./src/config/dataTones.ts) (`DATA_TONE_TEXT` · `DATA_TONE_PLATE` ·
`DATA_TONE_PILL` · `MATERIAL_ACCENT` · `MATERIAL_PILL` · `MATERIAL_DOT` · `DIMENSION_INPUT_CLASS` ·
`NUM_TONE_EEERT` = EEERT-first overlays สำหรับเลขที่เคยเทา/นับ) — `Metric`, `Input[isDimension]`, vault
และทุก component อ่านจากไฟล์นี้ ห้าม hardcode hue ซ้ำเอง.

| ชั้น | ความหมาย | Hue (light / dark) | ใช้ที่ |
|---|---|---|---|
| **Data tone** | เงิน / ราคาขาย | `emerald-700` / `-400` | Metric · ItemSummaryCard · ยอดสรุปทุกที่ |
| | ทุน / รื้อถอน / ขาดทุน | `rose-600` / `-400` | CostReadout · FinancialDashboard · Removal |
| | มิติ / ขนาด / พื้นที่ | `blue-700` / `-400` — **true blue, ห้าม sky/cyan เด็ดขาด** | Metric · `Input[isDimension]` · แถวขนาดทุกที่ |
| | ค้างเก็บ / รอเก็บ (pending) | `amber-600` / `-400` — = status-amber (เงินที่ยังไม่เก็บ) | FinancialDashboard · MoneyTab |
| **Material** | ผ้าทึบ / ผ้าโปร่ง | `violet-500` / `violet-400` | FabricSection · ItemCard · MaterialSummary · คลังรหัส |
| | วอลเปเปอร์ (ม้วน) | `orange-500` | เดียวกัน — orange เป็นของวอลเปเปอร์ผู้เดียว |
| | วัสดุพื้นที่ (ตร.ม./ตร.ล.) | `teal-600` / `-400` | คลังรหัส · สรุปวัสดุ |
| | อุปกรณ์ / ราง | `sky-600` / `-400` — sky ถูกยกให้ hardware ผู้เดียว (ห้ามใช้กับมิติ) | คลังรหัส · แท็บราง/อุปกรณ์ใน MaterialSummary · ถังต้นทุนอุปกรณ์ |
| | ค่าแรง / บริการ (ถังต้นทุน) | `fuchsia-500` | CostStructureBar · CostRow ใน FinancialDashboard |
| **Count** | จำนวน / นับ | `slate-600` / `-300` (eeert `-800`) — โทน "นับจำนวน" เงียบแต่แยกออกจากเนื้อหา | N รายการ · จุด · ผนัง · ม้วน · เส้น · ชุด |
| **Ratio** | อัตราส่วน / % | **ตามหมวดที่มันอธิบาย** — margin%→กำไร(emerald/amber) · discount%→amber · มัดจำ%→money | FinancialDashboard · DiscountModal · CostReadout |
| **Identity** | ชนิดสินค้า (9 ชนิด) | `--brand-*` ([`index.css`](./src/index.css)) via `getItemTheme()` | หัว section ② ของฟอร์ม · ชิป ItemCard |
| | ห้อง | room-accents (stripe/avatar/tag — ไม่มี sky) | RoomCard · All-Rooms summary |
| **Status** | เตือน / ค้าง / ยังไม่ครบ | `amber` | ชิป "ยังไม่ใส่ผ้า" · validation warning |
| | สำเร็จ `emerald` · ผิดพลาด/ลบ `rose` · info `sky` (`Alert` เท่านั้น) | | toast · Alert |

กติกา: data tone ลงที่ **ตัวเลข/ค่า** ไม่ใช่ chrome (label/หัวข้อ = `text-foreground`/muted ยกเว้นป้ายหมวด
วัสดุที่ทำหน้าที่ระบุชั้นวัสดุ เช่น "ผ้าทึบ"). hue เดียวกันห้ามมีสองความหมายบน surface เดียวกัน.

---

## 3. 📱 Spacing, radii & touch

- **Touch targets ≥ 44×44** (HIG). Reuse `Button` (`size="icon"`/`"md"` = 48px) or `h-11 w-11` + centered icon.
- **Control size by mode** via `useTierSize().control` (หน้างาน/field = lg/56px · ละเอียด/detail = md/48px) — never hardcode per-mode heights. *(2026-06-10: แกนโหมดเปลี่ยนจากอุปกรณ์ Lite/Full → งาน field/detail — ดู HANDOFF §10)*
- **Radii:** controls `rounded-lg`/`rounded-xl`; cards/containers `rounded-xl`. Avoid `rounded-2xl`+ on controls.
  **Exception (2026-06-10):** modal/dialog **footer action buttons** (e.g. `ItemModal` ยกเลิก / บันทึก / ปิด)
  use **`rounded-full` capsules** — a deliberate standard footer-CTA look; keep `size="md"` (≥44px) + right-aligned, not full-width.
- **Density by mode:** `useTierSize().section` (หน้างาน roomier, ละเอียด denser). Don't let cards feel cramped on mobile.
- **Fixed-chrome offset (2026-06-11):** เนื้อหาใต้ fixed header ต้องเว้น `var(--content-top)`
  (= `--header-h` 3.5rem + `--safe-top` + `--chrome-gap` 12px — นิยามใน `index.css` §9.5). **ห้าม hardcode `3.5rem`**
  ใน TSX. Scroll-to-element ใช้ `scroll-padding-top` บน `html` (มีแล้ว — WCAG 2.4.11 *Focus Not Obscured*);
  **ห้าม**แปะ `scroll-mt-*` ซ้อนบน root scroller อีก — offset จะบวกซ้ำ (overscroll).

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
   font-size / line-height / weight · the `text-*`/`font-*` classes · the DESIGN.md role · ⚠ if < 12px or > 18px**,
   and **copies a paste-ready block**. Use it to give precise instructions ("this 11px → Label/14px"),
   never vague ones.
2. **Size text via the `Text` primitive** (`src/components/ui/Text.tsx`):
   `<Text variant="title|body|label|meta|display" numeric muted>` resolves to the scale above (floor baked
   in). Prefer it over ad-hoc `text-*` classes for new/changed content.
3. **Lint guard (gated)** — the `no-restricted-syntax` rules in [`eslint.config.js`](./eslint.config.js)
   block **both bounds**: every `< 12px` content size *and* every `> 18px` size (`text-xl`+ / arbitrary
   `text-[19px+]`); `npm run lint` (the 0-warning gate) fails on regressions. Print
   (`src/components/print/**`) is exempt from both. See §7.
4. **Per-screen checklist before merge:** Body ≥ 14px · Meta(12px) only on dates/counts/units · no < 12px
   content · **no > 18px (cap — emphasis via colour/plate, not size)** · content = `text-foreground`
   (muted only ≥ 14px, secondary) · 44px taps · numbers `font-mono` ·
   icons stroke 1.5 · borders + soft elevation (cards clearly separate from the page) · vivid colour-coded
   data **ตามทะเบียน §2.1 (hue ตรงความหมาย — ห้ามตั้ง hue ใหม่เอง)** · `primary` only on CTA/selected ·
   **peers grouped into ≤ ~7 labelled chunks (Miller's Law, §0)** · product forms follow the §8 anatomy ·
   verified at 360–390px.

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
- **18px cap added (2026-06-11)** — all 17 on-screen `> 18px` sites (`text-xl`×8 · `text-2xl`×5 ·
  `text-3xl`×3 + the Display token) were demoted. A second gated `no-restricted-syntax` regex blocks
  `text-xl`+ / `text-[19px+]`; `classifySizePx` flags `> 18.5px` as error so the Probe catches computed
  sizes too. Unit-tested in [`src/config/typography.test.ts`](./src/config/typography.test.ts).
- **Numeric layer settled at 14–16px (2026-06-11, probe pass)** — after the cap, a Probe sweep pulled
  numbers down and the owner fixed a deliberate two-step: **card / list / overview data (`Metric`,
  all sizes) = 14px**; **summary / document totals (`ItemSummaryCard` · `PriceSummary` · `RemovalForm` ·
  `DiscountModal` · `FinancialRing` & target margin %) = 16px + tone plate**. Emphasis is the
  tone-tinted plate + colour + weight; size only separates "everyday data" (14) from "the headline total"
  (16) by one coarse step. Only *text headings* (Display role) keep the 18px ceiling (`text-lg`,
  weight-only — no plate). This 14/16 split is **intentional — do not "unify" it.**
- **Exempt:** `src/components/print/**` (print medium has its own sizing — both bounds).

> Ongoing discipline: keep new/changed UI on the scale (§1) and **measure with the Probe** (§6) before
> adjusting — don't blanket-enlarge (the reverted "ภาพรวม" enlarge is the cautionary tale).

---

## 8. 🏗️ Form anatomy — โครงฟอร์มสินค้ามาตรฐาน

ฟอร์มสินค้าทุกชนิดเรียง section เหมือนกัน ผู้ใช้เปิดฟอร์มไหนก็เจอของที่เดิม (Miller's chunking, §0):

> **① ขนาด → ② รหัส & ราคา → ③ ขั้นสูง (AdvancedSection) → ④ หมายเหตุ → ⑤ สรุป (ItemSummaryCard)**

| Section | มาตรฐาน |
|---|---|
| **① ขนาด** | ป้าย **"ขนาดพื้นที่ (ม.)"** · ไอคอน **`Ruler`** · สีไอคอน + ตัวเลข = dimension blue (§2.1) · ช่องกรอกใช้ `Input[isDimension]` (สไตล์ฝังใน primitive แล้ว — ห้ามแปะสีเอง) |
| **② รหัส & ราคา** | ป้าย **"รหัส & ราคา"** (ไม่มีรหัส เช่น ฉากกั้นแบบจีบ → "สเปค & ราคา") · ไอคอนต่อชนิดได้ แต่สี = `getItemTheme(type).icon` (brand identity) · ตัวเลือกรุ่น/variant (segmented · `segmentedItemClass`) อยู่**ท้าย section คั่น `border-t`** |
| **③ ขั้นสูง** | สเปคติดตั้ง/ทิศเปิดที่ใส่ทีหลังได้ → **`AdvancedSection`** เสมอ (ห้ามทำ toggle เอง) · hint บอกว่ามีอะไรข้างใน + "ใส่ทีหลังได้" |
| **④ หมายเหตุ** | `Input` เปล่า (`bg-muted/50 border-transparent`) ไม่ครอบการ์ด |
| **⑤ สรุป** | **`ItemSummaryCard`** เสมอ (**8/8 ฟอร์มแล้ว** — Phase C 2026-06-12) — มี breakdown row อย่างน้อย 1 แถว (พื้นที่/ม้วน/หลา/จุด) ไม่ใช่ยอดลอย ๆ · ราคาตั้งเอง = แถว switch + คำอธิบายในการ์ด · cost analysis = `proSlot` (ทุนถังเดียว = `CostReadout` 2 บรรทัดโชว์เสมอ; ม่านทุนหลายถัง = `CurtainCostAnalysis` breakdown + toggle — **proSlot ต่างได้ตามความซับซ้อนทุนของสินค้า แต่ห้ามต่างที่ความหมาย/สี**) · **plate ยอดสุทธิไล่สีตามสถานะ: กำหนดราคาเอง → amber+Lock · ขาดทุน(รู้ทุน) → rose · ปกติ → เขียว** — สื่อที่มาของตัวเลขด้วยสี ไม่ใช่ขนาด |

- Section wrapper = **`FormSection`** เท่านั้น (single source ของ chrome + density) — ห้าม `<div className="bg-card …">` เอง.
- ข้อยกเว้นที่รู้ตัว: **ผ้าม่าน** มี section "รูปแบบม่าน & การเก็บ" แทรกระหว่าง ① กับผ้า (style กำหนด field ที่เหลือ — จงใจ).
  *(ข้อยกเว้น summary เดิม — `PriceSummary` เฉพาะม่าน — ถูกลบใน Phase C 2026-06-12: ดีไซน์ที่ดีของมัน
  (state-plate + override row มีคำอธิบาย) ถูกยกขึ้น `ItemSummaryCard` ให้ทุกฟอร์ม ส่วน pro-mode ของม่านย้ายไป `CurtainCostAnalysis` ใน proSlot.)*
