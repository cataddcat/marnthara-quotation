// src/utils/formatters.ts

/**
 * @module Formatters
 * @description Utility functions for number formatting and text conversion
 */

export const toNum = (v: string | number | undefined | null): number => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (!v) return 0;
  const str = typeof v === 'string' ? v.replace(/,/g, '') : String(v);
  const num = parseFloat(str);
  return Number.isFinite(num) ? num : 0;
};

export const fmtDimension = (v: number | string): string => {
  const num = toNum(v);
  return num > 0 ? num.toFixed(2) : '';
};

/**
 * รูปแบบขนาด "กว้าง × สูง" สำหรับข้อความสรุป (LINE/ช่างเย็บ/สั่งราง)
 * — ใช้เครื่องหมายคูณ × (U+00D7), เว้นวรรครอบ, ไม่มีหน่วย เช่น "2.75 × 2.83"
 */
export const fmtSize = (w: number | string, h: number | string): string =>
  `${toNum(w).toFixed(2)} × ${toNum(h).toFixed(2)}`;

export interface DimensionResult {
  /** ค่าเมตร (string, 2 ทศนิยม) พร้อมใช้ — '' เมื่อว่าง */
  value: string;
  /** true เฉพาะตอนแปลง ซม.→ม. (จำนวนเต็ม ≥10 ÷100) — ใช้ตัดสินใจโชว์ป้ายย้อนกลับ */
  convertedFromCm: boolean;
  /** ค่าที่พิมพ์ตีความเป็น "เมตรตามตัวอักษร" (สำหรับปุ่มย้อนกลับ) */
  rawMeters: string;
}

/**
 * Smart dimension parsing → เมตร
 * กฎ (predictable): จุดทศนิยม = เมตร · จำนวนเต็ม <10 = เมตร · จำนวนเต็ม ≥10 = เซนติเมตร (÷100)
 * — การมี "." คือสัญญาณว่าผู้ใช้ตั้งใจป้อนเมตรอยู่แล้ว จึงไม่หาร (กันเคส 12.5 → 0.13)
 */
export const parseDimension = (input: string): DimensionResult => {
  // ล้างคอมม่า (หลักพัน) และช่องว่าง
  const trimmed = input.replace(/,/g, '').trim();
  if (trimmed === '' || trimmed === '.') {
    return { value: '', convertedFromCm: false, rawMeters: '' };
  }

  const num = parseFloat(trimmed);

  // ไม่ใช่ตัวเลข → คืนค่าเดิม (กัน error)
  if (isNaN(num)) {
    return { value: input, convertedFromCm: false, rawMeters: input };
  }

  // จำนวนเต็ม ≥10 (ไม่มีจุดทศนิยม) = ป้อนเป็นเซนติเมตร → หาร 100
  const convertedFromCm = !trimmed.includes('.') && Math.abs(num) >= 10;
  const meters = convertedFromCm ? num / 100 : num;

  return {
    value: meters.toFixed(2),
    convertedFromCm,
    rawMeters: Math.abs(num).toFixed(2),
  };
};

// Smart Input Logic: 200 -> 2.00 (wrapper บางๆ — decimal-guard ติดไปทุก caller)
export const normalizeDimension = (value: string): string => parseDimension(value).value;

// ฟิลด์ที่เป็น "ขนาด (เมตร)" — ใช้ heuristic ซม.→ม. (เช่น 234 → 2.34)
const DIMENSION_FIELDS = ['width_m', 'height_m'] as const;

/**
 * Normalize ค่าขนาด (ซม.→ม.) ของทุกฟิลด์มิติในออบเจกต์ข้อมูลฟอร์ม/รายการ — ใช้ร่วมทั้ง
 * explicit submit (useZodForm) และ autosave/flush ตอนปิด (ItemModal.persistDraft) เพื่อให้
 * ทุกเส้นทางบันทึกได้ค่าเดียวกัน (กันค่าดิบ "278" ค้างเมื่อปิดโดยไม่กดบันทึก)
 * — idempotent กับค่าที่แปลงแล้ว ("2.34" → "2.34"), ปลอดภัยกับข้อมูลที่ไม่มีฟิลด์ขนาด (no-op)
 */
