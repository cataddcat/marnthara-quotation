// D:\_Projects\mtr-qol-all-green\src\types.ts

import { ITEM_CONFIG } from './config/constants';
import { ITEM_TYPES } from './config/enums';

// --- 1. Global Config & User ---
export interface ShopConfig {
  name: string;
  address: string;
  phone: string;
  taxId: string;
  logoUrl: string;
  baseVatRate: number;
  bankAccount: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    branch?: string;
    isEnabled: boolean;
  };
  pdf: {
    paymentTerms: string;
    priceValidity: string;
    notes: string[];
  };
}

export interface Customer {
  name: string;
  phone: string;
  address: string;
  taxId?: string;
  installationAddress?: string;
  useSameAddress?: boolean;
  showInstallationAddress?: boolean;

  // --- Document identity (มาตรฐานชื่อเอกสาร export — see src/lib/docName.ts) ---
  /** UUID — กุญแจเชื่อมตัวจริง (canonical join key), เติม lazy + persist, ฝังในไฟล์ backup เสมอ */
  id?: string;
  /** รหัสลูกค้าที่พิมพ์เอง (จากทะเบียนภายนอก เช่น "C0007"); เว้นว่าง → fallback เป็น C{4hex} จาก id */
  code?: string;
  /** เลขรันเอกสารต่อลูกค้า (ส่วน NNN ของรหัส), persist, default 1 */
  docSeq?: number;
}

export interface Discount {
  type: 'amount' | 'percent';
  value: number;
  is_enabled: boolean;
}

// --- 2. Base Inputs (Shared) ---
export interface BaseItemInput {
  is_suspended?: boolean;
  enable_set_price?: boolean;
  set_price_override?: number | string;
  notes?: string;

  // [PRO MODE] Global Fields
  _is_pro_mode?: boolean; // เปิดโหมดคำนวณจากทุน
}

// --- 3. Feature Specific Inputs ---

// 3.1 Curtain (ผ้าม่าน)
export interface CurtainItemInput extends BaseItemInput {
  width_m: number | string;
  height_m: number | string;
  style: string;

  // Prices
  price_per_m_raw?: number | string;
  price_sqyd?: number | string; // ราคาทุน/หลา (Optional)
  sheer_price_sqyd?: number | string; // ราคาทุนโปร่ง/หลา (Optional)

  // Fabric Details
  layer_mode?: string;
  fabric_variant?: string;
  code?: string;

  // Sheer
  sheer_code?: string;
  sheer_price_per_m?: number | string;
  rail_price_per_m?: number | string;

  // Accessories & Options
  rail_code?: string; // SKU รางจาก catalog (Phase C) → ทุน hardwareCosts[rail_code]
  rail_color?: string;
  bracket_color?: string;
  eyelet_color?: string;
  pleat_distance?: string;
  chain_position?: string;
  hook_type?: string;
  button_spacing?: string;
  opening_style?: string;
  use_rail?: boolean; // เพิ่มฟิลด์สำหรับใช้งานราง

  // Costs (Pro Mode)
  _cost_fabric?: number; // ทุนผ้าทึบ
  _cost_sheer?: number; // ทุนผ้าโปร่ง
}

// 3.2 Wallpaper (วอลเปเปอร์)
export interface WallpaperItemInput extends BaseItemInput {
  widths: string[]; // Array of width strings
  height_m: number | string;
  price_per_roll: number | string;
  install_cost_per_roll: number | string;
  wallpaper_code?: string;
}

// 3.3 Area Items (มู่ลี่ / ฉาก / มุ้ง)
export interface AreaItemInput extends BaseItemInput {
  width_m: number | string;
  height_m: number | string;
  price_sqyd: number | string;
  code?: string;
  adjustment_side?: string;
  fabric_variant?: string;
  opening_style?: string;
}

// 3.4 Removal (รื้อถอน)
export interface RemovalItemInput extends BaseItemInput {
  quantity: number | string;
  price_per_item: number | string;
  description?: string;
}

// --- 4. Union Type (Polymorphic) ---
export type ItemTypeKey = keyof typeof ITEM_CONFIG;

export type ItemData =
  | ({ type: typeof ITEM_TYPES.CURTAIN; id: string } & CurtainItemInput)
  | ({ type: typeof ITEM_TYPES.WALLPAPER; id: string } & WallpaperItemInput)
  | ({
      type:
        | typeof ITEM_TYPES.WOODEN_BLIND
        | typeof ITEM_TYPES.ROLLER_BLIND
        | typeof ITEM_TYPES.VERTICAL_BLIND
        | typeof ITEM_TYPES.ALUMINUM_BLIND
        | typeof ITEM_TYPES.PARTITION
        | typeof ITEM_TYPES.PLEATED_SCREEN;
      id: string;
    } & AreaItemInput)
  | ({ type: typeof ITEM_TYPES.REMOVAL; id: string } & RemovalItemInput);

export type PrintableItem = ItemData;

// --- 5. Room Structure ---
export interface Room {
  id: string;
  name: string;
  items: ItemData[];
  is_suspended: boolean;
}
