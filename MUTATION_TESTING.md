# Mutation Testing (Stryker)

ทดสอบ "คุณภาพของเทสต์" — Stryker แก้โค้ด (mutants) ทีละจุดแล้วดูว่าเทสต์จับได้ไหม
ถ้า mutant รอด (survived) = มีเทสต์ที่รันผ่านโดยไม่ได้ verify behavior นั้นจริง

## วิธีรัน (on-demand)

```powershell
npm run test:mutation        # = stryker run
# รายงาน HTML: stryker-report/index.html (อยู่ใน .gitignore)
```

## ขอบเขต (`stryker.config.json`)

mutate เฉพาะ **pricing core** ที่เป็น pure logic + มีเทสต์หนาแน่น:

- `src/lib/pricing/CostEngine.ts`, `PricingEngine.ts`
- `src/features/**/logic/*Strategy.ts` (curtain / wallpaper / area / removal)

## ⚠️ ทำไมไม่อยู่ใน CI (required gate)

รันเต็ม pricing core ใช้เวลา **~30 นาที+** บนเครื่อง dev เพราะ property tests
(`*.properties.test.ts`, `numRuns=100`) ครอบ pricing → ถูกรันซ้ำต่อ mutant
จึงเก็บเป็น **on-demand quality check** ไม่ผูกใน `.github/workflows/test.yml`
(สอดคล้องกับหัวข้อ Risks: "GitHub Actions cost") ถ้าต้องการใส่ CI แนะนำ
schedule (nightly / weekly) หรือ workflow_dispatch แยก + ตัด property tests ออกชั่วคราว

`thresholds.break` ตั้งเป็น `null` (ไม่ทำให้ run fail) — ใช้เป็นสัญญาณคุณภาพ
high=80 / low=60 สำหรับ color-coding ในรายงาน เป้าหมายระยะยาว ≥ 80% บน pricing core

## ผลอ้างอิง (validation)

`RemovalStrategy.ts` (ไฟล์เดียว) = **66%** (33 killed / 17 survived) ใน ~4 นาที
survivors ส่วนใหญ่อยู่ใน `getSpecs` (string-building ที่เทสต์ยังไม่ได้ assert เนื้อหา)
→ จุดที่ควรเสริมเทสต์เพื่อดันคะแนนขึ้น
