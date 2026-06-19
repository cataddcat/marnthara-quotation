# PRINCIPLES.md — Marnthara Smart Quotation Product Principles

> หลักการตัดสินใจระดับ product สำหรับแอพนี้ ทุก feature ใหม่ต้องผ่าน **QOL Decision Test** ใน §4 ก่อน ถ้าไม่ผ่าน — ปฏิเสธหรือคิดใหม่ ไม่ว่าจะมาจากไหน
>
> **บทบาทของไฟล์นี้:** เกณฑ์ตัดสินใจระดับ product ใช้คู่กับ [CONTEXT.md](./CONTEXT.md) (glossary) และ [HANDOFF.md](./HANDOFF.md) (technical handoff) ห้ามใส่ technical detail ในไฟล์นี้

---

## 1. Persona — เจ้าของร้านม่าน 1 คน

แอพนี้มีผู้ใช้คนเดียว: **เจ้าของร้าน**

- ใช้คนเดียวเป็นหลัก (เจ้าของร้าน = ผู้ใช้) — ถ้ามีทีมช่วยงานจะ **แชร์บัญชีร้านเดียวกัน** + การ์ดบทบาท (ดู §2.1); ลูกค้าไม่เข้าถึงระบบ (เห็นแค่ PDF)
- ทำงาน **2 บริบท** สลับกันทุกวัน:
  - **บนหน้างาน** (มือถือ) — วัดขนาด ถ่ายรูป กรอกข้อมูลเบื้องต้น
  - **ในร้าน** (แท็บเล็ต/คอม) — สรุปใบเสนอราคา ตรวจสอบ margin คุยกับลูกค้า
- ความรู้ technology ระดับ "ใช้แอพได้ดีในชีวิตประจำวัน" ไม่ใช่ developer ไม่อ่าน manual
- เครียดเรื่อง **การคำนวณราคาผิด** เพราะ:
  - แต่ละชิ้นกำไรต่างกันมาก
  - ผ้าทึบ + ผ้าโปร่ง (DOUBLE) ลืมคิด labor ผ้าโปร่ง = ขายขาดทุนโดยไม่รู้
  - ราคาผ้า/labor เปลี่ยนตามช่วง ตามผู้ผลิต
- ต้องการ **ความเร็ว** และ **ความถูกต้อง** มากกว่า **ฟีเจอร์เยอะ**

> ทุก decision ในแอพถาม persona นี้ก่อน ไม่ใช่ "users in general"

---

## 2. หลักการ 5 ข้อ (Non-Negotiable)

### 2.1 Internal tool — ร้านเดียว (บัญชีร่วมแบบเลือกได้)

แอพเป็นเครื่องมือภายในของร้านเดียว ไม่ใช่ SaaS หลายร้าน และไม่เปิดให้ลูกค้าเข้าระบบ ดังนั้น **ไม่มีและจะไม่มี:**

- ❌ Public sign-up / self-service onboarding หลายร้าน (multi-tenant SaaS)
- ❌ Customer-facing access — ลูกค้าเห็นแค่ PDF (ดู §2.5)
- ❌ Rate limiting
- ❌ Server-side RBAC / attribute-based access control **จริง**
- ❌ Analytics / audit logs / activity feed

**แต่ตั้งแต่ 2026-06-14 (พลิก non-goal เดิม — ดู §3 + HANDOFF §12):** มี **บัญชีร้าน (email/password) แบบเลือกได้**
เพื่อเปิด cloud sync ข้ามอุปกรณ์ และ **การ์ดบทบาท admin/พนักงานแบบ client-side** สำหรับทีมที่ใช้บัญชีร้านร่วมกัน —
เป็น *guard กันพลาด ไม่ใช่ access control จริง* (บัญชีร่วม = แยกสิทธิ์ระดับ server ไม่ได้; ดู HANDOFF §12.8)

**ผลที่ตามมา (privacy):** **Local-first เสมอ** — ถ้าไม่ตั้งค่า Firebase ข้อมูลอยู่ใน localStorage ของอุปกรณ์นั้น
เครื่องเดียวเหมือนเดิม (privacy boundary = device boundary). ถ้าเปิด sync ข้อมูลจะอยู่ใน Firestore แยกตามบัญชี
(`uid == shopId`) ด้วย ใครเข้าถึงอุปกรณ์/บัญชีได้ก็เข้าถึงข้อมูลได้ — ยอมรับ trade-off นี้ ไม่ over-engineer

### 2.2 ยึดหลัก QOL (Quality of Life)

ทุก feature ต้องลด **อย่างน้อย 1 ใน 3** ของผู้ใช้:

