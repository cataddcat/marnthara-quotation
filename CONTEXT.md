# CONTEXT.md — Marnthara Smart Quotation Glossary

> Glossary ของศัพท์ที่ใช้ในโปรเจคนี้ เวลาคุยเรื่อง feature, bug, หรือ design ให้ใช้ศัพท์ในไฟล์นี้ให้ตรง ถ้าต้องการศัพท์ใหม่ที่ยังไม่อยู่ในไฟล์ — เสนอเพิ่มเข้ามาก่อนใช้ ไม่ใช้แบบ informal
>
> **กฎของไฟล์นี้:** ห้ามมี file paths, code, line numbers, bug history, หรือ rationale ทั้งหมดนั้นอยู่ใน HANDOFF.md / git log / ADR แล้ว ไฟล์นี้ตอบคำถามเดียว: *"X คืออะไร"*

---

## 1. Curtain Domain (ม่านและผ้า)

### ผ้าทึบ
ผ้าชั้นนอกที่กันแสง เป็นชั้นหลักของทุก curtain item ทุกผืนผ้าม่านต้องมีผ้าทึบ ภาษาอังกฤษเรียก *blackout fabric* หรือ *main fabric* แทนกันได้

### ผ้าโปร่ง
ผ้าชั้นในที่ให้แสงผ่าน ใช้คู่กับผ้าทึบในโหมด DOUBLE เท่านั้น (ห้ามใช้คำว่า "ผ้าซับใน" เพราะช่างจริงไม่ใช้)

### SINGLE
โหมดชั้นผ้าแบบมีผ้าทึบอย่างเดียว ไม่มีผ้าโปร่ง

### DOUBLE
โหมดชั้นผ้าแบบมีทั้งผ้าทึบและผ้าโปร่ง การคำนวณต้นทุนต่างจาก SINGLE — ต้องคิด labor ผ้าโปร่งแยก และ brackets เพิ่ม 30%

### Style (รูปแบบจับจีบ)
ลักษณะการเย็บส่วนหัวของผ้าม่าน ค่าที่เป็นไปได้: `ลอน`, `จีบ`, `ตาไก่`, `Roman`, `พับ` (Style เป็น key ที่ใช้ลุก up labor cost โดยตรง)

### ลอน
Style แบบลอน (wave) ใช้ wave tape เป็นอุปกรณ์เย็บหัว

### จีบ
Style แบบจับจีบ (pinch pleat) ใช้ตะขอ pin hook เป็นอุปกรณ์เย็บหัว

### ตาไก่
Style แบบรูตาไก่ (eyelet/grommet) ใช้ห่วงตาไก่ติดหัวผ้า

### Roman
Style ม่านพับโรมัน (Roman shade) ใช้ Roman set 1 ชุดต่อ 1 หน้าต่าง

### พับ
Style ผ้าม่านแบบพับธรรมดา (fold)

### Rail (ราง)
อุปกรณ์แขวนม่าน คิดตามความกว้าง × accessory cost ของ rail แต่ละชนิด rail แต่ละ style จับคู่กันผ่าน mapping ตายตัว

### Brackets
ขาแขวน rail จำนวนคิดจากความกว้าง สูตรพื้นฐานคือ `⌈width / 1.2⌉ + 1` ถ้าเป็น DOUBLE คูณ 1.3 (รับน้ำหนัก 2 ชั้น)

---

## 2. Item & Project Domain

### Quotation (ใบเสนอราคา)
Output สูงสุดของแอพ ประกอบด้วย customer info + rooms + items + discount + VAT รวมเป็น PDF ส่งให้ลูกค้า

### Room
1 ห้องในใบเสนอราคา เก็บ items[] หลายชิ้น มี room-level defaults ของตัวเอง

### Item
ผ้าม่าน/วอลเปเปอร์/มู่ลี่/ฉากกั้น 1 ชิ้นในห้อง แต่ละ item มี `type` ที่กำหนดสูตรคำนวณ (discriminated union)

### Item Type
ประเภทของ item: `curtains`, `wallpapers`, `roller-blinds`, `vertical-blinds`, `wooden-blinds`, `partition`, `pleated-screen`, `removal`

