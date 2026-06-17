# 📱 Mobile UX/UI Audit — iPhone 13 (390×844)

> **เลนส์:** "ชัดเจน + ใช้ทุก pixel ให้คุ้ม" บนจอเล็ก (งบเนื้อหา ~600–700px หลังหัก chrome+safe-area)
> **สถานะ:** Stage 1 — รายงานเพื่อรีวิว (ยังไม่แตะโค้ด). เจ้าของติ๊กเลือกข้อที่จะทำ แล้วผมแก้ใน Stage 2.
> **วิธีตรวจ:** design-reviewer (ถัง 2–5, read-only) + ตรวจเอง (shell/primitives) เทียบ DESIGN.md §1–§8.

## วิธีอ่าน — ธงต่อข้อ
- 🔴 **ต้องแก้** — ผิด hard floor (text <12px/>18px, ทัช <44×44, overflow 390px, safe-area, โครงผิด)
- 🟢 **เก็บกวาด** — ลดที่เสียได้โดยคง body≥14px + ทัช≥44px (ปลอดภัย แนะนำทำ)
- 🟡 **เพิ่มแน่น** — ชั่งใจ density vs comfort (เจ้าของตัดสินรายข้อ)

> ⚠️ บางข้อมีโน้ต **[วัด Probe]** = ควรยืนยันด้วย DevInspector phone window 393×852 + notch sim ก่อนเคาะค่าสุดท้าย.

---

## 🎯 สรุปลำดับทำก่อน (Priority rollup)

**ทำก่อน (🔴 + 🟢 ผลกว้าง, แก้ครั้งเดียวคุ้ม):**
1. **#1 sweep `tracking-tight`/`leading-tight` บนข้อความไทย** — systemic, ~10+ จุด, กฎ §1
2. **#3 ทัช <44px ของปุ่มรอง** — systemic, ~7 จุด
3. **#4 ItemSummaryCard `p-5` → tier-adaptive** — primitive, กระทบ 8 ฟอร์ม
4. **#13 Toast ชน notch (`top-6`)** — feedback หลักโดนบังบนมือถือจริง
5. **#16 FinancialDashboard ขาด `appShell`** — โครง scroll/padding ซ้อน + กิน 32px

**ฝากเจ้าของตัดสิน (🟡 density):** #5, #11, #12, #19, #21, #22, #26, #27

---

## A. Systemic — แก้ครั้งเดียว ผลกว้างทั้งระบบ

### 1. 🔴 `tracking-tight` / `leading-tight` / `leading-none` บนข้อความ "ไทย"
DESIGN.md §1: negative tracking + leading แน่น = ของ Latin/ตัวเลขเท่านั้น; ไทยต้อง `leading-normal`+
(สระบน/ล่าง+วรรณยุกต์ชนกัน อ่านยากกลางแดด). พบกระจายหลายไฟล์ — ควร sweep รวดเดียว:

| file:line | คลาสที่ผิด | แก้เป็น |
|---|---|---|
| MainLayout.tsx:123 (ชื่อร้าน) | `font-bold tracking-tight` | ตัด `tracking-tight` |
| MainLayout.tsx:354 (label dock ไทย) | `text-[12px] font-semibold tracking-tight` | `text-xs font-semibold` |
| Toast.tsx:50 (title ไทย) | `leading-tight tracking-tight` | `leading-snug` |
| ItemCard.tsx:285 (ชิปไทย) | `text-xs leading-tight` | `text-xs leading-normal` |
| RoomCard.tsx:350 (ชื่อห้อง) | `text-lg font-bold leading-tight` | `…leading-normal` |
| EmptyState.tsx:44 (title ไทย) | `font-semibold tracking-tight` | ตัด `tracking-tight` |
| ItemSummaryCard.tsx:131 · CurtainCostAnalysis.tsx:36 · LayerSelector.tsx:69 (sub ไทย) | `leading-tight`/`leading-none` | ตัดออก (default) หรือ `leading-snug` |

> **ผ่าน (อย่าแก้):** `Metric.tsx:78` `tracking-tight leading-none` อยู่บน value ตัวเลขล้วน (`font-mono tabular-nums`) — §1 อนุญาต. `ItemCard.tsx:72-78` `leading-tight` บน label/รหัส 1 บรรทัด (mono) — ไม่ใช่ Thai body.
> **[วัด Probe]** ระดับการชนจริงขึ้นกับฟอนต์ (IBM Plex Sans Thai) — แต่กฎเขียนห้ามไว้ตรง ๆ จึงควรแก้ให้ตรงกฎ.

