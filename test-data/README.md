# Demo Data Suite — สำหรับทดสอบ Marnthara Smart Quotation

ไฟล์ JSON ในโฟลเดอร์นี้ใช้สำหรับ **import เข้าแอพ** เพื่อทดสอบ feature ทั้งระบบ ครอบทุก case ตั้งแต่ happy path ไปจนถึง edge cases

## วิธีใช้

1. เปิดแอพที่ deploy แล้ว (หรือ `npm run dev` แล้วเปิด localhost:3000)
2. กดปุ่ม **เมนูหลัก** (☰) ที่ header
3. เลือก **"จัดการข้อมูล"** (Database icon)
4. กดปุ่ม **"Upload File"** → เลือกไฟล์ JSON
5. รอ toast "นำเข้าข้อมูลสำเร็จ" → modal จะปิดเอง
6. ตรวจสอบตาม checklist ด้านล่าง

## ไฟล์ในโฟลเดอร์

| ไฟล์ | ขนาด | ใช้ทำอะไร |
|---|---|---|
| `demo-full-coverage.json` | ใหญ่สุด | **ใช้เป็นหลัก** — ครอบทุก feature, edge case ครบ |
| `demo-favorites-only.json` | กลาง | ทดสอบ import เฉพาะ Vault (คลังผ้า) ไม่กระทบข้อมูลเดิม |
| `demo-costs-only.json` | กลาง | ทดสอบ import เฉพาะ production costs (laborCosts, fabricCosts) |
| `demo-minimal.json` | เล็ก | เริ่มงานใหม่จาก scratch — ลูกค้าว่าง + 1 ห้องว่าง |

## Coverage Matrix — `demo-full-coverage.json`

ไฟล์หลักครอบ feature ทุก case ที่ระบบรองรับ:

### 👤 Customer
- ✅ ชื่อ/โทร/ที่อยู่ครบ
- ✅ taxId กรอกแล้ว
- ✅ `useSameAddress: false` + แสดง installation address แยก

### 🏪 Shop Config
- ✅ ข้อมูลร้านครบ
- ✅ `baseVatRate: 7` (ตาม Thai VAT)
- ✅ Bank account `isEnabled: true` พร้อม branch
- ✅ PDF terms + 3 notes

### 💰 Discount
- ✅ `type: percent`, `value: 5`, `is_enabled: true`

### 🧵 Curtain — 4 cases ใน room-1
| Item | Style | Layer | ทดสอบอะไร |
|---|---|---|---|
| 1-1 | ลอน 14.5 | DOUBLE | ทึบ+โปร่ง + labor `'ผ้าโปร่ง'` คิดแยก |
| 1-2 | จีบ | SINGLE | Pro Mode `_cost_fabric: 1200` override |
| 1-3 | ตาไก่ | SINGLE | `enable_set_price: true`, override 8,500 |
| 1-4 | ลอน 16 | SINGLE | code `UNKNOWN-CODE` → **"ไม่ทราบทุน"** สีเทา |

### 🧵 Curtain (เพิ่ม) — room-2
| Item | Style | ทดสอบ |
|---|---|---|
| 2-1 | ตาไก่ | chain_position right + eyelet_color ทอง |
| 2-2 | พับ (Roman) | สูตร additive (width × multiplier + offset) |

### 📜 Wallpaper — 2 cases
| Item | ทดสอบ |
|---|---|
| 2-3 | 3 ผนัง (widths array), height 2.9m |
| 2-4 | height **10.5m** > roll_length 10m → **warning** "height_exceeds_roll" |

### 📐 Area Items — room-3 ครบทุก 6 type
- ✅ wooden_blind, roller_blind, vertical_blind, aluminum_blind
- ✅ partition, pleated_screen
- ✅ มีทั้ง adjustment_side, fabric_variant, opening_style

### 🛠️ Removal — room-3 item-7
- ✅ quantity 3 × price_per_item 500 = 1,500 บาท

### 🚫 Suspension test
| Room | Suspended | ทดสอบ |
|---|---|---|
| room-suspended | ✅ ทั้งห้อง | item ใน room นี้ **ไม่ขึ้น** ใน Financial Dashboard |
| room-with-suspended-item | ❌ | มี item `is_suspended: true` 1 ตัว → **ไม่ขึ้น** ส่วน active ขึ้นปกติ |

### 📚 Favorites — ครอบทุก 9 categories
ทุก fabric/wallpaper/area code ใน items มีอยู่ใน favorites + cost_per_yard → ทดสอบ auto-sync เข้า fabricCosts/wallpaperCosts/areaCosts ตอน import

### 💵 Production Costs — ครบหมด
- ✅ Labor: ลอน, จีบ, ตาไก่, พับ (unit `sqm`!), หลุยส์, แป๊บ, **ผ้าโปร่ง**
- ✅ Accessory: rail ทุกแบบ + eyelet_ring + tape_wave + install + transport
- ✅ Fabric/Wallpaper/Area Costs ครบทุก code ที่ items อ้างถึง (ยกเว้น UNKNOWN-CODE)