### Removal (รื้อถอน)
Item type พิเศษที่หมายถึงงานรื้อของเก่า ไม่ใช่ผ้าหรืออุปกรณ์ใหม่ คิดค่าแรงอย่างเดียว

### Customer
ข้อมูลลูกค้า ชื่อ ที่อยู่ เบอร์โทร — แสดงบนใบเสนอราคา ไม่กระทบ pricing

### Discount
ส่วนลดท้ายบิล มี field `is_enabled: boolean` เป็นกฏเด็ดขาด ถ้า `is_enabled = false` ส่วนลดไม่ถูกใช้ ไม่ว่าจะตั้งจำนวนไว้เท่าไร

### VAT
ภาษีมูลค่าเพิ่ม คำนวณจาก `shopConfig.baseVatRate` หลังหัก Discount

---

## 3. Cost & Pricing Domain

### Pricing
การคำนวณ "ราคาขาย" ที่จะแสดงให้ลูกค้าเห็นในใบเสนอราคา

### Cost
การคำนวณ "ต้นทุน" ที่เจ้าของร้านจ่ายจริง ใช้คู่กับ pricing เพื่อดู margin

### Margin
ส่วนต่างระหว่าง pricing กับ cost ของ item เดียวกัน หน่วยเป็น % หรือบาท

### Breakdown
รายละเอียดผลลัพธ์การคำนวณ เช่น `fabricYards`, `sheerYards`, `rolls` ใช้เป็น single source of truth ในการแสดงปริมาณวัสดุ — ห้ามคำนวณซ้ำที่อื่น

### Priority Chain (ลำดับ source ของต้นทุน)
ลำดับการลุก up ต้นทุนของ fabric ในการวิเคราะห์ cost:
1. **Vault** — ต้นทุนใน registry กลาง
2. **Direct entry** — user พิมพ์ราคา/ต้นทุนใน item form ตรงๆ
3. **Pro Mode** — user override ทั้งก้อนต่อ item
4. **Missing flag** — ถ้าทั้ง 3 ข้างบนไม่มีข้อมูล

### Strategy (per-type pricing logic)
Pattern การคำนวณราคาแยกตาม item type — แต่ละ type มี Strategy ของตัวเอง เช่น `CurtainStrategy`, `WallpaperStrategy` ใช้ผ่าน PricingEngine

### Formula / Multiplier
ค่าคงที่ที่ใช้คูณในการคำนวณ เช่น `ลอน 2.7` หมายถึง ผ้า style ลอน ใช้ปริมาณผ้า = width × 2.7 ปรับได้ผ่าน Formula Studio

### Yard Conversion
ค่าแปลงเมตรเป็นหลา default `1.11` ใช้ในการแปลงต้นทุนเมตริก → หลา (ภาษาช่าง)

### Save-First, Validate-Later
หลักการสำคัญ form ทุก field บันทึกทันทีตอน blur ไม่รอ validation ผ่าน ห้ามตั้ง gate ที่ block การ save

### Auto-Save (on blur)
ทุก event ที่ field ผ้าเสีย focus จะส่งข้อมูลปัจจุบันเข้า store ทันที ไม่ต้องกด Save

### Pro Mode
โหมดของ item form ที่ user override ราคา/ต้นทุนเป็นก้อนเดียวต่อ item อยู่ใน Priority Chain ระดับ 3

---

## 4. Surface (หน้าจอ/Modal)

### Vault (คลังรหัสผ้าและต้นทุน)
Registry กลางของรหัสผ้า + ราคา + ต้นทุน ใช้คำนี้แทน "Favorites" / "รายการโปรด" เสมอ

### Inventory Manager
หน้า UI สำหรับ CRUD ของ Vault เปิดผ่าน main menu

### Cost Vault (Production Settings)
หน้ารวมต้นทุน 3 ก้อน: labor, accessory, fabric เปิดผ่าน main menu — มี action "โหลดค่ามาตรฐาน 2025"

### Financial Dashboard
หน้าวิเคราะห์ P&L รายไอเท็ม sort ลำดับจากแย่สุด → ดีสุด (loss → warning → unknown → profit) มีแถบ cost structure (ผ้า/labor/rail+อุปกรณ์)

### Material Summary (BOM)
สรุปวัสดุที่ต้องซื้อจริง แยก 3 แท็บ ผ้า/ราง/อุปกรณ์ มีปุ่ม copy เป็น text shopping list

