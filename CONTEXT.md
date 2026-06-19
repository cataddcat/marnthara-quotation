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
โหมดชั้นผ้าแบบมีทั้งผ้าทึบและผ้าโปร่ง การคำนวณต้นทุนต่างจาก SINGLE — ต้องคิด labor ผ้าโปร่งแยก และ brackets ของ
สูตรทั่วไป (ตาไก่) เพิ่ม 30% (ม่านลอนใช้จำนวนขาเท่าเดิม — ดู [[Brackets]])

### Style (รูปแบบจับจีบ)
ลักษณะการเย็บส่วนหัวของผ้าม่าน ค่าที่เป็นไปได้ (= labor key เป๊ะ): `ลอน`, `จีบ`, `ตาไก่`, `พับ`, `หลุยส์`, `แป๊บ`
(Style เป็น key ที่ใช้ลุก up labor cost โดยตรง — ต้องตรงกับ `laborCosts` ใน `CostDataSlice`; `ผ้าโปร่ง` เป็น labor
key แยกของโหมด DOUBLE ไม่ใช่ Style)

### ลอน
Style แบบลอน (wave) ใช้ wave tape เป็นอุปกรณ์เย็บหัว

### จีบ
Style แบบจับจีบ (pinch pleat) ใช้ตะขอ pin hook เป็นอุปกรณ์เย็บหัว

### ตาไก่
Style แบบรูตาไก่ (eyelet/grommet) ใช้ห่วงตาไก่ติดหัวผ้า

### พับ
Style ผ้าม่านแบบพับ/โรมัน (Roman shade) คิดค่าเย็บต่อเมตรราง ใช้ Roman set 1 ชุดต่อ 1 หน้าต่าง — "Roman"
ไม่ใช่ labor key แยก ม่านพับโรมันคิดต้นทุนผ่าน key `พับ`

### หลุยส์
Style ม่านหลุยส์ (ราง/กล่องเฉพาะ) ค่าเย็บสูงสุดในชุด style

### แป๊บ
Style ม่านแป๊บ (ราวสอด/ราวอลูมิเนียม) คิดค่าเย็บเท่าม่านทั่วไป

### Rail (ราง)
อุปกรณ์แขวนม่าน คิดตามความกว้าง × accessory cost ของ rail แต่ละชนิด rail แต่ละ style จับคู่กันผ่าน mapping ตายตัว

### Brackets
ขาแขวน rail จำนวนคิดจากความกว้าง สูตรขึ้นกับ style (ค่าคงที่อยู่ใน `FORMULAS.materials`):
- **ม่านลอน:** `⌈width / 0.6⌉` — DOUBLE ใช้จำนวนเท่าเดิม (ขา 2 ชั้น ไม่คูณเพิ่ม)
- **ม่านตาไก่ / สูตรทั่วไป:** `⌈width / 1.2⌉ + 1` — DOUBLE คูณ 1.3 (รับน้ำหนัก 2 ชั้น)
- **ม่านแป๊บ (rod):** จำนวนคงที่ 4 ขา/ชุด

---

## 2. Item & Project Domain

### Quotation (ใบเสนอราคา)
Output สูงสุดของแอพ ประกอบด้วย customer info + rooms + items + discount + VAT รวมเป็น PDF ส่งให้ลูกค้า

### Room
1 ห้องในใบเสนอราคา เก็บ items[] หลายชิ้น มี room-level defaults ของตัวเอง

### Item
ผ้าม่าน/วอลเปเปอร์/มู่ลี่/ฉากกั้น 1 ชิ้นในห้อง แต่ละ item มี `type` ที่กำหนดสูตรคำนวณ (discriminated union)

### Item Type
ประเภทของ item (9 ชนิดใน `ITEM_TYPES`): `curtains`, `wallpapers`, `roller-blinds`, `vertical-blinds`,
`wooden-blinds`, `aluminum-blinds`, `partition`, `pleated-screen`, `removal` — *(aluminum-blinds = stub: อยู่ใน
enum + เมนูแล้ว แต่ยังไม่มีฟอร์ม ดู HANDOFF §6)*

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
ลำดับ lookup ต้นทุน fabric: **Vault → Direct entry → Pro Mode → Missing flag** (ตกถึง flag เมื่อ 3 ตัวแรกไม่มีข้อมูล)
*(ลำดับเต็ม + จุดในโค้ด = เจ้าของที่ HANDOFF §1.2 / `CostEngine`)*