| สิ่งที่ลด | วัดด้วย |
|---|---|
| **เวลา** | จำนวนคลิก / จำนวนวินาทีต่อ task |
| **Cognitive load** | จำนวน decision ที่ผู้ใช้ต้องตัดสินใจต่อ task |
| **โอกาสผิด** | จำนวน bug class ที่กำจัดได้ |

**กฏ:** ถ้าวัดไม่ได้เป็นตัวเลข → ไม่ทำ ห้ามใส่ feature เพราะ "น่าจะดี"

**ตัวอย่างผ่าน QOL:**
- Auto-save on blur (-1 คลิก "Save" ทุกครั้ง × หลายร้อยครั้งต่อใบเสนอราคา)
- Code Jump (ลด context switch ระหว่าง Dashboard ↔ Vault)
- Material Summary copy-to-clipboard (-3 นาทีต่อใบสั่งของ)

**ตัวอย่างไม่ผ่าน QOL:**
- เพิ่ม theme switcher แบบ cosmetic (สวย/ตามใจ) — ไม่ลด time/load/error *(ต่างจาก theme เพื่อ readability เช่น
  คอนทราสต์สูงสำหรับสายตาสูงวัย — Light/Signature/EEERT, DESIGN §2 — ที่ลด error/load จริง อันนั้นผ่าน)*
- เพิ่ม animation transitions (เพิ่ม time)
- เพิ่ม sortable column ทุก field (เพิ่ม decision)

### 2.3 หลังบ้านซับซ้อนได้ หน้าบ้านต้องง่าย

**เก็บความซับซ้อนใน infrastructure ได้เต็มที่:**
- PricingEngine / CostEngine ใช้ Strategy pattern + Priority Chain
- Web Worker สำหรับ async calculation
- Formula multipliers ปรับได้ละเอียด
- Discriminated union types

**แต่ UI ต้องตอบ:**
- เห็นปุ๊บ รู้ปั๊บ ทำได้ทันที
- ไม่มี modal ซ้อน modal ซ้อน modal เกิน 2 ชั้น
- ไม่มี feature ที่ต้องอ่าน tooltip หรือ help ก่อนใช้
- Smart Defaults เสมอ ผู้ใช้ override ภายหลังได้

### 2.4 Cross-Device (Mobile-First)

- **Mobile-first** มือถือเป็นอุปกรณ์หลัก แท็บเล็ต/คอมรอง
- **Responsive** ใช้ได้ดีตั้งแต่ 360px → 1920px
- **PWA** install ได้ทุก platform (iOS/Android/Desktop)
- **Offline-First** ทุกฟังก์ชันทำงานไม่ต้องมี internet — service worker cache assets

**ผลที่ตามมา:** ห้ามออกแบบ feature ที่ require ขนาดจอใหญ่ ห้ามใช้ network call ใน critical path

### 2.5 เจ้าของร้านคือผู้ใช้ ไม่ใช่ลูกค้า

- UI ออกแบบสำหรับ shop-owner workflow ไม่ใช่ end-customer
- **เปิดเผยต้นทุน, กำไร, margin** เต็มที่ — Financial Dashboard แสดง P&L ชัดเจน
- ไม่ต้องซ่อน internal terms (รหัสผ้า, labor key, formula)
- **ใบเสนอราคาที่ลูกค้าเห็น** = output PDF เท่านั้น ไม่ใช่ UI

---

## 3. Non-Goals (สิ่งที่ตั้งใจ "ไม่ทำ")

ถ้าไอเดียตรงลิสต์นี้ — ปฏิเสธทันที ไม่ต้อง debate:

- ✅ **Cloud sync / multi-device sync** *(2026-06-14: กลับมาทำแล้ว — Firebase/Firestore)* — งาน+ลูกค้า sync ข้ามอุปกรณ์ด้วยบัญชีร้านเดียว (offline-first, SDK cache). ดู HANDOFF §12. **ยังคง local-first:** ถ้าไม่ตั้งค่า Firebase แอปทำงาน local-only เหมือนเดิม
- ❌ **Real-time collaboration** — single-shop owner; ยังไม่ทำ multi-staff/locking (sync = last-write-wins ระดับ doc)
- ✅ **User accounts / login** *(2026-06-14)* — บัญชีร้าน (email/password) เปิด cloud sync; ไม่บังคับถ้าใช้ local-only
- ❌ **Customer-facing portal** — ลูกค้าเห็นแค่ PDF ที่ส่งให้
- ❌ **Analytics / telemetry / tracking** — ไม่มีคนเก็บข้อมูล privacy issue สำหรับ user คนเดียว
- ❌ **Billing / payment / e-commerce** — เก็บเงินนอกแอพ
- ❌ **AI-generated quotations** — ราคาต้องคำนวณจากสูตรที่ตรวจสอบได้ AI ใช้ช่วยกรอกข้อมูลได้แต่ไม่ใช่ตัดสินราคา
- ❌ **Backend server / API / database** — ทุกอย่างใน browser ใช้ localStorage
- ❌ **Native mobile app (iOS/Android)** — PWA ครอบคลุมพอ ไม่ทำซ้ำ
- ❌ **Notification / reminder** — แอพไม่ run background
- ❌ **Internationalization (i18n)** — ภาษาไทยอย่างเดียว เจ้าของร้านอยู่ไทย
- ❌ **Full a11y / screen-reader / ARIA / keyboard-only** — internal single-user tool; ทำแค่ contrast (DESIGN §2 WCAG AA→AAA) + touch ≥ 44 + focus-visible/2.4.11 (DESIGN §3) ตามภารกิจ readability; ไม่ลงทุน SR/ARIA เต็มรูปจนกว่าจะมี requirement จริง (เจ้าของไม่ได้ใช้ screen reader)