### 2. 🟢 สี `slate-*` ฮาร์ดโค้ด นอก `print/**` → ใช้ token (§2)
chrome ต้องเป็น token ไม่งั้น dark mode เพี้ยน + contrast ไม่คุม:
- PdfPreviewModal.tsx:90,135,88 — `bg-white`/`bg-slate-100`/`text-slate-*` → `bg-card`/`bg-background`/`text-foreground`/`text-muted-foreground`, `border-slate-200`→`border-border`
- ShopSettingsModal.tsx:210,214,248,252 — `text-slate-700`→`text-foreground`; `border-slate-200 focus:ring-slate-900`→`border-input focus:ring-ring`
- HardwareSection.tsx:86 — `text-slate-400`→`text-muted-foreground/70` (ให้ตรง OpeningStyleSelector ที่แก้แล้ว)

### 3. 🔴/🟢 ปุ่มรอง ทัช <44×44 (§3) — เพิ่ม hit area
| file:line | ปัจจุบัน | แก้เป็น | ธง |
|---|---|---|---|
| RemovalForm.tsx:134,143,150 (stepper −/+/ช่อง) | `w-10 h-10` (40) | `h-12` ให้เท่า Input md | 🔴 |
| CopySummaryModal.tsx:163 (toggle ย่อ/ละเอียด) | `px-3 py-1` (~26) | `px-3 min-h-[44px]` | 🔴 |
| MoneyTab.tsx:217 (toggle %/บาท) | `w-9 h-9` (36) | `w-11 h-11` | 🟢 |
| MoneyTab.tsx:190,392 (Trash) | `p-2` (32) | `p-2.5 min-w-[44px] min-h-[44px]` | 🟢 |
| FinancialDashboardModal.tsx:174 (ปุ่มตา) | `p-1.5` (28) | ย้ายเป็น `headerAction` ของ Modal (ปุ่ม icon 44) | 🟢 |
| JobsModal.tsx:241 (เมนูงาน→ลบ) | `p-2` (32) | `size="icon"` ของ Button (44) | 🟢 |

---

## B. App shell / chrome (MainLayout · dock · toast)

4. 🟢 **MainLayout.tsx:113** — header `px-6` (24px) บนมือถือ ขณะ content `main` ใช้ `px-4` (16px)
   → `px-4 sm:px-6` ให้ตรงกัน คืน 16px แนวนอน (ช่วยแคปซูลขวาเวลาชื่อร้านยาว). *เหตุผล:* ขอบหัวกว้างกว่าเนื้อหาโดยไม่ได้ประโยชน์.
5. 🟡 **MainLayout.tsx:115-147** — บล็อกซ้าย 2 บรรทัด (ชื่อร้าน + ชื่อลูกค้า) สูง ~56px เต็ม header. แน่นดีอยู่แล้ว; ถ้าอยากลดให้ย่อ chevron/จุด sync. *(comfort ปัจจุบันดี — ข้ามได้)*

> ✅ shell ผ่าน: safe-area ครบ (`pt-safe-top`/`h-safe-top`/`mb-safe-bottom`/`pb-[calc(5rem+var(--safe-bottom))]`); dock pill `h-11`=44px; capsule ขวา `h-11`; `overflow-x-clip` กันล้น. **ไม่พบ horizontal overflow** ([วัด Probe] ยืนยันแคปซูลขวาตอนชื่อร้านยาวสุด).

---

## C. มุมมองงานหลัก (RoomCard · ItemCard · list)

