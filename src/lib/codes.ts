// src/lib/codes.ts
// ────────────────────────────────────────────────────────────────────────────
// มาตรฐาน "รหัสสินค้า" (SKU code) — แก้ปัญหา case ไม่ตรงกันระหว่างเส้นทางเข้า vault:
//   importCatalog เขียน key เป็น UPPERCASE แต่ฟอร์ม/addFavorite ใช้รหัสดิบ
//   → พิมพ์ "f001" ในฟอร์ม แต่ vault มี "F001" = ทุนหาไม่เจอ → สถานะ "ไม่รู้ต้นทุน" ทั้งที่มีข้อมูล
//
// กติกา: เขียน vault ด้วย normalizeCode เสมอ, อ่านด้วย vaultLookup (ลองรหัสดิบก่อน
// แล้ว fallback เป็นรหัส normalize) — ข้อมูลเก่าที่เคยเขียนด้วยรหัสดิบจึงยังอ่านเจอ
// ────────────────────────────────────────────────────────────────────────────

/** รูปแบบรหัสมาตรฐาน: ตัด space + ตัวพิมพ์ใหญ่ ('  f001 ' → 'F001') */
export const normalizeCode = (code: string): string => code.trim().toUpperCase();

/**
 * อ่านค่าจาก vault (Record<code, number>) แบบทน case/space:
 * ลอง key ตรง ๆ ก่อน (ข้อมูลเก่า) แล้วค่อย fallback เป็น normalizeCode
 * คืน 0 เมื่อไม่พบ (สอดคล้องกับ convention เดิมของ CostEngine ที่ใช้ `|| 0`)
 */
export const vaultLookup = (
  vault: Record<string, number> | undefined,
  code: string | undefined
): number => {
  if (!vault || !code) return 0;
  return vault[code] ?? vault[normalizeCode(code)] ?? 0;
};
