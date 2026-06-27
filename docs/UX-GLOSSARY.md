# 📐 UX-GLOSSARY.md — ศัพท์งานออกแบบ/พัฒนา UX·UI (คู่มือพัฒนาแอพ)

> **เอกสารนี้คืออะไร:** ที่รวม **ศัพท์เทคนิคฝั่ง design-engineering** ที่ใช้ระหว่างทำงาน UX/UI ของแอพนี้ —
> layout, การวัดขนาด, พฤติกรรม CSS, design pattern — พร้อม **ความหมาย** และ **ส่วนที่ใช้/พบจริงในแอพ**.
> ใช้เป็นคู่มืออ้างอิงเวลาอ่าน PR / คุยงาน / ออกคำสั่งแก้ UI ให้ตรงคำเดียวกันทั้งทีม.
>
> **ต่างจาก [`CONTEXT.md`](../CONTEXT.md) อย่างไร:** CONTEXT.md = **ศัพท์โดเมน/ธุรกิจ** (ผ้าทึบ · DOUBLE · ลอน ·
> ตาไก่ — ไม่มี code/path). เอกสารนี้ = **ศัพท์งานออกแบบ-วิศวกรรม UI** (truncate · natural width · flex · safe-area).
> ส่วนค่ามาตรฐาน/กฎดีไซน์ (ขนาดฟอนต์ · สี · touch · Probe) ยังเป็นของ **[`DESIGN.md`](../DESIGN.md)** — ที่นี่ลิงก์ไป ไม่ทำซ้ำ.

---

## 📌 กติกาบังคับ (standing rule) — เจอศัพท์ใหม่ ต้องบันทึก

> **ระหว่างทำงาน UX/UI ถ้าเจอ "คำศัพท์ที่น่าสนใจ/สำคัญ" ที่ยังไม่มีในเอกสารนี้ — ต้องเพิ่มลงตารางทันที**
> (เทคนิค layout · การวัด · พฤติกรรม CSS · design pattern · เครื่องมือ). ทุก entry ต้องครบ 3 อย่าง:
> **(1) คืออะไร/หมายถึงอะไร · (2) ใช้/พบที่ส่วนไหนของแอพ (ตัวอย่างจริง + `file:line` ถ้ามี) · (3) ลิงก์ owner**
> ถ้าค่านั้นเป็นของ DESIGN.md/CONTEXT.md อยู่แล้ว.
>
> เป้าหมาย: เอกสารนี้ต้อง **โตขึ้นเรื่อย ๆ** จนเป็นคู่มือศัพท์พัฒนาแอพที่สมบูรณ์ — ไม่ใช่ snapshot ครั้งเดียว.
> *(กติกานี้ผูกไว้ที่ [`DESIGN.md §6`](../DESIGN.md) ขั้น enforcement ด้วย เพื่อให้เจอตอนทำงาน UI)*

รูปแบบตาราง: **คำศัพท์ · ความหมาย (คืออะไร/หมายถึงอะไร) · ส่วนไหนในแอพ / ตัวอย่างจริง**

---

## 1. 📐 Layout & การจัดข้อความให้พอดี (text-fitting) — *owned ที่นี่*