6. 🟢 **RoomCard.tsx:301** — header focus `p-5 pb-3` → `p-4 pb-3` (ตรงกับ ItemCard, คืน 8px แนวนอนให้ชื่อห้อง)
7. 🟢 **RoomCard.tsx:394** — stats footer `px-5 py-3` → `px-4 py-2.5` (ลดความสูงการ์ดหัว ~คืน vertical budget)
8. 🟢 **ItemCard.tsx:218** — collapsed `gap-3` → `gap-2.5` (3 แถว × ลด 2px; ห้อง 5-6 รายการ เห็นต่อจอมากขึ้น)
9. 🟢 **RoomCard.tsx:501** — Skeleton kebab `w-7 h-7` → `w-11 h-11` (ตรง footprint จริง กัน layout shift ตอนโหลด)
10. 🟢 **RoomCard.tsx:461** — ตัด `pb-1` ซ้ำซ้อน (`main space-y-4` แยกการ์ดแล้ว) — nitpick
11. 🟡 **RoomCard.tsx:369-382** — type pills ("ผ้าม่าน ×2…") ซ้ำข้อมูลกับ footer "N รายการ"; ตัด pills คืน ~28px แต่เสีย breakdown ชนิดเร็ว — เจ้าของชั่ง
12. 🟡 **ItemCard.tsx:233-238** — status pill อยู่แถวเดียวกับ index+title (truncate เร็วบนจอแคบ); ย้าย pill ลง meta แถวใต้ = title เต็มขึ้น แต่สูงขึ้น — เจ้าของชั่ง

---

## D. ฟอร์มสินค้า + primitives ร่วม

13. 🟢 **ItemSummaryCard.tsx:82 [PRIMITIVE — 8 ฟอร์ม]** — `p-5` คงที่ ไม่ tier-adaptive (FormSection ใช้ p-4/p-3.5)
    → `const { section } = useTierSize();` ใช้ `section.pad`+`section.stack`. คืน ~10-14px ในโหมดละเอียด + rhythm ตรงกัน
