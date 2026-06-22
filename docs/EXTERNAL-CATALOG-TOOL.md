# 🔌 External Catalog Tool — สเปกสำหรับสร้าง (เครื่องมือป้อน DB + AI อ่าน LINE)

> **สถานะ:** ฝั่งแอปเสร็จแล้ว (read-only consumer ของ Firestore catalog — ดู [HANDOFF.md](../HANDOFF.md) §11.8).
> เอกสารนี้ = สเปกของ **อีกครึ่งระบบ** ที่ "เติม" DB นั้น — เป็นโปรเจกต์/เครื่องมือ **แยกนอก repo นี้**.
> อ่านจบลงมือสร้างได้เลย. คู่กับ contract: [`src/lib/catalog/contract.ts`](../src/lib/catalog/contract.ts).

## ภาพรวม

```
LINE (ข้อความ + รูปใบราคาผู้ผลิต)
   │  ดึงเข้า (LINE Messaging API / webhook / อัปโหลด/วางเอง)
   ▼
AI สังเคราะห์ (OCR รูป + แยกตาราง → rows มีโครงสร้าง)   ← Claude (latest) ผ่าน Anthropic API
   ▼
★ จุดพักข้อมูล (staging) — คน ตรวจ/แก้/เติมหน่วย·ผู้ผลิต·วันที่ / map → category id ที่ถูก / อนุมัติ
   │  validate ด้วย CatalogEntry schema ก่อน commit + กรอง "ใหม่/เปลี่ยน/ชน/ไม่ผ่าน"
   ▼
เขียน Firestore  shops/{uid}/catalog/{CODE}  (upsert ต่อ doc)
   ▼
แอป (มีอยู่แล้ว) ดึงมาอ่าน + คำนวณ margin
```

> ⚠️ อย่าแก้แอปให้เขียน catalog กลับ — แอป read-only โดยตั้งใจ (เจ้าของแก้ราคาทุน "ที่เครื่องมือนี้เท่านั้น";
> ค่าแรง/ค่าขนส่ง ยังแก้ในแอปที่ ProductionSettings).

## สัญญาที่ต้องเขียนให้ตรง (แอปอ่านตามนี้เป๊ะ)

**ที่อยู่:** `shops/{uid}/catalog/{DOC_ID}` — **1 doc ต่อ 1 SKU**
**DOC_ID = `code.trim().toUpperCase()`** (normalizeCode) · **doc body ต้องมี field `code` ด้วย** (ซ้ำกับ id)
**`uid`** = uid ของเจ้าของที่ล็อกอินแอป (ดู `shops/{shopId}` ใน [`firestore.rules`](../firestore.rules))

**โครง doc = `CatalogEntry`:**

| field | required | หมายเหตุ |
|---|---|---|
| `code` | ✅ | string ไม่ว่าง (unique ต่อ category) |
| `category` | ✅ | id ที่ถูกต้องเท่านั้น (ตารางล่าง) — ผิด = แอป **ข้าม doc เงียบ** + `console.warn` |
| `cost` | – | number ≥ 0 = ราคาทุน → คำนวณมาร์จิ้น (ไม่มี/0 → แอปขึ้น `'unknown'` เทา) |
| `sell_price` | – | number ≥ 0 = ราคาขายอ้างอิง (prefill ตอนเลือกรหัส) |
| `unit` | – | informational (ตารางล่าง / `CATALOG_UNITS`) |
| `brand` `model` `color` `variant` | – | SKU identity |
| `supplier` | – | provenance — แอปโชว์ "จาก {supplier}" |
| `captured_at` | – | provenance — แอปโชว์ "อัปเดต {captured_at}" (string; แนะนำ ISO; ใส่ตอนเขียน) |
| `note` | – | หมายเหตุ |

**category ids ที่ถูกต้อง + กลุ่ม/หน่วย** (จาก [`src/lib/vault.ts`](../src/lib/vault.ts) + [`src/config/enums.ts`](../src/config/enums.ts)):

