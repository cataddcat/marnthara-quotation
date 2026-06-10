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