### Strategy (per-type pricing logic)
Pattern การคำนวณราคาแยกตาม item type — แต่ละ type มี Strategy ของตัวเอง เช่น `CurtainStrategy`, `WallpaperStrategy` ใช้ผ่าน PricingEngine

### Formula / Multiplier
ค่าคงที่ที่ใช้คูณในการคำนวณ เช่น `ลอน 2.7` หมายถึง ผ้า style ลอน ใช้ปริมาณผ้า = width × 2.7 — เป็น **compile-time
constant** ใน `src/config/formulas.ts` (แก้โดยแก้โค้ด ไม่ปรับใน UI); ดูค่าปัจจุบันแบบอ่านอย่างเดียวได้ที่ [[Formula Docs]]

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
หน้าตั้งต้นทุน **ค่าเย็บ (labor) + บริการ (service)** ของร้าน (2 แท็บ) เปิดผ่าน main menu — มี action "โหลดค่ามาตรฐาน
2025" + "ค่าตั้งต้นของฉัน". ต้นทุนสินค้า (ผ้า/พื้นที่/ราง) อยู่ที่ [[คลังวัสดุ]] คนละหน้า — อย่ารวมสองหน้านี้.
ระบบมีถังต้นทุนทั้งหมด **7 ถัง** (รายชื่อ+ใครแก้ = เจ้าของที่ HANDOFF §11.2)

### Financial Dashboard
หน้าวิเคราะห์ P&L รายไอเท็ม sort ลำดับจากแย่สุด → ดีสุด (loss → warning → unknown → profit) มีแถบ cost structure (ผ้า/labor/rail+อุปกรณ์)

### Material Summary / คลังวัสดุ (BOM + catalog)
สรุปวัสดุที่ต้องซื้อจริง แยก 3 แท็บ ผ้า/ราง/อุปกรณ์ มีปุ่ม copy เป็น text shopping list — **และเป็นหน้าแก้ต้นทุนสินค้า
(catalog)** ของถัง fabric/area/hardware (import catalog หรือกรอกเอง); UI ใช้ชื่อ "คลังวัสดุ"

### Formula Docs
หน้า **อ่านอย่างเดียว** แสดง multiplier/offset ปัจจุบัน (ลอน 2.7, จีบ 2.7, Roman offset 0.45m, hem 0.30m,
yard_conversion 1.11) เปิดผ่าน main menu *(เดิมคือ "Formula Studio" ที่แก้ค่าได้ — ถูกลบ 2026-05 พร้อม `FormulaSlice`;
สูตรย้ายเป็น compile-time `src/config/formulas.ts`)*

### Lookbook
ชีตสรุปงานขนาด A4 (จัดหน้าแบบจัดกลุ่มตามห้อง) แสดง "รูปวาดสินค้าตามสัดส่วนจริง" ที่สื่อชนิด/ทิศการเปิด/ด้านเชือก พร้อมรายละเอียดผ้า-รหัส-ขนาด ใช้ตรวจหน้างานและส่งช่าง เอ็กซ์พอร์ตเป็น PDF หรือ PNG (หลายหน้า = ไฟล์ .zip) กรองตามประเภทสินค้าได้ ไม่เกี่ยวกับ pricing

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
| Formula Studio | [[Formula Docs]] (อ่านอย่างเดียว) / `formulas.ts` | ฟีเจอร์แก้สูตรใน UI ถูกลบ 2026-05 สูตรเป็น compile-time |
| custom backend / API ของเรา | Web Worker / Pricing Engine (ในแอป) · Firebase/Firestore (BaaS) | ไม่มี server ของเราเอง; Firebase = managed BaaS |

### 6.1 คำที่เคยเป็น non-goal — ตอนนี้ใช้ได้ (ระบุให้แม่น)
*(พลิก non-goal 2026-06-14 — ดู [[Sync]] §8 + HANDOFF §12; ห้ามพูดลอย ๆ ว่า "ไม่มี")*

| คำ | ใช้ยังไง |
|---|---|
| Sync / Cloud | "cloud sync (Firestore, optional)" — ระบุว่าเลือกได้ ไม่บังคับ; ถ้าไม่ตั้งค่า = local-only |
| User account | "บัญชีร้าน (shop account, optional)" — email/password เปิด sync |
| Database | localStorage (local) / Firestore (cloud, optional) — ไม่มี custom DB server |