---

## 4. QOL Decision Test

ก่อน implement feature ใหม่ ตอบ **ครบทุกข้อ** ถ้ามีข้อใดไม่ผ่าน → คิดใหม่:

1. **ลดเวลา / คลิก / cognitive load ตรงไหน?**
   - ต้องวัดเป็นตัวเลขได้ ไม่ใช่ "น่าจะ" หรือ "ดูดี"

2. **เจ้าของร้าน 1 คนใช้คนเดียว — feature นี้เปิดให้คนอื่นใช้ไหม?**
   - ถ้าใช่ → refer Non-Goal ใน §3

3. **ใช้ได้ทั้งมือถือและคอมไหม?**
   - ถ้าออกแบบเฉพาะ desktop หรือเฉพาะมือถือ → ปฏิเสธ

4. **ไม่มี internet ยังใช้ feature นี้ได้ไหม?**
   - ถ้าไม่ได้ → ต้อง flag ชัด มี fallback หรือ degraded mode

5. **มี Pro Mode override ไหม?**
   - ข้อมูลจริงเปลี่ยนได้เสมอ (ราคาขึ้น/ลง สูตรพิเศษ) — user ต้อง override ได้

6. **คำใน CONTEXT.md ครอบคลุม feature นี้ไหม?**
   - ถ้าไม่ → เพิ่ม term ใน CONTEXT.md ก่อน implement

7. **Decision นี้ hard to reverse ไหม?**
   - ถ้าใช่ + surprising + real trade-off → เขียน ADR ก่อน implement
   - ถ้าไม่ → ทำได้เลย ไม่ต้อง over-document

---

## 5. Working Style with AI

เวลาคุยกับ AI assistant (Claude / Copilot / etc.) ให้ทำตามนี้:

- **Challenge ภาษากำกวม** — ถ้า user หรือ AI ใช้คำที่ไม่ตรง [CONTEXT.md](./CONTEXT.md) ให้ถามกลับทันที *"คุณหมายถึง 'ผ้าโปร่ง' (sheer) หรือ 'ผ้าซับใน' ที่ไม่ใช่คำในระบบนี้?"*

- **Cite term จาก CONTEXT.md เสมอ** — เวลา AI propose feature ให้อ้างศัพท์ที่ exact ไม่พูดคลุมเครือ

- **Refer หลักการนี้ก่อนตอบ** — ถ้า user ขอ feature ที่ขัด Non-Goals ใน §3 AI ต้องปฏิเสธ พร้อมอ้างข้อ Non-Goal

- **ไม่ batch decisions** — ตอบ design question ทีละข้อ รอ user อ่านก่อนตอบข้อถัดไป ไม่รวบยอดเสนอเป็นแพ็คเกจ

- **Grill ทุกข้อสมมุติฐาน** — เวลา user บอก "อยากได้ X" ให้ถามกลับ "X นี้ผ่าน QOL Test ข้อไหน?"

- **อย่ายอมรับ "สำหรับอนาคต"** — feature flag, abstraction layer, plugin system ที่สร้างเผื่ออนาคต → ปฏิเสธ ทำเมื่อมี requirement จริง

---

## 6. การเปลี่ยนแปลงไฟล์นี้

ไฟล์นี้คือ source of truth ของ product direction ไม่ควรเปลี่ยนบ่อย แต่ถ้าจะเปลี่ยน:

- **เพิ่ม Non-Goal:** ต้องระบุ trade-off ที่เสียไปด้วย
- **ลด Non-Goal:** ต้องระบุ requirement ที่บังคับให้เปลี่ยน (เช่น ขยายทีม → ต้อง user auth)
- **เปลี่ยน Persona:** ต้องเขียน ADR เพราะกระทบทุก feature
- **เปลี่ยน QOL Test:** ต้องเขียน ADR เพราะกระทบ decision framework

> ปรับ tactical (เปลี่ยนตัวอย่างใน §4, แก้ wording) ทำได้ตามปกติ
