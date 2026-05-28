import { ITEM_CONFIG } from '../config/constants';
import { ITEM_TYPES } from '../config/enums'; // [NEW]

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
}

export interface Discount {
  type: 'amount' | 'percent';
  value: number;
  is_enabled?: boolean;
}

// [UPDATED] Use keyof from config which is now based on Enums
export type ItemTypeKey = keyof typeof ITEM_CONFIG;

// --- Base Inputs ---
export interface BaseItemInput {
  is_suspended?: boolean;
  enable_set_price?: boolean;
  set_price_override?: number | string;
  notes?: string;
}

export interface CurtainItemInput extends BaseItemInput {
  width_m: number | string;
  height_m: number | string;
  style: string;

  // Prices
  price_per_m_raw?: number | string; // ราคาต่อเมตร (ทึบ)
  sheer_price_per_m?: number | string; // ราคาต่อเมตร (โปร่ง)
  rail_price_per_m?: number | string; // ราคาราง
  price_sqyd?: number | string; // (Optional) ราคาผ้าทึบ (หลา)
  sheer_price_sqyd?: number | string; // ราคาผ้าโปร่ง (หลา)

  // Fabric & Specs
  fabric_variant: string;
  layer_mode: 'main' | 'sheer' | 'double';
  code?: string;
  sheer_code?: string;

  // Options
  opening_style?: string;
  hook_type?: string;
  pleat_hook?: string;
  bracket_color?: string;
  rail_color?: string;
  chain_position?: string;
  eyelet_color?: string;
  pleat_distance?: string;
  button_spacing?: string;
  use_rail?: boolean;
}

export interface WallpaperItemInput extends BaseItemInput {
  widths: string[];
  height_m: number | string;
  price_per_roll: number | string;
  install_cost_per_roll: number | string;
  wallpaper_code: string;
}

export interface AreaItemInput extends BaseItemInput {
  width_m: number | string;
  height_m: number | string;
  price_sqyd: number | string;
  code?: string;
  adjustment_side?: string;
  fabric_variant?: string;
  opening_style?: string;
}

export interface RemovalItemInput extends BaseItemInput {
  quantity: number | string;
  price_per_item: number | string;
  description?: string;
}

// [UPDATED] Union Type using Enums
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

export interface Room {
  id: string;
  name: string;
  items: ItemData[];
  is_suspended: boolean;
  room_defaults?: Record<string, unknown>;
}

export interface CurtainPriceResult {
  total: number;
  fabricPrice: number;
  sheerPrice: number;
  louisPrice: number;
  fabricMeters: number;
  sheerMeters: number;
  railPrice: number;
  accessoryPrice?: number;
}

export interface WallpaperPriceResult {
  total: number;
  rolls: number;
  rollPrice: number;
  installPrice: number;
  rollCost?: number;
}

export interface AreaPriceResult {
  total: number;
  sqm: number;
  sqyd: number;
}
