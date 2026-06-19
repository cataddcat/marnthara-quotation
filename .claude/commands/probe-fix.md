---
description: แก้ element ตาม Design Probe ให้เข้ามาตรฐาน DESIGN.md (ฉบับ colorful + high-contrast)
argument-hint: paste Design Probe block(s) — text · file:line · size/lh/weight · classes · role
---

ผมจะแปะผลจาก **Design Probe** มา (อาจหลายบล็อก) — แก้แต่ละจุด ณ ตำแหน่ง `file:line` ที่ระบุ ให้เข้ามาตรฐาน
DESIGN.md **เวอร์ชัน colorful + high-contrast** (ไม่ใช่ minimal/near-white) ฉบับเต็มอยู่ใน `DESIGN.md`
(อ่านเฉพาะตอนต้องการ — มาตรฐานย่อด้านล่างพอสำหรับงานทั่วไป)

## Probe ที่แปะมา
$ARGUMENTS

## มาตรฐานที่ต้องบังคับ (ย่อจาก DESIGN.md §1 · §2 · §4)

> ⚠️ **Mirror ของ DESIGN.md** — ค่าด้านล่างเป็นสำเนาย่อเพื่อความสะดวก; **เจ้าของจริง = DESIGN §1/§2.1 +
> `typography.ts`/`dataTones.ts`**. ถ้าต่างกัน → **DESIGN ชนะเสมอ** (อย่ายึดตัวเลข/สีในไฟล์นี้ถ้าขัดกับ DESIGN).

**ตัวอักษร (§1 — STRICT)**
- Body **14–16px** · Title 16px `font-semibold` · Label 14px · Display **18px (เพดาน)** `font-bold` — เน้นด้วยสี/plate ไม่ใช่ขนาด
- **12px = Meta เท่านั้น** (วันที่/จำนวน/หน่วย/micro-label) · **< 12px = ห้ามเด็ดขาด** (lint จะ fail)
- Thai body `leading-normal`+ (≥1.5) — ห้าม `leading-none` / `leading-tight` บน Thai หลายบรรทัด
  · `tracking-tight` เฉพาะ Latin heading / ตัวเลข ห้ามใช้กับ Thai body
- ใช้ `Text` primitive (`src/components/ui/Text.tsx`) เมื่อทำได้ แทน `text-*` ดิบ
- ยกเว้น `src/components/print/**` (สื่อสิ่งพิมพ์มี sizing ของตัวเอง)

**สี & contrast (§2 — every number colour-coded by type · neutral chrome only · high contrast)**
- ข้อมูลมีความหมาย = สีจัดตามบทบาท (ผ่าน `Metric` / tone): **เงิน = เขียว (emerald) · ขนาด = น้ำเงินแท้
  (blue — ห้าม sky/cyan เพราะจะกลืนกับเขียว) · ต้นทุน = แดง (rose)**
- chrome / ตัวหนังสือทั่วไป = `text-foreground` / `text-muted-foreground` (muted เฉพาะข้อความรอง ≥ 14px)
- พื้นผิวต้องแยกชัด: page เทา · card ขาว · **`border-border` ต้องมองเห็น** + soft shadow ต่างระดับ
  (ghost แบน → outline `shadow-xs` → card `shadow-sm` → CTA/popover `shadow-md`)
- `bg-primary` = CTA / selected เท่านั้น — ห้ามใช้ตกแต่ง
- contrast AA ขั้นต่ำ ดันให้ถึง AAA ทุกที่ที่ทำได้

**ไอคอน & ตัวเลข (§4 · §5)**
- ไอคอน functional = `lucide` เท่านั้น `strokeWidth={1.5}` monochrome `currentColor`
- **ห้าม generic icon ที่ไม่ตรงกับสินค้า/ความหมายจริง** — หาไอคอนที่ตรงไม่ได้ → ตัดทิ้ง ใช้ตัวอักษรล้วนแทน
  (บทเรียน ItemModal type picker: ม่าน/มู่ลี่/ฉาก ใช้ไอคอนซ้ำมั่ว → เลยใช้ text grid 2-col)
- ตัวเลข/รหัส/ราคา = `font-mono tabular-nums` ≥ 14px (Meta ≥ 12px)

## วิธีทำ
1. อ่าน **เฉพาะช่วงบรรทัดรอบ `file:line`** ที่ Probe ชี้ — อย่าอ่านทั้งไฟล์ถ้าไม่จำเป็น (blast radius ให้น้อยสุด)
2. แก้ตรงจุดให้ตรงมาตรฐานด้านบน — ถ้าเป็น **เรื่องตัดสินใจดีไซน์** (ไอคอนตรงไหม · ควรลด/เพิ่มขนาดไหม)
   ให้ **เสนอก่อนเป็นข้อ ๆ** อย่าเดาเอง
3. **อย่ารัน CLI** — เจ้าของรัน `npm run lint && npm run test:run && npm run build` เอง (workflow ประจำ)
4. สรุปท้ายสั้น ๆ: แต่ละจุด `file:line` · เดิม → ใหม่ · บอกว่าให้เช็คอะไรที่ **360–390px** + ให้รันคำสั่งอะไร