---

## 7. การเพิ่มศัพท์ใหม่

ทุกครั้งที่จะใช้คำที่ยังไม่อยู่ในไฟล์นี้ ให้:
1. หยุด เสนอเพิ่ม term พร้อมนิยาม 1-2 ประโยค
2. รอ confirm ก่อนใช้คำนั้นในการ design / implement
3. ถ้าคำใหม่ทับซ้อนคำเดิม → ต้องเลือกตัวเดียว และย้าย anti-term เข้าตาราง §6

**ห้าม:** ใช้คำกำกวมแล้วค่อยอธิบายภายหลัง คำต้องนิยามก่อนใช้

---

## 8. Multi-Job, Sync & Team (2026-06 — รายละเอียดเทคนิคใน HANDOFF §12)

### Job (งาน)
หนึ่งงานของลูกค้าหนึ่งราย = ห้อง+รายการ+ส่วนลด+ใบเสร็จ+ค่าใช้จ่าย+สถานะ. แอปเปิดทำงานทีละงาน ("live working copy")

### JobBundle (งานหนึ่งก้อน)
รูปแบบข้อมูลของ 1 งานที่ยกไปมาได้ `{ customer, rooms, discount, receipts, expenses } + status/timestamps`. **id งาน
= customer.id (UUID) = key ใน Firestore = id ในไฟล์ export** (1 งาน = 1 UUID)

### สลับงาน (Job switch / checkout)
การเก็บงานปัจจุบันเข้าชั้นวาง (`jobs[]`) แล้วเปิดอีกงานขึ้นมาแก้ — เหมือน checkout ทีละงาน; สลับงานจะล้าง undo history (กัน undo ข้ามงาน)

### ทะเบียนลูกค้า (Customer Registry)
ฐานลูกค้าระดับร้าน (`customerRegistry[]`) แยกจากตัวงาน — เปิดงานใหม่ให้ลูกค้าเดิมได้; join กับงานผ่าน `customer.code`

### Sync (cloud sync)
การซิงค์งาน+ลูกค้า+ราคา/ต้นทุน ขึ้น Firestore ต่อบัญชีร้าน (`shops/{uid}`) ข้ามอุปกรณ์ — **optional + offline-first**
(ไม่ตั้งค่า Firebase = local-only). ระดับ doc = last-write-wins

### Conflict guard
กลไกกันงานทับกันเมื่อหลายอุปกรณ์แก้งานเดียวกัน: ถ้า cloud ใหม่กว่า base + เครื่องนี้ค้างแก้ (dirty) → ขึ้น
`ConflictBanner` ให้เลือก [โหลดล่าสุด]/[เก็บของฉัน] (อีกเวอร์ชันเก็บเป็นสำเนาเสมอ ไม่มีงานหายเงียบ)

### บทบาท admin / พนักงาน (Role)
การ์ดกันงานพังบน **บัญชีร้านร่วมกัน** — admin ปลดล็อกด้วย PIN; พนักงาน (staff) ถูกกันจากงานเสี่ยง (ลบงาน/ลบลูกค้า/
ล้างเครื่อง/เมนูต้นทุน). เป็น **client-side guard กันพลาด ไม่ใช่ access control จริง** (ดู [[AdminGate]])

### AdminGate
primitive ที่ซ่อน/ล็อก action ให้เฉพาะ admin (ลอกแบบ ModeGate) — action ที่ล็อกจะเด้ง PIN ก่อนทำ

### Pricing bundle (ความรู้ราคาทั้งร้าน)
ชุด `favorites` + 7 ถังต้นทุน + `costInclude` ที่ sync เป็น **ชุดเดียวของร้าน** (ไม่ใช่ต่องาน) ให้ทุกเครื่องราคาตรงกัน

### Theme (ธีม)
ชุดสี/พื้นผิวเพื่อ **readability** (ไม่ใช่ cosmetic) — `Light` · `Signature` (IBM Plex Sans Thai) · `EEERT` (pilot
ตัวเลขสีตามชนิด — ดู DESIGN §2). ธีมเพื่ออ่านง่ายขึ้นสำหรับสายตาสูงวัย ถือว่าผ่าน QOL (ต่างจาก theme switcher cosmetic)
