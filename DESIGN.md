# DESIGN.md — Marnthara design system & requirements

> **This document is the designer.** There is no human UI designer on this project, so this file
> *decides* look-and-feel and is the **source of truth** for every UI decision. When code and this doc
> disagree, the doc wins (or the doc is changed deliberately, in a PR, with reasoning).
>
> Foundation it builds on (read once, then defer here): **[HANDOFF.md §1.6](./HANDOFF.md)** (Apple HIG +
> NN/g ergonomics). This file is the *applied, enforceable* layer on top — and the **sole owner** of the
> visual language (typography · colour · spacing · elevation · radii · icons); §2 supersedes any older framing.

---

## 0. 🎯 Philosophy

- **Mobile / on-site first.** The primary user is a technician measuring windows on a phone, then an
  office user quoting on desktop. Design and verify at **360–390px first**.
- **High-contrast · colour-coded · clearly separated — the readability law.** The owner has **ageing eyes
  and works outdoors on a small screen**, so **clarity beats soft/minimal**: surfaces separate by a clear
  lightness gap + visible borders (never near-white flatness), text clears WCAG **AA→AAA**, and
  meaning-bearing data is **vividly colour-coded** (§2 · §5). When "calm & soft" fights "readable", readable wins.
- **Legible & premium, never cramped.** Readability and a confident, uncluttered feel beat information density.
  If a screen feels busy or the text feels small, it is **wrong** — fix it. *(Efficiency ≠ cramping: ตัด vertical
  **waste** — ซ้อนบรรทัดซ้ำ / padding ซ้อน — เพื่อใส่ข้อมูลต่อจอมากขึ้นได้ แต่ห้ามแลก legibility / touch /
  separation; ดู §3 **Vertical economy**.)*
- **Chunk it — Miller's Law.** Working memory holds only about **7±2** items at once — and for an owner with
  **ageing eyes working outdoors under time pressure, assume fewer**. So **group related controls into
  labelled chunks of ≈5 (never more than ~7) peers**, never a flat wall of options: a menu, a form section,
  a list of specs must read as *a few named groups*, not one long undifferentiated scan. The **main menu is
  the reference impl** — 4 labelled sections (งาน & ลูกค้า · ส่งให้ลูกค้า · ราคา & เงิน · ระบบ & ร้าน) of ≤4 items each, **one row per item**,
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
| **Numeric** / ตัวเลข | mono, **14–16px** | `font-mono tabular-nums` | card/list/overview data (`Metric`) = **14px**; summary / document totals (`ItemSummaryCard` · `DiscountModal` · margin %) = **16px + tone plate**. Plate/colour is the real emphasis — size adds at most one coarse 14→16 step |

**Hard rules**
- ❌ No `text-[9px] / text-[10px] / text-[11px]` (or any < 12px) on content. (Enforced — §6.)
- ❌ **No `text-xl` / `text-2xl` / … (or any > 18px) on-screen — 18px is the cap.** (Enforced — §6.)
  Importance = **tone colour + tinted plate (bg/border) + weight** (e.g. `Metric size="lg"`'s plate,
  `ItemSummaryCard` total), never a bigger font. **The numeric/data layer is 14–16px** — dense card/list
  numbers (`Metric`) at **14px**, summary / document totals at **16px + plate**; only *text headings*
  (Display role) use the 18px ceiling. Plate/colour carries importance; size is at most one coarse step.
  **The 14/16 numeric split is intentional — don't "unify" it.**
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
  Only true **reading content** — containers, body prose, and **item body text (labels/desc)** — stays
  `text-foreground` / `text-muted-foreground` for legibility. **Nav/menus are colour-coded too:** functional
  **icon tiles + section-header labels** carry their group/category hue (tinted tile `bg-tone-500/10` + accent
  text + `eeert:` deeper — see `MENU_GROUP_TONE` in [`dataTones.ts`](./src/config/dataTones.ts)). **Do not grey
  out nav icons** — the old "nav stays neutral" wording was the bug that kept menus monochrome. Hue still
  always *carries meaning*, never decorates; one hue = one meaning.
  *(Rollout is **EEERT-first** during the pilot via the `eeert:` overlays in
  [`dataTones.ts`](./src/config/dataTones.ts) `NUM_TONE_EEERT`; graduate by promoting them to the base tones.)*
  *(**Dark Vivid** = EEERT's **dark sibling** ("deep indigo studio"). It runs as `class="dark dark-vivid"` —
  the `.dark` base makes every `dark:` data tone fire unchanged, while `.dark-vivid` overlays only the chrome
  (deep-indigo page/cards, vivid cobalt CTA). It shares EEERT's colourful pill/plate treatment via
  `isColorfulTheme()` in [`useThemeStore.ts`](./src/store/standalone/useThemeStore.ts), so it needs **no** new tone-table
  entries — the bright `dark:` tones are already AAA-correct on the dark canvas.)*
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

