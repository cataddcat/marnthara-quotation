// src/config/railProducts.ts
// ════════════════════════════════════════════════════════════════════════════
// 🛤️ รุ่นราง / รหัสสินค้า (THONG DECOR) — single source of truth
// ════════════════════════════════════════════════════════════════════════════
//
// แมปสี → รหัสสินค้า ของรางม่าน ถอดจากแคตตาล็อก THONG DECOR (รุ่นไลท์ หนา 1 มิล)
//   • เทปลอน (Wave / snap tape TW14.5) → ตระกูล TES1xx
//   • จีบ (Pleated / ราง M)            → ตระกูล LTL1xx
// รหัสลงท้าย 01–06 ตามสี (ดูตารางด้านล่าง) — ใช้ร่วมกันทั้ง dropdown เลือกสี (ฟอร์มม่าน),
// ใบสั่งราง (summaryGenerator) และเอกสารอธิบายสูตร (FormulaDocsModal)
// ════════════════════════════════════════════════════════════════════════════

export interface RailColor {
  /** ค่าที่เก็บใน item.rail_color (ภาษาไทย) */
  value: string;
  /** ป้ายแสดงใน dropdown */
  label: string;
  /** สีตัวอย่าง (hex) — ใช้โชว์ swatch ใน dropdown */
  hex: string;
}

/** 6 สีมาตรฐานของราง THONG DECOR (เรียงตามรหัส 01–06) */
export const RAIL_COLORS: RailColor[] = [
  { value: 'ขาว', label: 'ขาว', hex: '#f8fafc' },
  { value: 'ดำ', label: 'ดำ', hex: '#1f2937' },
  { value: 'ไม้สัก', label: 'ไม้สัก', hex: '#9a6a3a' },
  { value: 'เมเปิ้ล', label: 'เมเปิ้ล', hex: '#d9b382' },
  { value: 'ไม้แดง', label: 'ไม้แดง', hex: '#7b3f2f' },
  { value: 'เงินเทา', label: 'เงินเทา', hex: '#9ca3af' },
];

/** สี (ไทย) → รหัสลงท้าย 2 หลัก (TES1xx / LTL1xx) */
export const RAIL_COLOR_CODE: Record<string, string> = {
  ขาว: '01',
  ดำ: '02',
  ไม้สัก: '03',
  เมเปิ้ล: '04',
  ไม้แดง: '05',
  เงินเทา: '06',
};

/**
 * ชื่อสินค้า/ราง สำหรับใบสั่งราง (ผู้ผลิต) — color-aware
 *
 * คืน `null` เมื่อสร้างชื่อเฉพาะรุ่นไม่ได้ (สีว่าง หรือชนิดรางที่ไม่มีรหัสสินค้า)
 * ให้ผู้เรียก fallback ไปป้ายทั่วไป (RAIL_LABELS[railKey]) เพื่อคงพฤติกรรมเดิม
 *
 * @param railKey   เช่น 'rail_wave' | 'rail_pleated' | 'rail_roman'
 * @param railColor ค่าจาก item.rail_color (เช่น 'ไม้สัก') — รับ custom/ว่างได้
 */
export function railProductName(railKey: string, railColor?: string): string | null {
  const color = (railColor || '').trim();
  const code = RAIL_COLOR_CODE[color]; // '01'..'06' หรือ undefined (สี custom/ว่าง)

  switch (railKey) {
    case 'rail_wave':
      if (code) return `TES1${code} ( TW14.5 )รางเทปลอน เทป14.5 สี${color}`;
      return color ? `รางเทปลอน ( TW14.5 ) สี${color}` : null;
    case 'rail_pleated':
      if (code) return `LTL1${code} ราง M ประกอบชุด สี${color}`;
      return color ? `ราง M ประกอบชุด สี${color}` : null;
    case 'rail_roman':
      return 'U-2 รางม่านพับ U-2';
    default:
      return null;
  }
}
