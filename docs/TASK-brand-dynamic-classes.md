# 🧪 TASK — แก้คลาส brand แบบ dynamic ใน theme-utils ที่ Tailwind ไม่ render

> ใบสั่งงานสำหรับ session ใหม่. สร้างจากการดีบั๊กชิปชนิดสินค้าใน ItemCard (2026-06-20).
> อ้างอิง memory `tailwind-dynamic-class-gotcha`.

## 🎯 ปัญหา (ยืนยันแล้ว)
`src/lib/theme-utils.ts` → `createSemanticTheme(brandVar)` สร้างคลาส Tailwind จาก **template literal**:
```ts
text:  `text-[hsl(var(${brandVar}))]`,
badge: `bg-[hsl(var(${brandVar})_/_0.1)] text-[hsl(var(${brandVar}))]`,
icon:  `text-[hsl(var(${brandVar}))]`,
// + container / iconWrapper / hover / bgSoft / border / ring
```
`${brandVar}` ทำให้ string ไม่เคยปรากฏเป็น "คลาสเต็ม" ในซอร์ส → **Tailwind v4 scanner มองไม่เห็น → ไม่ generate CSS
→ สี/พื้น brand ไม่ขึ้น** (อาการเดียวกับที่ ItemCard type chip เจอ: ปรับ opacity เท่าไหร่พื้นก็ไม่ขึ้น).

**ยืนยัน:** เปลี่ยน ItemCard chip ไปใช้ `@theme` static utility (`bg-brand-curtain/25`, ดู `TYPE_CHIP_PLATE`
ใน `src/components/features/ItemCard.tsx`) แล้ว **render จริง** — ส่วน dynamic ตัวเดิมไม่ขึ้น.

## 🔎 ขอบเขต (ตรวจแล้ว — ยืนยันซ้ำตอนทำ)
ผู้ใช้จริงตอนนี้ = **6 ฟอร์ม** ใช้ `theme.text` (เป็น `valueClass`) + `theme.icon` (เป็น `iconClass`):
- `src/features/{wooden-blinds,roller-blinds,vertical-blinds,wallpapers,partition,pleated-screen}/components/*Form.tsx`
- ตัวรับ: `src/components/ui/FormSection.tsx` (iconClass/valueClass)
- ภายใน theme-utils เอง: บรรทัด ~73 (`segmentedItemClass`) ใช้ `theme.text`

token อื่น (`badge/container/iconWrapper/hover/bgSoft/border/ring`) นิยามไว้แต่ **เช็คว่ายังมีที่ใช้ไหม** —
ถ้าไม่มี อาจลบทิ้งได้ (ItemCard ซึ่งเคยใช้ `badge`/`border` ถูกย้ายไป static แล้ว).

## 🛠️ ทางแก้ (เลือก 1)
**A. แนะนำ — static map ต่อชนิด (ตามแพทเทิร์น `TYPE_CHIP_PLATE`)**
สร้าง map `ITEM_TYPES → 'text-brand-<name>'` / `'bg-brand-<name>/NN'` เป็น **string literal static** (Tailwind สแกนเจอ)
โดยใช้สี `@theme` ที่ลงทะเบียนแล้ว (`--color-brand-*` ใน `src/index.css`, ~บรรทัด 170-178: curtain/wallpaper/
wood/roller/vertical/alum/partition/screen/removal). แทน `theme.text`/`theme.icon` ในฟอร์ม. คอนทราสต์ให้ผ่าน **AA**
(สีตัวอักษร brand บนพื้นขาว = โอเค; ถ้าวางบนพื้น tint สีเดียวกันต้องใช้ `text-foreground` แทน — ดูบทเรียนใน ItemCard).

**B. ทางลัด — `@source inline(...)` safelist** ใน `src/index.css`
ลิสต์คลาส arbitrary ที่ theme-utils ผลิต (เช่น `text-[hsl(var(--brand-curtain))]` ทุก brand/หมวด) ให้ Tailwind gen.
เร็วแต่ verbose + ยังคงโค้ด dynamic ที่อ่านยากไว้.

→ **แนะนำ A** (สะอาด long-term, ตรงกับ §2.1 registry). ถ้ารีบใช้ B ชั่วคราวได้.

## ✅ Exit criteria (no-open-ended-tech-debt)
1. เปิดฟอร์ม 6 ตัวในเบราว์เซอร์ (dev) → **ตัวเลข valueClass + ไอคอน section มีสี brand จริง** (เทียบ inspect ว่ามี CSS)
2. คอนทราสต์สี text/icon ผ่าน **AA** ทุกธีม (light/dark/EEERT/Dark Vivid)
3. ไม่มีโค้ด dynamic-brand-class ที่ "ตายเงียบ" เหลือใน theme-utils (ลบ token ที่ไม่ใช้ / แปลงเป็น static)
4. gate เขียว: `npm run lint && npm run test:run && npm run build`

## 📌 หมายเหตุ
- **อย่า** สร้างคลาส Tailwind จาก template var เด็ดขาด (รากของปัญหา).
- ตัวอย่างที่แก้ถูกแล้ว: `TYPE_CHIP_PLATE` + การใช้ `text-foreground` เพื่อ AA ใน `ItemCard.tsx`.
