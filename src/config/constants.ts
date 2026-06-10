/**
 * @module Config
 * @description Application constants and configuration
 */
import { ITEM_TYPES } from './enums';

// Single source of truth for the displayed app version (menu footer). Bump here only.
export const APP_VERSION = '6.7.0';
// Year of the bundled "standard market costs" (DEFAULT_*_COSTS in CostDataSlice).
// Single source — shown in the "โหลดค่ามาตรฐาน <year>" UI; bump when the defaults are refreshed.
export const COST_DATA_YEAR = 2025;

export const STORAGE_KEY = 'marnthara.input.v6.4';
export const SHOP_CONFIG_KEY = 'marnthara.shop.config.v1';

export const SQM_TO_SQYD = 1.19599;

// --- BUTTON DATA (For Dropdowns) ---
export const CURTAIN_STYLES = [
  { label: 'ม่านลอน (Wave)', value: 'ลอน' },
  { label: 'ม่านจีบ (Pleated)', value: 'จีบ' },
  { label: 'ม่านตาไก่ (Eyelet)', value: 'ตาไก่' },
  { label: 'ม่านพับ (Roman)', value: 'พับ' },
  { label: 'ม่านแป๊บ/สอดราง (Rod)', value: 'แป๊บ' },
  { label: 'ม่านหลุยส์ (Louis)', value: 'หลุยส์' },
];

// รูปแบบที่ไม่มี "ทิศทางการเปิด" (พับ = ยกขึ้นแนวตั้ง, แป๊บ = สอดราว)
export const STYLES_WITHOUT_OPENING: readonly string[] = ['พับ', 'แป๊บ'];

export const HOOK_OPTIONS = [
  { label: 'ตะขอสั้น (บังราง)', value: 'short' },
  { label: 'ตะขอยาว (โชว์ราง)', value: 'long' },
];

// --- [NEW] SMART CONFIG: ควบคุม Field ของม่านแต่ละชนิด ---
// hasRail: มีรางหรือไม่
// hasHook: มีตะขอหรือไม่ (จีบ/หลุยส์ = มี, ตาไก่/พับ = ไม่มี)
// hasChain: มีโซ่ไข่ปลาหรือไม่ (พับ/ลอนรางเทป = มี)
// hasEyelet: มีห่วงตาไก่หรือไม่
export const CURTAIN_STYLE_FEATURES: Record<
  string,
  { hasRail: boolean; hasHook: boolean; hasChain: boolean; hasEyelet: boolean }
> = {
  จีบ: { hasRail: true, hasHook: true, hasChain: false, hasEyelet: false },
  ลอน: { hasRail: true, hasHook: false, hasChain: false, hasEyelet: false }, // ใช้ระยะกระดุมแทน (มีผลต่อปริมาณผ้า)
  ตาไก่: { hasRail: true, hasHook: false, hasChain: false, hasEyelet: true },
  พับ: { hasRail: true, hasHook: false, hasChain: true, hasEyelet: false },
  แป๊บ: { hasRail: false, hasHook: false, hasChain: false, hasEyelet: false },
  หลุยส์: { hasRail: true, hasHook: true, hasChain: false, hasEyelet: false },
};

// --- MAIN CONFIG ---
export const ITEM_CONFIG = {
  [ITEM_TYPES.CURTAIN]: {
    id: ITEM_TYPES.CURTAIN,
    name: 'ผ้าม่าน',
    unit: 'ชุด',
    icon: 'AlignLeft',
  },
  [ITEM_TYPES.WALLPAPER]: {
    id: ITEM_TYPES.WALLPAPER,
    name: 'วอลเปเปอร์',
    unit: 'งาน',
    icon: 'ScrollText',
  },
  [ITEM_TYPES.WOODEN_BLIND]: {
    id: ITEM_TYPES.WOODEN_BLIND,
    name: 'มู่ลี่ไม้',
    unit: 'ชุด',
    icon: 'Blinds',
  },
  [ITEM_TYPES.ROLLER_BLIND]: {
    id: ITEM_TYPES.ROLLER_BLIND,
    name: 'ม่านม้วน',
    unit: 'ชุด',
    icon: 'Minimize2',
  },
  [ITEM_TYPES.VERTICAL_BLIND]: {
    id: ITEM_TYPES.VERTICAL_BLIND,
    name: 'ม่านปรับแสง',
    unit: 'ชุด',
    icon: 'Columns',
  },
  [ITEM_TYPES.ALUMINUM_BLIND]: {
    id: ITEM_TYPES.ALUMINUM_BLIND,
    name: 'มู่ลี่อลูมิเนียม',
    unit: 'ชุด',
    icon: 'Blinds',
  },
  [ITEM_TYPES.PARTITION]: {
    id: ITEM_TYPES.PARTITION,
    name: 'ฉากกั้นห้อง',
    unit: 'ชุด',
    icon: 'Grid3X3',
  },
  [ITEM_TYPES.PLEATED_SCREEN]: {
    id: ITEM_TYPES.PLEATED_SCREEN,
    name: 'มุ้งจีบ',
    unit: 'ชุด',
    icon: 'Grid3X3',
  },
  [ITEM_TYPES.REMOVAL]: {
    id: ITEM_TYPES.REMOVAL,
    name: 'รื้อถอน/ค่าแรง',
    unit: 'งาน',
    icon: 'Scissors',
  },
} as const;

// --- DEFAULT SHOP CONFIG ---
export const DEFAULT_SHOP_CONFIG = {
  name: 'ม่านธารา',
  address: '123/45 ถนนตัวอย่าง ตำบลตัวอย่าง อำเภอเมือง จังหวัดกรุงเทพฯ 10110',
  phone: '081-234-5678',
  taxId: '',
  logoUrl: '',
  baseVatRate: 0,
  bankAccount: {
    bankName: 'กสิกรไทย',
    accountName: 'บจก. ม่านธารา เดคคอร์',
    accountNumber: '123-4-56789-0',
    branch: 'เซ็นทรัลเวิลด์',
    isEnabled: true,
  },
  pdf: {
    paymentTerms: 'มัดจำ 50% ก่อนเริ่มงาน ส่วนที่เหลือชำระหลังติดตั้งเสร็จสิ้น',
    priceValidity: 'ราคาในใบเสนอราคานี้มีผล 30 วัน',
    notes: [
      'ราคานี้รวมค่าติดตั้งและขนส่งแล้ว (ในเขตพื้นที่ให้บริการ)',
      'รับประกันการติดตั้ง 1 ปี (ไม่รวมความเสียหายจากการใช้งานผิดประเภท)',
    ],
  },
};

// --- CALCULATION CONSTANTS ---
export const PRICING = {
  style_surcharge: {
    ลอน: 0,
    จีบ: 0,
    ตาไก่: 0,
    พับ: 0,
    แป๊บ: 0,
    หลุยส์: 500,
  } as Record<string, number>,

  rail_price_per_m: 350,
  bracket_price: 35,
  installation_fee: 0,
  eyelet_price_per_m: 150,
} as const;

export const WALLPAPER_SPECS = {
  ROLL_WIDTH_M: 0.53,
  ROLL_LENGTH_M: 10,
  SQM_PER_ROLL: 5.3,
  WASTE_FACTOR: 1.15,
} as const;