### Formula Studio
หน้าตั้งค่า multiplier และ offset (ลอน 2.7, จีบ 2.7, Roman offset 0.45m, hem 0.30m, yard_conversion 1.11) — input validation ปฏิเสธค่าติดลบ และค่า 0 สำหรับ multiplier ที่ "MUST_BE_POSITIVE"

### Lookbook
แค็ตตาล็อกภาพประกอบให้ลูกค้าดูระหว่างประชุม ไม่เกี่ยวกับ pricing เลย

### Code Jump
การคลิกรหัสผ้าเพื่อกระโดดไปที่ Vault โดย pre-fill search ด้วยรหัสนั้น ถ้ารหัสไม่มีในระบบ Vault จะ auto-open ฟอร์มสร้างใหม่ พร้อม code นั้นกรอกไว้แล้ว (เป็น lookup ทางเดียว: รหัส → คลัง)

### รายละเอียดรหัส (Code Detail)
หน้า hub กลางของรหัสหนึ่ง เปิดได้จากทุกที่ที่อ้างถึงรหัส (Financial Dashboard, คลังต้นทุน, การ์ดสินค้า) แสดง 2 ส่วน: (1) ต้นทุน/ราคาขาย/หมายเหตุ จาก Vault และ (2) **จุดที่ใช้** — รายการห้อง/จุดทั้งโครงการที่ใช้รหัสนี้ กดแล้วกระโดดไปแก้ที่จุดนั้นได้ (reverse lookup: รหัส → ห้อง/จุด) เป็นส่วนเติมเต็มของ [[Code Jump]] ให้ค้นได้สองทาง

### Modal Stack
รูปแบบการเปิด modal ซ้อนกัน เมื่อเปิด modal ใหม่ modal ปัจจุบันจะถูก push เข้า stack ปิด modal ใหม่จะ pop กลับมา

---

## 5. Platform Terms

### PWA
Progressive Web App แอพนี้ install ได้บน iOS/Android/Desktop ผ่าน browser

### Offline-First
ใช้งานได้ครบฟังก์ชันแม้ไม่มี internet ผ่าน service worker ที่ cache assets

### localStorage
ที่เก็บข้อมูลถาวรในเบราว์เซอร์ของอุปกรณ์ ข้อมูล quotation, vault, settings ทั้งหมดอยู่ที่นี่ ไม่มี server

### Undo/Redo
ความสามารถย้อนการกระทำ จำกัด 20 state ล่าสุด แต่จะไม่นับ modal open/close (เป็น UI state ไม่ใช่ data state)

---

## 6. Anti-terms (ห้ามใช้คำเหล่านี้)

| ห้ามใช้ | ใช้แทน | เหตุผล |
|---|---|---|
| Favorites / รายการโปรด | Vault / คลังรหัสผ้าและต้นทุน | คำเดิมทำให้เข้าใจผิดว่าเป็น bookmarks |
| ผ้าซับใน | ผ้าโปร่ง | ภาษาช่างจริงใช้ "ผ้าโปร่ง" |
| Schema validation gate | (ห้ามใช้ — ขัด Save-First) | บล็อค save ขัดหลัก Save-First, Validate-Later |
| Backend / Server / API | Web Worker / Pricing Engine | แอพไม่มี backend ทุกอย่างใน browser |
| Database | localStorage / Persist store | ไม่มี DB จริง |
| User account | (ไม่มี — single user) | แอพไม่เปิดให้คนอื่น |
| Sync / Cloud | (ไม่มี — device-local) | ข้อมูลอยู่อุปกรณ์เดียว |

---

## 7. การเพิ่มศัพท์ใหม่

ทุกครั้งที่จะใช้คำที่ยังไม่อยู่ในไฟล์นี้ ให้:
1. หยุด เสนอเพิ่ม term พร้อมนิยาม 1-2 ประโยค
2. รอ confirm ก่อนใช้คำนั้นในการ design / implement
3. ถ้าคำใหม่ทับซ้อนคำเดิม → ต้องเลือกตัวเดียว และย้าย anti-term เข้าตาราง §6

**ห้าม:** ใช้คำกำกวมแล้วค่อยอธิบายภายหลัง คำต้องนิยามก่อนใช้
