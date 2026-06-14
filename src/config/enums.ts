/**
 * @module Config/Enums
 * @description Centralized constants to avoid magic strings throughout the application.
 */

// --- Item Types (ประเภทสินค้าหลัก) ---
export const ITEM_TYPES = {
  CURTAIN: 'curtain',
  WALLPAPER: 'wallpaper',
  WOODEN_BLIND: 'wooden_blind',
  ROLLER_BLIND: 'roller_blind',
  VERTICAL_BLIND: 'vertical_blind',
  ALUMINUM_BLIND: 'aluminum_blind',
  PARTITION: 'partition',
  PLEATED_SCREEN: 'pleated_screen',
  REMOVAL: 'removal',
} as const;

export type ItemTypeKey = (typeof ITEM_TYPES)[keyof typeof ITEM_TYPES];

// --- Favorite Categories ---
export const FAVORITE_CATEGORIES = {
  CURTAIN_MAIN: 'curtain_main',
  CURTAIN_SHEER: 'curtain_sheer',
  WALLPAPER: ITEM_TYPES.WALLPAPER,
  WOODEN_BLIND: ITEM_TYPES.WOODEN_BLIND,
  ROLLER_BLIND: ITEM_TYPES.ROLLER_BLIND,
  VERTICAL_BLIND: ITEM_TYPES.VERTICAL_BLIND,
  ALUMINUM_BLIND: ITEM_TYPES.ALUMINUM_BLIND,
  PARTITION: ITEM_TYPES.PARTITION,
  PLEATED_SCREEN: ITEM_TYPES.PLEATED_SCREEN,
} as const;

// --- [NEW] Curtain Configuration Enums ---

export const LAYER_MODES = {
  MAIN: 'main', // ผ้าทึบ
  SHEER: 'sheer', // ผ้าโปร่ง
  DOUBLE: 'double', // ทึบ + โปร่ง
} as const;

export const HOOK_TYPES = {
  SHORT: 'short', // ตะขอสั้น (บังราง)
  LONG: 'long', // ตะขอยาว (โชว์ราง)
} as const;

// หมายเหตุ: OPENING_STYLES ('center'/'side') ถูกถอดออกแล้ว — ทุกฟอร์มเก็บค่า canonical ไทย
// ผ่าน OpeningStyleSelector; ค่าเก่าในข้อมูลยังถูกอ่านได้ผ่าน openingBucket (src/lib/opening-style.ts)

export const CHAIN_POSITIONS = {
  LEFT: 'left',
  RIGHT: 'right',
} as const;

// --- หมวดรายจ่ายจริงของงาน (เช็คลิสท์ใน "การเงินของงาน") ---
// ล้อ 3-bucket taxonomy ทุน (แรง/อุปกรณ์/วัสดุ) + ขนส่ง/ติดตั้ง ที่ระบบประมาณการไม่ครอบคลุม
export const EXPENSE_CATEGORIES = {
  MATERIAL: 'material', // ค่าผ้า/วัสดุ
  HARDWARE: 'hardware', // ราง/อุปกรณ์
  SEWING: 'sewing', // ค่าเย็บ
  SHIPPING: 'shipping', // ค่าขนส่ง
  INSTALL: 'install', // ค่าช่างติดตั้ง
  OTHER: 'other', // อื่นๆ
} as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[keyof typeof EXPENSE_CATEGORIES];

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  material: 'ค่าผ้า/วัสดุ',
  hardware: 'ราง/อุปกรณ์',
  sewing: 'ค่าเย็บ',
  shipping: 'ค่าขนส่ง',
  install: 'ค่าช่างติดตั้ง',
  other: 'อื่นๆ',
};

// --- สถานะงาน (Job lifecycle) — ไปป์ไลน์ 6 สเตจสำหรับกระดาน "งานทั้งหมด" (สลับงาน) ---
// ผู้ใช้ตั้งเอง (manual) + ป้ายอัตโนมัติ (ค้างเก็บ/ค้าง N จุด) คำนวณสดแยกต่างหาก ไม่เก็บใน status
export const JOB_STATUS = {
  LEAD: 'lead', // ลูกค้าใหม่ — เพิ่งรับเรื่อง ยังไม่วัด
  MEASURED: 'measured', // วัดแล้ว — มีขนาด/รายการ ยังไม่เคาะราคา
  QUOTED: 'quoted', // เสนอราคา — ส่งใบเสนอ รอลูกค้าตัดสินใจ
  CONFIRMED: 'confirmed', // มัดจำ/ยืนยัน — ลูกค้าตกลง/วางมัดจำ
  PRODUCTION: 'production', // กำลังผลิต/ติดตั้ง — สั่งของ/เย็บ/ติดตั้ง
  DONE: 'done', // จบงาน — ส่งมอบ/เก็บเงินครบ
} as const;

export type JobStatusKey = (typeof JOB_STATUS)[keyof typeof JOB_STATUS];

export const JOB_STATUS_LABELS: Record<JobStatusKey, string> = {
  lead: 'ลูกค้าใหม่',
  measured: 'วัดแล้ว',
  quoted: 'เสนอราคา',
  confirmed: 'มัดจำ/ยืนยัน',
  production: 'กำลังผลิต/ติดตั้ง',
  done: 'จบงาน',
};

/** ลำดับไปป์ไลน์ (ใช้เรียง/จัดกลุ่ม/เลื่อนสถานะถัดไป) — งานใหม่เริ่มที่ตัวแรก */
export const JOB_STATUS_ORDER: readonly JobStatusKey[] = [
  JOB_STATUS.LEAD,
  JOB_STATUS.MEASURED,
  JOB_STATUS.QUOTED,
  JOB_STATUS.CONFIRMED,
  JOB_STATUS.PRODUCTION,
  JOB_STATUS.DONE,
];

/** สถานะเริ่มต้นของงานใหม่ */
export const DEFAULT_JOB_STATUS: JobStatusKey = JOB_STATUS.LEAD;