14. 🟢 **HardwareSection.tsx:96** — badge selected `bg-primary text-white` → `bg-foreground text-background` (§2: primary=CTA only; ให้ตรง OpeningStyleSelector:63)
15. 🟡 **CollapsibleSection.tsx:54-55 [PRIMITIVE]** — hint ตอนหุบกิน ~24px ทุก section; ฟอร์มม่านหน้างานมีหลาย collapsible → ย้าย hint เป็น `badge` inline (มีโครงอยู่แล้ว) หรือตัดเมื่อหัวข้อสื่อครบ
16. 🟡 **DimensionSection.tsx:29** — `grid-cols-2 gap-4` → `gap-3` (คืน 4px/ช่องให้ "ขนาด" ซึ่งเป็นข้อมูล #1) — เล็กน้อย
17. 🟡 **OpeningStyleSelector.tsx:36-45** — 3 ปุ่ม `gap-3 h-20 w-8 h-8` → `gap-2 h-16 w-7 h-7` (คืน ~16px, ทัชยังเหลือ 64px) — เจ้าของชั่ง
18. 🟢 **HardwareSection.tsx:86** — `text-slate-400` → `text-muted-foreground/70` (อยู่ใน systemic #2)

> ✅ ฟอร์มผ่าน: ไม่พบ <12px/>18px, sky แทน blue, overflow 390px (DimensionSection ~155px/ช่อง พอ), safe-area (Modal คุม).

---

## E. FinancialDashboard ("การเงินของงาน")

19. 🔴 **FinancialDashboardModal.tsx:153** — เรียก `variant="fullscreen"` **ไม่มี `appShell`** ทั้งที่ child ทำ sticky-header+dual-scroll เอง → Modal ห่อด้วย `p-4`+`overflow-y-auto` อีกชั้น (เสีย ~32px แนวนอน + เสี่ยง scroll ซ้อน/`pb-safe-area` ถูกหักล้าง)
    → เพิ่ม `appShell` prop. **[วัด Probe]** ยืนยัน dual-scroll ที่ 390px
20. 🔴 **FinancialDashboardModal.tsx:158-172** — metric grid `grid-cols-3 gap-2.5` + การ์ด `p-3` + ปุ่มตาแย่งที่ → ~76px content/การ์ด สำหรับ label "คงเหลือในมือ" + เงิน mono → บีบ/ล้นเมื่อหลักล้าน
    → ลด `p-3`→`p-2.5`, `gap-2.5`→`gap-2`, ย้ายปุ่มตาเป็น `headerAction`; หรือยก "คงเหลือในมือ" เป็นแถวเต็มกว้าง เหลือ grid-cols-2. **[วัด Probe]** ด้วยค่าเงินหลักล้าน
21. 🟢 **FinancialDashboardModal.tsx:207-232** — กล่อง "ทุนที่รู้" (อยู่ในหัวที่ตรึง ไม่ scroll) ยาวหลายบรรทัด → ยุบ "ยังไม่รวม…" เป็น collapse / ลด `space-y-3`→`space-y-2.5` คืนพื้นที่ให้ list
22. 🟢 **CostStructureBar.tsx:31-43** — legend 3 ช่อง `flex gap-4` ไม่มี wrap → `flex flex-wrap gap-x-3 gap-y-1` (กันล้นเมื่อทุนหลายหลัก). **[วัด Probe]**
23. 🟡 **MoneyTab.tsx:152** — `space-y-5` ระหว่าง 2 section → `space-y-4` (มี `border-t` แยกอยู่แล้ว)
24. 🟡 **MoneyTab.tsx:288-308** — estimate chips `flex-wrap` ความยาวต่างกันมาก → `grid grid-cols-2 gap-1.5` ใช้ vertical budget คุ้มกว่า — เจ้าของชั่ง
25. 🟡 **ItemCard.tsx(costs):208** — label `"ส่วนต่างจากทุนที่รู้"` truncate ในช่อง ~167px → ย่อเป็น `"ส่วนต่าง"` (มี tone บอกบวก/ลบแล้ว; เลี่ยงคำ "กำไร"). **[วัด Probe]**

---

## F. Modals & overlays

26. 🟢 **DiscountModal.tsx:116** — `space-y-6` (48px รวม) → `space-y-4`; preview `p-5`→`p-4` (เคาะราคาหน้าร้าน ควรเห็นยอด+ปุ่มจอเดียว)
27. 🟢 **DiscountModal.tsx:282,289,307** — ไอคอน preview `w-3 h-3` (12px) → `w-3.5 h-3.5` (อ่านง่ายบนพื้น primary กลางแดด)
28. 🟢 **CopySummaryModal.tsx:201** — textarea `text-[13px]` (ต่ำกว่า body floor 14) → `text-sm` (เนื้อหาที่อ่านตรวจ ไม่ใช่ meta)
29. 🟢 **Toast.tsx:53** — message `max-w-[240px]` ตัดเร็วบนจอ 390 → ตัดออก (ปล่อย `max-w-[90vw]` คุม)
30. 🔴 **PdfPreviewModal.tsx:88,78** — modal นี้ไม่ผ่าน `Modal.tsx` → ขาด `h-[100dvh]`/`pt-safe-top`/`pb-safe-bottom`; toolbar เสี่ยงมุด notch + ขอบนอก 32-48px บีบ preview
    → ใช้ `<Modal variant="fullscreen" appShell>` (toolbar→`footer`/`headerAction`) หรืออย่างน้อย `h-[90vh]`→`h-[100dvh]` + safe-area + `p-4 sm:p-6`→`p-0 sm:p-6`. **[วัด Probe + sim-notch]**
31. 🟡 **Modal.tsx:86-112** — หัว drawer สูง ~96px; เมื่อไม่มี description ลด `pt-3`→`pt-2`, `pb-3`→`pb-2.5` คืน ~10px
32. 🟡 **DataModal.tsx:298,379** — zone cards `p-5` → `p-4` (เฉพาะ zone ปลอดภัย; **คง** zone "Factory Reset" โปร่งกัน กดพลาด)

> หมายเหตุ: Toast `top-6` ชน notch = **#13 ใน rollup** (อยู่ใน systemic safe-area). ✅ Modal.tsx core ผ่าน: ปุ่มทุกตัว `h-11`=44px, safe-area fullscreen/drawer ครบ.

---

## Verification (ก่อนปิด Stage 2)
- รัน gate: `npm run lint && npm run test:run && npm run build` (เจ้าของรันเอง)
- `npm run dev` → Probe phone window 393×852 + notch sim → ยืนยันข้อ **[วัด Probe]**: #1(Thai ชน), #19(dual-scroll), #20(grid เงินล้าน), #22(legend ล้น), #25(truncate), #30(PdfPreview clip)
- เช็คทั้ง field + detail mode; ไม่ <12px/>18px, ทัช ≥44px, ไม่ overflow 390/375px

## โน้ตทิศทาง
ถ้าเจ้าของเลือก 🟡 "เพิ่มแน่น" หลายข้อ → ควรอัปเดต **DESIGN.md §0/§3** ให้สะท้อนว่า field-mode
เอนไปทาง density มากขึ้น (กันรอบหน้าสับสนกับหลัก "ชัดมาก่อนแน่น" เดิม).