#### Number-contrast contract — กัน "สีกลืน" ด้วย plate (Round 5)

แต่ละโทนมี 2 การแสดงผลที่ปลอดภัย: **`text`** (เฉดเข้ม ≥ AAA สำหรับวางโล่งบนการ์ด) + **`plate`** (pill
`bg-tone-500/10` คู่กับ text `-700/-800`). แบ่งโทนเป็น 2 ชั้น เพื่อไม่ให้กลายเป็น "พิลล์เต็มจอ":

- **Self-safe** (เข้มพอ อ่านโล่งได้) — เงิน · ทุน · มิติ · นับ: ใส่ plate **เฉพาะตอนเป็น hero** ของ surface.
- **Plate-required** (โทนกลาง กลืนถ้าโล่ง) — **วัสดุทุกชนิด** (violet/orange/teal/sky) **+ amber**: **ใส่ plate เสมอ**
  (`MATERIAL_PILL`/`DATA_TONE_PILL` + text `-700/-800`). mirror: `PLATE_REQUIRED_MATERIALS` ใน
  [`dataTones.ts`](./src/config/dataTones.ts).
- **กฎสากล:** ตัวเลข "สี" บนพื้นมีสี/ tint ใดๆ → **ใส่ plate เสมอ** (ห้ามสีทับ tint แบบโล่ง).

plate กันกลืนได้เพราะ (1) text เข้มผ่าน AAA + (2) กล่อง tint ให้ตัวเลขมี "พื้นของตัวเอง" แยกจากของข้างเคียง —
*ตัว `bg-500/10` อย่างเดียวไม่ได้เพิ่ม contrast ของ text มากนัก, ตัวเข้มของ text ต่างหากที่ทำให้ผ่าน.*

#### plate บนพื้นสี — soft pill vs contrast-plate (Round 6, 2026-06-20)

> **พอมีธีมพื้นสี (Colorful EEERT — page/card/accent เป็น cobalt) "plate" ของ Round 5 ไม่พอ:** พิลล์โปร่ง
> `bg-tone-500/10` **โปร่งแสง → ดูดสีพื้นใต้มัน** — ถ้า hue ของเลข ≈ hue ของพื้น (เช่น เลขมิติ blue บนการ์ด
> cobalt) พิลล์จะ **กลืนพื้น เน้นไม่ขึ้น**. แยก plate เป็น 2 สไตล์ เลือกตามพื้น:

| สไตล์ | คลาส | ใช้บนพื้น |
|---|---|---|
| **soft pill** | `bg-tone-500/10` (ไร้ขอบ) — `DATA_TONE_PILL`/`MATERIAL_PILL` | **การ์ดขาวเท่านั้น** (อาศัย tint ตัดกับพื้นขาว) |
| **contrast plate** | **`bg-tone-50` + `border-tone-200` + text `-700/-800`** (`eeert:` ลึกขึ้น) — `DATA_TONE_PLATE`/`MATERIAL_PLATE` | **พื้นสี/tint ทุกชนิด** (EEERT · การ์ด/หัวข้อที่ลงสี) |

- **กฎ:** บนพื้นที่ลงสี — โดยเฉพาะเมื่อ **hue เลข ≈ hue พื้น** — ค่า hero/วัสดุ **ใช้ contrast plate เสมอ ห้าม soft pill**.
  การแยกตัวมาจาก **ขอบ + bg `-50` ทึบ (รีเซ็ตสีพื้น) + text เข้ม AAA** ไม่ใช่จาก tint บาง ๆ.
- ชั้น *self-safe vs plate-required* (Round 5) ยังใช้ต่อ — Round 6 แค่กำหนดว่า "บนพื้นสีให้ใช้ตัวมีขอบ".
- mirror: `MATERIAL_PLATE` ใน [`dataTones.ts`](./src/config/dataTones.ts) (คู่กับ `DATA_TONE_PLATE`).

---

## 3. 📱 Spacing, radii & touch