| category id | กลุ่ม | หน่วยทุน |
|---|---|---|
| `curtain_main`, `curtain_sheer` | ผ้า | หลา (yard) |
| `wallpaper` | วอลเปเปอร์ | ม้วน (roll) |
| `roller_blind`, `wooden_blind`, `vertical_blind`, `aluminum_blind`, `partition` | พื้นที่ | ตร.ล. (sqyd) |
| `pleated_screen` | พื้นที่ | ตร.ม. (sqm) |
| `rail_wave`, `rail_pleated`, `rail_eyelet`, `rail_roman`, `rail_rod`, `rail_louis` | ราง/ฮาร์ดแวร์ | เมตร (meter) |

`CATALOG_UNITS` = `meter, set, sqm, sqyd, roll, piece, yard`.

## ส่วนที่ต้องสร้าง

1. **ตัวรับจาก LINE** — LINE OA + Messaging API webhook (รับรูป/ข้อความอัตโนมัติ) หรือเริ่มง่าย: อัปโหลดรูป/วางข้อความเอง.
2. **AI extraction** — รูปใบราคา + ข้อความ → rows (code/ราคา/หน่วย/ยี่ห้อ…). Anthropic API, Claude latest. อ่านสกิล `claude-api` ก่อนเขียนโค้ด LLM (model ids/params).
3. **จุดพักข้อมูล (staging UI)** — ตารางแก้ได้รองรับ **หลักร้อย–พันแถว + churn**: dropdown หมวด (15 ids) + หน่วย, validate ตาม schema, diff/merge เทียบของเดิม, กรองเฉพาะ delta (ใหม่/เปลี่ยน/ชน/ไม่ผ่าน), แสดง provenance.
4. **ตัวเขียน Firestore** — upsert `shops/{uid}/catalog/{normalizeCode(code)}` (set/merge), normalize key, stamp `captured_at`.

## Decisions ที่ต้องเคาะ

- **Auth/rules การเขียน catalog:** owner login เว็บแก้เอง → แก้ [`firestore.rules`](../firestore.rules) `match /catalog/{code}` จาก `allow write: if false` → `if isOwner(shopId)`; หรือ server/Admin SDK (service account) → คง `write:false` (bypass rules).
- **Tech stack** (เว็บแยก React+Firebase / Apps Script+Sheet / CLI) — เลือกตามที่ owner (non-dev) ใช้ง่าย.
- **ที่ AI ทำงาน** (serverless / เครื่อง dev) + การจัดการ API key (อย่าฝัง key ใน client).
- **identity/dedup ที่ scale** — ปัจจุบัน key = `code` ต่อ category; หลายผู้ผลิต code ซ้ำ → พิจารณา `supplier+code`.

## ของที่แอปทำเสร็จแล้ว (อย่าทำซ้ำ — อ้างอิงได้)

- อ่าน/cache: [`src/lib/sync/catalogSync.ts`](../src/lib/sync/catalogSync.ts) (`subscribeCatalog`, onSnapshot + validate ต่อ doc) → [`src/store/useCatalogStore.ts`](../src/store/useCatalogStore.ts) (transient)
- ใช้ทุน: [`CostEngine.ts`](../src/lib/pricing/CostEngine.ts), [`useInventory.ts`](../src/hooks/useInventory.ts), [`useActiveCostMaps.ts`](../src/hooks/useActiveCostMaps.ts) (catalog เมื่อ `status==='ready'`)
- rules + contract + เอกสาร: [`firestore.rules`](../firestore.rules), [`contract.ts`](../src/lib/catalog/contract.ts), [HANDOFF.md](../HANDOFF.md) §11.8
- คลังวัสดุ/ฟอร์ม = read-only product master แล้ว

## Verification (end-to-end เมื่อสร้างเสร็จ)

1. เครื่องมือเขียน 2–3 doc ทดสอบ (รวม supplier/captured_at + category ถูก) ลง `shops/{uid}/catalog`
2. เปิดแอป (`.env` Firebase ครบ) → CostEngine ใช้ทุนจาก catalog · คลังวัสดุโชว์ provenance · ตัดเน็ต = อ่าน cache ได้
3. เขียน doc category ผิด → แอปข้าม doc นั้น (ไม่พัง) + `console.warn`
4. scale: เขียน ~500–1000 doc → แอป fetch ไหว, localStorage แอปไม่โตตาม
