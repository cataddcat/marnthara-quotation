// src/lib/export/docName.ts
// มาตรฐานชื่อเอกสาร export: <ประเภท>_<ชื่อลูกค้า>_<รหัสเอกสาร>_<YYYYMMDD>
//   ตัวอย่าง: mtr-backup_สมชาย_C7A3F-001_20260609.json
// ฟังก์ชันล้วน (pure) — ไม่พึ่ง store/DOM — เพื่อ unit test ได้ตรง ๆ
//
// หลักการ identity: customer.id (UUID) = กุญแจเชื่อมตัวจริง (ฝังในไฟล์ JSON),
// โทเค็นในชื่อไฟล์เป็นแค่ชั้นแสดงผล (code ที่พิมพ์เอง หรือ C{4hex} จาก UUID)

// allowlist: เก็บเฉพาะตัวอักษร/ตัวเลข ASCII + ตัวอักษรไทย (U+0E00–U+0E7F).
// ที่เหลือทั้งหมด (อักขระต้องห้าม / \ : * ? " < > | · emoji · control · เว้นวรรค · จุด) → '-'
// ใช้ allowlist + '+' เพื่อยุบ run ในตัว — เลี่ยงการระบุ emoji/control ตรง ๆ (ผ่าน ESLint)
const UNSAFE = /[^a-zA-Z0-9฀-๿]+/g;

/**
 * แปลงข้อความให้เป็น filename segment ที่ปลอดภัย:
 * อักขระนอก allowlist → '-' (ยุบ run ในตัว), ตัด '-' หัว-ท้าย
 * ว่าง → 'ไม่ระบุชื่อ' (fallback อ่านออก)
 */
export function sanitizeFilenameSegment(raw: string | undefined): string {
  const cleaned = (raw ?? '')
    .trim()
    .replace(UNSAFE, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || 'ไม่ระบุชื่อ';
}

/**
 * โทเค็นลูกค้าจาก UUID: 'C' + 4 hex แรก (พิมพ์ใหญ่) → 'C7A3F'.
 * ไม่มี id (ช่วง transient ก่อน backfill) → 'C0000'
 */
export function customerToken(id: string | undefined): string {
  const hex = (id ?? '')
    .replace(/[^0-9a-fA-F]/g, '')
    .slice(0, 4)
    .toUpperCase();
  return `C${hex.padEnd(4, '0')}`;
}

/**
 * รหัสเอกสารเต็ม: <โทเค็น>-<NNN>
 * - code ที่พิมพ์เอง (ถ้ามี) → ใช้เป็นโทเค็น (sanitize แล้ว)
 * - ไม่มี code → customerToken(id)
 */
export function formatDocCode(args: { id?: string; code?: string; seq: number }): string {
  const token = args.code?.trim() ? sanitizeFilenameSegment(args.code) : customerToken(args.id);
  const seq = String(Math.max(1, Math.floor(args.seq || 1))).padStart(3, '0');
  return `${token}-${seq}`;
}

/** 'YYYYMMDD' (เวลาท้องถิ่น) */
export function yyyymmdd(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

/**
 * ประกอบชื่อไฟล์ฐาน (ยังไม่รวมนามสกุล):
 * <type>_<sanitize(customerName)>_<docCode>_<YYYYMMDD>
 */
export function buildDocFileBase(
  type: string,
  customerName: string | undefined,
  docCode: string,
  d: Date = new Date()
): string {
  return `${type}_${sanitizeFilenameSegment(customerName)}_${docCode}_${yyyymmdd(d)}`;
}