- **Touch targets ≥ 44×44** (HIG). Reuse `Button` (`size="icon"`/`"md"` = 48px) or `h-11 w-11` + centered icon.
- **Control size by mode** via `useTierSize().control` (หน้างาน/field = lg/56px · ละเอียด/detail = md/48px) — never hardcode per-mode heights. *(2026-06-10: แกนโหมดเปลี่ยนจากอุปกรณ์ Lite/Full → งาน field/detail — ดู HANDOFF §10)*
- **Radii:** controls `rounded-lg`/`rounded-xl`; cards/containers `rounded-xl`. Avoid `rounded-2xl`+ on controls.
  **Exception (2026-06-10):** modal/dialog **footer action buttons** (e.g. `ItemModal` บันทึก / บันทึก & เพิ่ม)
  use **`rounded-full` capsules** — a deliberate standard footer-CTA look; keep `size="md"` (≥44px) + right-aligned, not full-width.
  *(**EEERT** (radii updated 2026-06-29): EEERT now uses **Signature's radius scale** —
  `rounded-lg`→**12px** controls, `rounded-xl`→**16px** cards/modal — so the **Squircle** corner redesign reads
  smoothly rounded, not faceted (the old 4px/6px "engineered" scale was retired — a superellipse barely curves
  at that size). EEERT's "คมชัด" identity now lives in its **hardened cobalt borders** + **opaque de-frosted
  chrome** (header/dock/modal header drop their `backdrop-blur` via `eeert:` overrides), not in tight corners.
  `rounded-full` capsules stay round. All scoped to `.eeert`/`eeert:` — other themes unchanged.)*
- **Density by mode:** `useTierSize().section` (หน้างาน roomier, ละเอียด denser). Don't let cards feel cramped on mobile.
- **Vertical economy — fit more per screen by cutting *waste*, not legibility.** เป้าหมาย: ข้อมูลใช้งานต่อ
  viewport มากขึ้น (โดยเฉพาะ**โหมดละเอียด**). ตัด **vertical waste** — ยุบ label+value ที่ซ้อนแนวตั้งให้เป็น
  **baseline row เดียว** (eyebrow + ค่า อินไลน์) · เลิก padding/gap ซ้ำซ้อน · ลด section gap ในโหมดละเอียด
  (`useTierSize().section`). **เพดานที่ห้ามแลกกับ density (hard floors):** Body ≥ 14px (§1) · Thai
  `line-height ≥ 1.5` (§1) · touch ≥ 44×44 (above) · surface separation + borders (§2) · §0 "never cramped".
  **ลดความสูงด้วย *layout* (row เดียว · wrapper น้อยลง · gap ตามโหมด) — ไม่ใช่ด้วยการย่อฟอนต์/ย่อ touch/บีบ
  Thai leading.** field/หน้างาน คง **roomier** (สายตาสูงวัย ทำงานกลางแดด); density เป็น lever ของ
  **โหมดละเอียด** เท่านั้น. วัด delta ด้วย Probe (§6) — ตัวอย่าง #1: MainMenu โปรไฟล์ร้าน `flex-col`
  (2 บรรทัด) → `flex items-baseline gap-2` (บรรทัดเดียว).
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
   (`src/components/print/**`) is exempt from both.