export function normalizeDimensionFields<T extends Record<string, unknown>>(data: T): T {
  let changed = false;
  const out: Record<string, unknown> = { ...data };

  for (const key of DIMENSION_FIELDS) {
    const v = out[key];
    if (typeof v === 'string' && v.trim() !== '') {
      const n = normalizeDimension(v);
      if (n !== v) {
        out[key] = n;
        changed = true;
      }
    }
  }

  // วอลเปเปอร์: widths เป็น array ความกว้างของผนัง
  if (Array.isArray(out.widths)) {
    let arrChanged = false;
    const next = (out.widths as unknown[]).map((w) => {
      if (typeof w === 'string' && w.trim() !== '') {
        const n = normalizeDimension(w);
        if (n !== w) arrChanged = true;
        return n;
      }
      return w;
    });
    if (arrChanged) {
      out.widths = next;
      changed = true;
    }
  }

  return changed ? (out as T) : data;
}

export const fmt = (n: number, fixed = 2, asCurrency = false): string => {
  if (!Number.isFinite(n)) return '0';
  return n.toLocaleString('th-TH', {
    minimumFractionDigits: asCurrency ? 2 : 0,
    maximumFractionDigits: fixed,
  });
};

// [UPDATED] Removed ' บ.' suffix for cleaner UI
export const fmtTH = (n: number): string => {
  return fmt(n, 2, true);
};

export const bahttext = (num: number): string => {
  if (!num) return 'ศูนย์บาทถ้วน';

  const TxtNumArr = [
    'ศูนย์',
    'หนึ่ง',
    'สอง',
    'สาม',
    'สี่',
    'ห้า',
    'หก',
    'เจ็ด',
    'แปด',
    'เก้า',
    'สิบ',
  ];
  const TxtDigitArr = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];

  num = parseFloat(num.toFixed(2)); // Fix precision issues
  let bahtStr = '';

  if (num === 0) return 'ศูนย์บาทถ้วน';

  const processGroup = (numberGroup: number) => {
    let str = '';
    const s = String(numberGroup);
    for (let i = 0; i < s.length; i++) {
      const digit = parseInt(s[i]);
      const position = s.length - i - 1;

      if (digit === 0) continue;

      if (position === 1 && digit === 1) {
        str += TxtDigitArr[position];
      } else if (position === 1 && digit === 2) {
        str += 'ยี่' + TxtDigitArr[position];
      } else if (position === 0 && digit === 1 && s.length > 1) {
        str += 'เอ็ด';
      } else {
        str += TxtNumArr[digit] + TxtDigitArr[position];
      }
    }
    return str;
  };

  const integerPart = Math.floor(num);
  const decimalPart = Math.round((num - integerPart) * 100);

  if (integerPart > 0) {
    bahtStr += processGroup(integerPart);
    bahtStr += 'บาท';
  }

  if (decimalPart > 0) {
    bahtStr += processGroup(decimalPart);
    bahtStr += 'สตางค์';
  } else {
    bahtStr += 'ถ้วน';
  }

  return bahtStr;
};

/**
 * แปลงวันที่เป็นภาษาไทยแบบย่อ หรือ เต็ม
 * @example fmtDate(new Date()) -> "3 ธ.ค. 68"
 */
export const fmtDate = (date: Date | string | number, full: boolean = false): string => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';

  return new Intl.DateTimeFormat('th-TH', {
    year: '2-digit',
    month: full ? 'long' : 'short',
    day: 'numeric',
  }).format(d);
};

/**
 * สร้าง Date String สำหรับใช้เป็น ID หรือ ชื่อไฟล์
 * @example getDateISO() -> "2025-12-03"
 */
export const getDateISO = (): string => {
  return new Date().toISOString().split('T')[0];
};
