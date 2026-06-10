// src/lib/opening-style.ts
// ────────────────────────────────────────────────────────────────────────────
// แหล่งกลางของ "ทิศทางการเปิด" (opening_style) ที่มีหลาย convention ปนกันในโปรเจกต์:
//   - ผ้าม่าน (ปัจจุบัน): ภาษาไทย 'แยกกลาง' / 'เก็บข้างเดียว' + legacy 'เก็บซ้าย'/'เก็บขวา'
//   - ฉากกั้น/มุ้งจีบ/ม่านปรับแสง(เก่า): โค้ด 'center' / 'side' (enum OPENING_STYLES เดิม — ถอดแล้ว
//     ทุกฟอร์มใช้ OpeningStyleSelector เก็บค่าไทย แต่ข้อมูลเก่าที่ persist ไว้ยังเป็นโค้ดได้)
// รวม logic การ "จัดถัง" + "ป้ายไทย" ไว้ที่เดียว เพื่อให้ปุ่มเลือก, chip บนการ์ด และ wave-hardware
// ตัดสินใจตรงกันเสมอ (กัน drift / latent bug แบบ === 'side' ไม่ match ค่าจริง)
// ────────────────────────────────────────────────────────────────────────────

/** ค่าทิศทางการเปิดแบบ canonical (ภาษาไทย) — '' = ยังไม่เลือก */
export const OPENING_CENTER = 'แยกกลาง';
export const OPENING_SIDE = 'เก็บข้างเดียว';

/** จัดค่า opening_style ทุก convention (ไทย/โค้ด/legacy) เข้า 3 ถัง */
export const openingBucket = (v?: string): 'none' | 'center' | 'side' => {
  if (!v) return 'none';
  if (v === 'center' || v === OPENING_CENTER) return 'center';
  return 'side'; // 'side' | 'เก็บข้างเดียว' | 'เก็บซ้าย' | 'เก็บขวา'
};

/** ป้ายไทยสำหรับแสดงผล (chip บนการ์ด ฯลฯ) — แก้เคสที่เคยโชว์ 'side'/'center' เป็นอังกฤษ */
export const openingStyleLabel = (v?: string): string => {
  const b = openingBucket(v);
  return b === 'center' ? OPENING_CENTER : b === 'side' ? OPENING_SIDE : '';
};