| คำศัพท์ | ความหมาย | ส่วนไหนในแอพ / ตัวอย่าง |
|---|---|---|
| **truncate / TRUNCATED** | ข้อความถูก**ตัดท้าย**แล้วแทนด้วย **`…` (ellipsis)** เพราะกล่องที่ใส่แคบกว่าตัวข้อความ. คลาส Tailwind `truncate` = `overflow:hidden; text-overflow:ellipsis; white-space:nowrap` (บรรทัดเดียว ไม่ตัดคำขึ้นบรรทัดใหม่). "TRUNCATED" (ตัวพิมพ์ใหญ่) = ผลสรุปจากการวัดว่า element นั้น**ถูกตัดจริง**. | ชื่อรายการใน [ItemCard.tsx:252](../src/components/workspace/ItemCard.tsx#L252) (`flex-1 min-w-0 truncate`) · ชื่อห้อง [RoomCard.tsx:405](../src/components/workspace/RoomCard.tsx#L405). เคสที่เคยวัด: title ผ้าม่านยาวสุดบนจอ <375px |
| **natural width** | **ความกว้างจริงของข้อความ**เมื่อไม่มีอะไรบีบ (ปล่อยให้ยืดเต็มบรรทัดเดียว). วัดด้วยการ clone ฟอนต์ลง span ลอย ๆ ที่ `white-space:nowrap` แล้วอ่าน `getBoundingClientRect().width`. ใช้เทียบกับ **box width** เพื่อรู้ว่าจะ truncate ไหม. *(⚠ ระวัง: ก๊อป `font` shorthand ของ clone บางทีไม่ตรงฟอนต์จริง (เช่น IBM Plex Sans Thai) → ค่า natural เพี้ยนสูงเกินจริง. ถ้าจะ**ชี้ขาด** ว่า truncate ไหม ให้ยึด `truncated` flag = `scrollWidth > clientWidth` เป็นหลัก; natural ใช้เป็นค่าประมาณ/threshold)* | ตัวเลขที่ใช้ตัดสิน #12: `ผ้าม่าน ม่านแป๊บ/สอดราง` natural = 167px → หลังย่อ label เหลือ 106px |
| **box width / client width** | **ความกว้างที่ element ได้รับจริง**หลัง layout (พื้นที่ด้านในกล่อง ไม่รวม border/scrollbar) = `el.clientWidth`. ถ้า box ≥ natural → ข้อความพอดี; ถ้า box < natural → truncate. | ช่อง title ที่เหลือหลังหัก index + ชิป + chevron |
| **scrollWidth vs clientWidth** | **เกณฑ์ชี้ขาด truncate:** `el.scrollWidth > el.clientWidth` = เนื้อหาล้นกล่อง (กำลังถูกตัด). ใช้เป็น assertion ตอนวัด. *ระวัง:* ถ้า element เป็น `flex-grow` กล่องจะยืดเต็มที่ว่าง ทำให้ `scrollWidth==clientWidth` แม้ข้อความสั้น — จึงต้องวัด **natural width** แยกเพื่อรู้ความกว้างข้อความที่แท้จริง | สคริปต์วัด truncate ของ ItemCard title |
| **slack / headroom** | **พื้นที่เหลือ** = `box width − natural width`. บวก = พอดี/เหลือ, **ติดลบ = truncate**. ใช้ดูว่าเคสคับแค่ไหน (เช่น +5px = ก้ำกึ่ง, ควรเผื่อ). | รายงานวัด: เคสคับสุดเดิม slack −25px @360px → หลังแก้ +36px |
| **flex-1 / flex-grow** | สั่งให้ flex item **ยืดกินที่ว่างที่เหลือ**ในแถว. ผลข้างเคียง: กล่องจะโตจน `clientWidth` อาจ > ความกว้างข้อความ (ดู scrollWidth caveat ด้านบน). | title ใน ItemCard Row 1 (`flex-1`) ยืดเต็มหลังหัก index/ชิป/chevron |
| **min-w-0** | ปลดล็อก **`min-width:auto` เริ่มต้นของ flex item** (ซึ่งกันไม่ให้หดต่ำกว่าเนื้อหา). **จำเป็นต้องมีคู่กับ `truncate`** — ถ้าไม่ใส่ flex item จะไม่ยอมหด ข้อความล้นดันทั้งแถวแทนที่จะตัด. | ทุกที่ที่ต้องการ title ตัดได้: `flex-1 min-w-0 truncate` |
| **shrink-0** | สั่งให้ element **ห้ามหด** (`flex-shrink:0`). ใช้กับของที่ต้องคงขนาด (เลขลำดับ · ชิปสถานะ · chevron · ยอดเงิน) → แรงบีบจึงไปตกที่ title ให้ truncate ก่อน. | index/ชิป/chevron ใน [ItemCard.tsx:247-272](../src/components/workspace/ItemCard.tsx#L247-L272) |
| **ellipsis** | สัญลักษณ์ **`…`** (อักขระเดียว U+2026) ที่ browser ใส่แทนส่วนที่ถูกตัด เมื่อ `text-overflow:ellipsis`. | ผลของ `truncate` |
| **orphan wrap / almost-fits wrap (wrap ลอย)** | flex-wrap anti-pattern: เนื้อหารวมเกินขอบกล่อง**แค่นิดเดียว** → มีแค่ item ท้าย ๆ (มัก = ตัวขวาสุดที่ `ml-auto`) ตกไปบรรทัดใหม่**ลำพัง** ดูลอย/ไม่ตั้งใจ. ชี้วัด: `natural(children+gaps) ≳ box` เพียงไม่กี่ px. แก้: จัดเป็น **หลายบรรทัดตั้งใจ** (แต่ละบรรทัดมีโครง left/right ชัด) · ลด natural ให้พอดี · หรือย่อ element ที่กว้างเกิน. | แถวเมตา [JobsModal.tsx](../src/components/modals/JobsModal.tsx): natural 326px > box 324px @390px → วันที่หลุดบรรทัด 2 ลำพัง → **แก้ 2026-06-23: แยกเป็น 2 บรรทัดตั้งใจ** (สถานะ⟷วันที่ · นับ/ค้าง) |
| **numeric column alignment (ตั้งเลขคณิต)** | จัดตัวเลขหลายค่าให้ **right-align + `tabular-nums`** เพื่อให้หลัก/จุดทศนิยม**ตรงกันแนวตั้งเป็นคอลัมน์** (เทียบค่าได้เร็วเหมือนตั้งเลขบวก/ลบ). ต้องครบ 3 อย่าง: (1) แต่ละแถว `flex justify-between` (label ซ้าย · เลขขวา) (2) container `flex-col` (right-edge ของทุกแถวตรงกัน) (3) `font-mono tabular-nums` + ฟอร์แมตทศนิยมเท่ากัน. | แถวเงิน [JobsModal.tsx](../src/components/modals/JobsModal.tsx) (มือถือ 3 แถว ราคา/รับแล้ว/ค้างเก็บ right-edge @345px ตรงกัน · เดสก์ท็อป `sm:flex-row` inline) — แก้ 2026-06-23 |
| **bounded set (ชุดจำกัด)** | ข้อความที่มาจาก**ชุดค่าที่รู้ล่วงหน้า/นับได้** (เช่น title = ชื่อสินค้า + รูปแบบม่าน) ตรงข้ามกับ **free-text** ที่ผู้ใช้พิมพ์เอง. สำคัญเพราะ: ถ้า bounded → ความเสี่ยง truncate **คำนวณ/วัดให้ครบทุกเคสได้** ไม่ใช่ปลายเปิด; ถ้า free-text → วัดได้แค่ "threshold กี่ตัวอักษรจึงตัด" ต้องออกแบบเผื่อยาว. | **bounded:** ItemCard title · **free-text:** ชื่อลูกค้า ([JobsModal.tsx:220](../src/components/modals/JobsModal.tsx#L220)) · `notes` · ชื่อห้อง |
| **hierarchy inversion (สำคัญสุดได้พื้นที่น้อยสุด)** | layout anti-pattern: element ที่**สำคัญสุด** (ใช้ scan/ตัดสินใจ) กลับถูกบีบพื้นที่เพราะวางในแถวเดียวกับ control รอง ๆ ที่เป็น `shrink-0`. อาการ: ของหลัก truncate ทั้งที่แถวยังมีที่ว่างไปกับของรอง. แก้โดยย้ายของรองลงแถวอื่น / ให้ของหลักได้แถวของตัวเอง. | ชื่อลูกค้า [JobsModal.tsx](../src/components/modals/JobsModal.tsx): เดิม box ~108px เพราะชิปสถานะ 120px + kebab 44px แย่งแถวบน → **แก้ 2026-06-23: ย้ายชิปสถานะลงแถวเมตา → box 236px @390px** (ชื่อ = hero เต็มแถว) |
| **thumb-inside positioning** | จัด thumb/marker ให้เลื่อน**ภายในแทร็คโดยไม่ล้นขอบ**: `left: frac*100%` (เลื่อนตามสัดส่วน) **+** `transform: translateX(frac*-100%)` (ชดเชยความกว้างของ thumb เอง) → frac 0 = ชิดซ้ายพอดี, 1 = ชิดขวาพอดี, ไม่มีส่วนไหนยื่นพ้นแทร็ค. คู่กับ `transition-all` = เลื่อนนุ่ม. *(วัด center ของ thumb จะได้ ~0.16/0.5/0.84 ไม่ใช่ 0/0.5/1 เพราะ thumb มีความกว้าง — เป็นเรื่องปกติ ไม่ใช่ bug)* | แถบเลื่อนบอกตำแหน่งห้อง RoomSlider pager (>8 ห้อง) [RoomSlider.tsx](../src/components/workspace/RoomSlider.tsx) — แทนตัวเลข "N/M" 2026-06-24 |
| **consistent-form indicator (ตัวบ่งชี้คงรูป)** | หลักการ: ตัวบ่งชี้สถานะเดียวกันควร**คงรูปแบบ** ไม่สลับชนิดการแสดงผลตามเงื่อนไข (เช่น count↔visual) เพราะผู้ใช้จะนึกว่าเป็น bug/ของคนละอย่าง. ถ้าต้องรองรับหลายขนาด ให้สลับ**ภายในชนิดเดียวกัน** (ดอท→แถบ ล้วนเป็น visual) ไม่ใช่ข้ามชนิด. + เลี่ยงแสดง**ค่าเดียวกันซ้ำ**สองที่ (duplication). | RoomSlider pager เดิม ≤8=ดอท / >8=เลข "N/M" (ซ้ำกับ avatar) → 2026-06-24 ทำให้เป็น visual เสมอ (ดอท→แถบ), เลขอยู่ที่ avatar ที่เดียว |
| **de-dup section header (ยุบหัวข้อ section ซ้ำ)** | EEERT-minimal pattern: ลบ `title`+`icon` ของ `FormSection` เมื่อ **label ของคอนโทรลข้างในสื่อความครบแล้ว** (หัวข้อ section มัก = เอา label ย่อยมาต่อกัน → ซ้ำ). ถ้าคอนโทรลเป็น text input ให้ย้าย label เข้า field ผ่าน **`Input.prefix`** (+`aria-label` กัน a11y) แทน label ด้านบน. gate `theme==='eeert'` (ธีมอื่นคงเดิม) · คง `headerRight` (error inline). | "รูปแบบม่าน & การเก็บ" → ลบ เหลือ "รูปแบบม่าน"+"ทิศทางการเปิด" [StyleSection.tsx](../src/features/curtains/components/sections/StyleSection.tsx) · "ขนาดพื้นที่ (ม.)" → ลบ + W/H เข้า field [DimensionSection.tsx](../src/features/curtains/components/sections/DimensionSection.tsx). owner = [DESIGN minimal](../DESIGN.md) |

---

## 2. 🧪 การวัด & เครื่องมือ (measurement)

| คำศัพท์ | ความหมาย | ส่วนไหนในแอพ / ตัวอย่าง |
|---|---|---|
| **viewport** | ขนาดพื้นที่แสดงผลของหน้าจอ (กว้าง×สูง เป็น px). **เป้าออกแบบ/ทดสอบ = 360–390px ก่อน** (มือถือ/หน้างาน — ดู [DESIGN §0](../DESIGN.md)). 390 = iPhone 13, 375 = iPhone SE/mini, 360 = ขอบล่าง Android. | ทุกการวัด UX ต้องเช็คทั้งช่วงนี้ |
| **Design Probe** | เครื่องมือ dev (กด **Alt+L** หรือปุ่ม "Probe") อ่าน text · `file:line` · **คอมโพเนนต์+prop ระบุตัว+call-site** (`↳ Input · label="…" · in FabricSection.tsx:201` — จาก React fiber + DOM data-loc, แยก instance ได้ 2026-06-27) · font-size/line-height/weight · role ตาม DESIGN.md · ⚠ ถ้า <12px/>18px. **owner = [DESIGN §6](../DESIGN.md)** | `src/components/dev/DevInspector.tsx` — วัดก่อนแก้เสมอ ("measure, don't guess") |
| **HMR (Hot Module Replacement)** | dev server (Vite, port 3000) **อัปเดตโมดูลที่แก้ทันทีโดยไม่ reload ทั้งหน้า** → วัดผลการแก้ได้เร็วโดยไม่ต้อง build. | ใช้ตอนวัด truncate ซ้ำหลังแก้ label |
| **deviceScaleFactor / DPR** | อัตราส่วน px จริงต่อ CSS px ของจอ (เช่น 3 = จอ retina). ตั้งตอนจำลองมือถือเพื่อให้ฟอนต์/เส้นคมเหมือนเครื่องจริง. | สคริปต์วัด: `deviceScaleFactor: 3, isMobile: true` |

---

## 3. 🔗 ศัพท์ที่ DESIGN.md / CONTEXT.md เป็นเจ้าของ (ลิงก์ ไม่ทำซ้ำ)

ใช้บ่อยในงาน UI แต่ค่า/นิยามอยู่ที่ owner — อ่านที่นั่น:

| คำศัพท์ | สั้น ๆ | Owner |
|---|---|---|
| **touch target** | พื้นที่แตะ ≥ **44×44px** (HIG); ใช้ `useTierSize().control` | [DESIGN §3](../DESIGN.md) |
| **safe-area** | ขอบจอ notch/home-indicator; `pt-safe-top`/`pb-safe-bottom`/`var(--content-top)` | [DESIGN §3](../DESIGN.md) · HANDOFF §4 |
| **leading / tracking** | line-height / letter-spacing — **ไทยห้าม `leading-tight`/`tracking-tight`** (สระ-วรรณยุกต์ชนกัน) | [DESIGN §1](../DESIGN.md) |
| **Meta / Body / Title / Display** | ชั้น typography (12 / 14–16 / 16 / 18px cap) | [DESIGN §1](../DESIGN.md) |
| **soft pill vs contrast plate** | วิธีใส่พื้นให้ตัวเลข "สี" ไม่กลืนพื้น (`bg-500/10` บนการ์ดขาว vs `bg-50`+border บนพื้นสี) | [DESIGN §2.1](../DESIGN.md) |
| **data tone (สี=ความหมาย)** | หนึ่ง hue หนึ่งความหมาย (เงิน=emerald · มิติ=blue · ราง=sky …) | [DESIGN §2.1](../DESIGN.md) · `dataTones.ts` |
| **density vs comfort** | แลก "ข้อมูลต่อจอ" กับ "ความสบายตา/touch" — field roomier, detail denser | [DESIGN §0/§3](../DESIGN.md) |
| **AdvancedSection / progressive disclosure** | ซ่อนสเปคที่ใส่ทีหลังไว้ในส่วนพับได้ (ลด cognitive load) | [DESIGN §8](../DESIGN.md) · HANDOFF §1.6 |
| **Miller's Law (chunk ≤ ~7)** | จัด control เป็นกลุ่มมีป้าย ≈5 (ไม่เกิน ~7) ต่อกลุ่ม | [DESIGN §0](../DESIGN.md) |

---

## ภาคผนวก — มินิ how-to: วัด truncate จริง (ไม่เดา)

1. หา element ที่ truncate ได้ (`flex-1 min-w-0 truncate`).
2. วัด **natural width**: clone ฟอนต์เดียวกันลง span ลอยที่ `white-space:nowrap` → อ่าน width.
3. วัด **box width** = `el.clientWidth` ที่ viewport เป้า (360/375/390px) — *รอ `document.fonts.ready` ก่อน* (ฟอนต์ไม่โหลด = วัดผิด).
4. **truncate ก็ต่อเมื่อ `natural > box`** (slack ติดลบ). ทำซ้ำทุก viewport + ทุกเคสของ **bounded set** (ถ้าเป็นชุดจำกัด).
5. ถ้า title มาจาก bounded set → enumerate ตัวยาวสุด × ชิป/องค์ประกอบที่กว้างสุดที่ "เกิดร่วมกันได้จริง" เท่านั้น.

> ทำไมต้องวัด natural แยก: ถ้า element เป็น `flex-grow` กล่องจะยืดเต็มที่ว่าง `scrollWidth==clientWidth` เสมอ —
> มองไม่เห็นว่าข้อความจริงกว้างเท่าไร. natural width คือความกว้างที่แท้จริงของข้อความที่เอาไปเทียบได้.