4. **Per-screen checklist before merge:** Body ≥ 14px · Meta(12px) only on dates/counts/units · no < 12px
   content · **no > 18px (cap — emphasis via colour/plate, not size)** · content = `text-foreground`
   (muted only ≥ 14px, secondary) · 44px taps · numbers `font-mono` ·
   icons stroke 1.5 · borders + soft elevation (cards clearly separate from the page) · vivid colour-coded
   data **ตามทะเบียน §2.1 (hue ตรงความหมาย — ห้ามตั้ง hue ใหม่เอง)** · `primary` only on CTA/selected ·
   **peers grouped into ≤ ~7 labelled chunks (Miller's Law, §0)** · product forms follow the §8 anatomy ·
   **vertical waste trimmed** (no redundant stacked labels / double padding — §3) **without dropping the §1/§3
   floors** (14px · Thai 1.5 · 44px) · verified at 360–390px.
5. **บันทึกศัพท์ใหม่ (กติกาบังคับ)** — เจอ **คำศัพท์ UX/UI ที่สำคัญ/น่าสนใจ** ระหว่างงาน (เทคนิค layout · การวัด ·
   พฤติกรรม CSS · design pattern · เครื่องมือ) ที่ยังไม่มีในคู่มือ → **เพิ่มลง
   [`docs/UX-GLOSSARY.md`](./docs/UX-GLOSSARY.md) ทันที** พร้อม (1) ความหมาย (2) ส่วนที่ใช้ในแอพ (`file:line`)
   (3) ลิงก์ owner ถ้าเป็นค่าของ DESIGN/CONTEXT. เอกสารนั้น = คู่มือศัพท์พัฒนาแอพที่ต้องโตต่อเนื่อง
   (truncate · natural width · flex/min-w-0 · slack …). *ต่างจาก CONTEXT.md ที่เป็นศัพท์โดเมน/ธุรกิจ.*

---

## 8. 🏗️ Form anatomy — โครงฟอร์มสินค้ามาตรฐาน

ฟอร์มสินค้าทุกชนิดเรียง section เหมือนกัน ผู้ใช้เปิดฟอร์มไหนก็เจอของที่เดิม (Miller's chunking, §0):

> **① ขนาด → ② รหัส & ราคา → ③ ขั้นสูง (AdvancedSection) → ④ หมายเหตุ → ⑤ สรุป (ItemSummaryCard)**

| Section | มาตรฐาน |
|---|---|
| **① ขนาด** | ป้าย **"ขนาดพื้นที่ (ม.)"** · ไอคอน **`Ruler`** · สีไอคอน + ตัวเลข = dimension blue (§2.1) · ช่องกรอกใช้ `Input[isDimension]` (สไตล์ฝังใน primitive แล้ว — ห้ามแปะสีเอง) |
| **② รหัส & ราคา** | ป้าย **"รหัส & ราคา"** (ไม่มีรหัส เช่น ฉากกั้นแบบจีบ → "สเปค & ราคา") · ไอคอนต่อชนิดได้ แต่สี = `getItemTheme(type).icon` (brand identity) · ตัวเลือกรุ่น/variant (segmented · `segmentedItemClass`) อยู่**ท้าย section คั่น `border-t`** · ช่อง **"รหัส"** ใช้ **`CodePickerField`** (bottom-sheet ค้นหาข้ามรหัส/แบรนด์/รุ่น/สี + จัดกลุ่ม ใช้ในงานนี้/ในเครื่อง/คลัง — ไม่ใช่ dropdown ดิบ; scale กับรหัสจำนวนมาก) · ช่องเงิน/ราคาใช้ **`Input[isMoney]`** (ดูกฎ alignment ด้านล่าง) |
| **③ ขั้นสูง** | สเปคติดตั้ง/ทิศเปิดที่ใส่ทีหลังได้ → **`AdvancedSection`** เสมอ (ห้ามทำ toggle เอง) · hint บอกว่ามีอะไรข้างใน + "ใส่ทีหลังได้" |
| **④ หมายเหตุ** | `Input` เปล่า (`bg-muted/50 border-transparent`) ไม่ครอบการ์ด |
| **⑤ สรุป** | **`ItemSummaryCard`** เสมอ (**8/8 ฟอร์มแล้ว** — Phase C 2026-06-12) — มี breakdown row อย่างน้อย 1 แถว (พื้นที่/ม้วน/หลา/จุด) ไม่ใช่ยอดลอย ๆ · ราคาตั้งเอง = แถว switch + คำอธิบายในการ์ด · cost analysis = `proSlot` (ทุนถังเดียว = `CostReadout` 2 บรรทัดโชว์เสมอ; ม่านทุนหลายถัง = `CurtainCostAnalysis` breakdown + toggle — **proSlot ต่างได้ตามความซับซ้อนทุนของสินค้า แต่ห้ามต่างที่ความหมาย/สี**) · **plate ยอดสุทธิไล่สีตามสถานะ: กำหนดราคาเอง → amber+Lock · ขาดทุน(รู้ทุน) → rose · ปกติ → เขียว** — สื่อที่มาของตัวเลขด้วยสี ไม่ใช่ขนาด |

- Section wrapper = **`FormSection`** เท่านั้น (single source ของ chrome + density) — ห้าม `<div className="bg-card …">` เอง.
- **การจัดชิดช่องกรอก (alignment):** ป้าย + ช่องข้อความ/รหัส/หมายเหตุ = **ชิดซ้าย** (ค่าดีฟอลต์ของ `Input`) ·
  ช่องเงิน/ราคา/ยอด = **`Input[isMoney]`** → **ชิดขวา + `font-mono tabular-nums`** (หลักเลข + หน่วย `฿` เรียงตรงกัน,
  §5 · เข้าชุดกับยอดสุทธิใน `ItemSummaryCard`) · ช่องมิติ = **`Input[isDimension]`** (ชิดซ้าย, ตัวหนาโทน dimension).
  สไตล์ทั้งหมดฝังใน primitive (`MONEY_INPUT_CLASS`/`DIMENSION_INPUT_CLASS`) — **caller ห้ามแปะ `text-right`/`font-mono` เอง**.
- ข้อยกเว้นที่รู้ตัว: **ผ้าม่าน** มี section "รูปแบบม่าน & การเก็บ" แทรกระหว่าง ① กับผ้า (style กำหนด field ที่เหลือ — จงใจ).
  *(ข้อยกเว้น summary เดิม — `PriceSummary` เฉพาะม่าน — ถูกลบใน Phase C 2026-06-12: ดีไซน์ที่ดีของมัน
  (state-plate + override row มีคำอธิบาย) ถูกยกขึ้น `ItemSummaryCard` ให้ทุกฟอร์ม ส่วน pro-mode ของม่านย้ายไป `CurtainCostAnalysis` ใน proSlot.)*