---

## ✅ Checklist หลัง Import `demo-full-coverage.json`

### หน้าหลัก
- [ ] เห็น 5 rooms (รวม "ห้องเก็บของ" ที่เป็นสีจาง suspended)
- [ ] กดเข้าแต่ละห้องเห็น items ครบตามตาราง coverage
- [ ] item ใน "ห้องน้ำ" ที่ suspended เป็นสีจาง

### Financial Dashboard (เมนูหลัก → Financial Health)
- [ ] **Ring** แสดง margin % รวม
- [ ] Items list **ไม่มี** ห้อง suspended (room-suspended) และ **ไม่มี** item ที่ suspended
- [ ] Item 1-4 (code UNKNOWN-CODE) สถานะ **"ไม่ทราบทุน"** (badge สีเทา)
- [ ] Item 1-1 (DOUBLE) เปิดดู expanded — เห็นทั้งผ้าทึบ + ผ้าโปร่ง + labor 'ผ้าโปร่ง'
- [ ] Item 2-4 (wallpaper height 10.5m) แสดง warning banner สีเหลือง (ถ้ามี UI implement แล้ว — ตามที่ PR8 emit warning)
- [ ] กดรหัสผ้า → เปิด MaterialSummary modal prefill

### Material Summary
- [ ] tab "ผ้า" แสดงรหัสที่ใช้ + ปริมาณรวม
- [ ] tab "ราง" แสดง bracket counts + rail meters
- [ ] tab "อุปกรณ์" แสดง eyelet rings, pin hooks, wave tape ตามสูตรใน FormulaDocsModal

### PDF Export
- [ ] กด **เมนูหลัก → PDF Preview** เห็น layout ถูก
- [ ] Customer + Shop info ครบ
- [ ] Items list ตาม rooms (suspended ไม่ขึ้น)
- [ ] Discount **5%** หักจาก grand total
- [ ] VAT **7%** บวกเพิ่ม
- [ ] Bank account แสดง (เพราะ `isEnabled: true`)

### อธิบายสูตร
- [ ] กด **เมนูหลัก → อธิบายสูตร** เห็นเอกสารครบ
- [ ] ค่าใน docs ตรงกับสูตรที่คำนวณจริง (เช่น hem_offset 0.30, yard_conversion 0.90)

### Vault / คลังผ้า
- [ ] เปิด Vault จากใน MaterialSummary
- [ ] เห็นรหัสครบทั้ง 9 categories
- [ ] ราคา + cost ตรงกับ JSON

---

## Validation Script

มี automated test ตรวจ shape ของไฟล์เหล่านี้อยู่ที่ `src/test/test-data-fixtures.test.ts`
รันอัตโนมัติพร้อม test ทั้งหมด:

```powershell
npm run test:run
```

หรือรันเฉพาะชุดนี้:

```powershell
npm run test:run -- test-data-fixtures
```

หาก refactor schema (เปลี่ยน/ลบฟิลด์, เพิ่ม item type, ย้าย cost vault) แล้วลืมอัปเดตไฟล์ตัวอย่าง → test จะ fail ทันที

---

## ตัวอย่างการใช้งานในขั้นตอน workflow

**Scenario 1: ทดสอบ Financial Dashboard regression หลัง refactor**
1. Import `demo-full-coverage.json`
2. เปิด Financial Dashboard
3. ดู margin/cost ของ item 1-1 (DOUBLE curtain) เทียบกับค่าก่อน refactor
4. ค่าควรเท่าเดิม → refactor ไม่ break

**Scenario 2: ทดสอบ wallpaper warning**
1. Import `demo-full-coverage.json`
2. เปิด Financial Dashboard
3. หา item 2-4 (height 10.5m) → ควรเห็น warning banner

**Scenario 3: ทดสอบ Vault auto-sync (cost_per_yard → vault)**
1. Reset แอพ → state ว่าง
2. เปิด "จัดการข้อมูล" → ส่วน "นำเข้าข้อมูลเฉพาะส่วน" → แท็บ **"คลังผ้า"** → วางเนื้อหา `favorites` จาก `demo-favorites-only.json` (หรือใช้ `mtr-test-favorites-import.json` ที่เป็น category map ตรงๆ)
3. ตรวจว่า cost_per_yard ถูก route ไป fabricCosts/wallpaperCosts/areaCosts อัตโนมัติ แล้ว strip ออกจาก favorites
   > ⚠️ การ Import ผ่านปุ่ม **Upload File** (restore ทั้งไฟล์) จะ **ไม่** route cost_per_yard เข้า vault — ใช้แท็บ "คลังผ้า" สำหรับ auto-sync นี้

**Scenario 4: ทดสอบ Cost Vault import**
1. Import `demo-costs-only.json`
2. เปิด Cost Vault (Production Settings) → เห็น labor + accessory ครบ
3. รัน Financial Dashboard → คำนวณ cost ได้ปกติ
