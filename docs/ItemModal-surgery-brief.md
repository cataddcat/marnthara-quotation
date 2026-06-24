# 🔪 ItemModal — Major Surgery Brief (คำสั่งสำหรับ session ผ่าตัดใหญ่)

> เอกสาร**ชั่วคราว** (ลบได้หลังผ่าตัดเสร็จ). เจ้าของสั่ง (จบ session 2026-06-24): ItemModal สะสมร่องรอย
> หลายดีไซน์หลายรอบ → ต้อง "ผ่าตัดใหญ่" ครั้งเดียวให้สะอาด. **อย่าแก้ทีละจุดย่อย — audit ทั้งระบบก่อน
> แล้วเสนอ target design ให้เจ้าของเคาะ ก่อนลงมีด.**

## 🎯 เป้าหมาย
`ItemModal.tsx` (+ ส่วนที่เกี่ยวใน `Modal.tsx`) → **"หนึ่งงาน หนึ่งวิธี"** สะอาด สม่ำเสมอ ระดับ award-winning
โดย**ไม่เสีย logic** (Save-First / autosave / pricing / 9 ฟอร์ม).

## 🩺 อาการที่เจ้าของพบ (จุดตั้งต้น — ไม่ใช่ทั้งหมด)
1. **เลือก/เปลี่ยนประเภทสินค้า ซ้ำ 3 ทาง** ทำเรื่องเดียวกัน:
   - type-grid ตอนยังไม่เลือกชนิด (`ItemModal.tsx` ~415-427, grid 2 คอลัมน์)
   - ปุ่มแถว "ประเภทสินค้า · {ชื่อ} · เปลี่ยน ⌄" (add mode, ~430-446) → เปิด OptionSheet
   - `OptionSheet` "เลือกประเภทสินค้า" (~528-536)
2. **ปุ่มปิดซ้ำ** — เจ้าของเห็น "ปิด" + "x" 2 ที่ (น่าจะ Modal header ✕ ซ้อนกับ close ของ OptionSheet / หรือร่องรอย type-picker). ต้องยืนยันตอน audit.
3. โครงซับซ้อนจากการแก้หลายรอบ: state flags หลายตัว (`showForm` · `isFormEmpty` · `typeSheetOpen` · `activeType` · `mode`) + handler สะสม (`onCancel` ถูกส่งเข้า **9 ฟอร์ม** — อาจ **dead prop** หลังตัด footer "ยกเลิก" รอบ 2026-06-24).

## 🔧 ขั้นตอน (session หน้า)

### 1) AUDIT ก่อน (ห้ามแตะโค้ด) — เขียน map ออกมา
- **State diagram**: ทุก branch ที่เป็นไปได้ (empty → type-grid · type-selected → form · add vs edit · typeSheet open) + flag ที่คุมแต่ละอัน.
- **ทุก affordance ปิด/ยกเลิก/back** ที่ผู้ใช้เห็นได้: Modal header ✕ · OptionSheet close · ปุ่มใน 9 ฟอร์มที่รับ `onCancel` (เรนเดอร์ปุ่มเองไหม?) · footer.
- **ทุกทางเลือก/เปลี่ยนประเภท** (3 ทางข้างบน) — อันไหนซ้ำ ตัดได้.
- **เช็ค prop ตาย**: `onCancel`/`onSubmit`/`onAutoSave` ใน 9 ฟอร์ม (`grep onCancel` ในแต่ละ `features/*/components/*Form.tsx`) — ยังใช้จริงไหมหลังตัด footer ยกเลิก.

### 2) เสนอ TARGET DESIGN (ให้เจ้าของเคาะก่อนทำ)
- **เลือกประเภท = ทางเดียว**: รวม grid + switcher + OptionSheet → pattern เดียว (เช่น ครั้งแรก = grid เต็มจอ; เปลี่ยนภายหลัง = ปุ่มแถวเดียว → reuse OptionSheet เดิม — ไม่มีโค้ดเลือกชนิดซ้ำ 2 ชุด).
- **ปิด = ทางเดียวชัด**: ✕ หัว modal (เพิ่งทำ 2026-06-24) เป็นหลัก; ถ้า OptionSheet/sheet ซ้อน → ไม่โชว์ ✕ ที่ชวนสับสน.
- **ลดรูป state** เหลือเท่าที่จำเป็น · ลบ dead props/handlers.
- **คงของที่เพิ่งแก้ดีแล้ว** (2026-06-24): footer = `[บันทึก & เพิ่ม] ⟷ [บันทึก]` (ตัด "ยกเลิก", text-forward, HIG) · close = ✕ ขวาบนทุก modal · footer safe-area `pb-safe-bottom-min`.

### 3) CONSTRAINTS (ห้ามพัง)
- **Save-First** (HANDOFF §1.1): autosave-on-change (debounce) · flush on close/unmount · **ไม่มี validation gate ใน submit**.
- pricing/autosave flow: `handleAutoSave` · `flushAutoSave` · `submitIntentRef` ('next'/'close') · `autoCreatedIdRef` (add) · `key={formKey}` remount — ต้องทำงานเหมือนเดิม.
- 9 ฟอร์ม (curtain/wallpaper/roller/wooden+alum/vertical/partition/pleated/removal) เปิด-กรอก-บันทึกได้ครบ.
- **อ่านก่อน**: HANDOFF §1.1 (Save-First) · §2.4 (Form Architecture) · §4 invariants 4-5 · DESIGN.md (typography/สี/ทัช ≥44px).
- gate (`lint·test·build`) — **เจ้าของรันเอง** (AI แก้แล้วหยุด).

### 4) VERIFY
- ทุก item type: เปิด → กรอกขั้นต่ำ → autosave (draft ไม่หายเมื่อปิด) → "บันทึก & เพิ่ม" (เคลียร์ฟอร์มอยู่ต่อ) → "บันทึก" (ปิด) → ✕ (ปิด, draft อยู่).
- เปลี่ยนประเภทได้**ทางเดียว** · ไม่มีปุ่มปิด/เลือกชนิดซ้ำ · 360–390px · Probe ผ่าน.
- Playwright วัด (เปิด ItemModal seed → ตรวจ affordance + ปุ่ม).

## 📌 หมายเหตุ
- งานนี้ **ไม่ใช่ feature ใหม่** — เป็น **cleanup/consolidation** (ลด ไม่ใช่เพิ่ม). ถ้าระหว่างทางเจอ scope บาน → กลับมาคุยเจ้าของ.
- เริ่ม session ด้วย: *"อ่าน docs/ItemModal-surgery-brief.md แล้วเริ่ม AUDIT (ขั้น 1) — ยังไม่แตะโค้ด"*
