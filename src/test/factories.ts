// src/test/factories.ts
// Typed factories for tests — form-shaped objects ที่ valid กับ Zod schemas โดย default
// override ได้ทุก field เพื่อสร้าง edge case (missing required, type coercion ฯลฯ)
//
// ค่า numeric เป็น string เลียนแบบ <input> จริง (schema ใช้ numericString / positiveNumeric)
// item factories ใช้กับ schema.safeParse() ได้ตรงๆ; ถ้าต้องการ ItemData สำหรับ store
// ให้ wrap ด้วย asItemData() (localize cast ที่เดียว เหมือน __test-helpers.makeItem)

import { ITEM_TYPES, LAYER_MODES } from '@/config/enums';
import type { ItemData, Room, Customer, Discount } from '@/types';

let seq = 0;
/** id ที่ unique + deterministic ภายใน run เดียว (ดีกว่า Math.random สำหรับ assertions) */
export const testId = (prefix = 'id'): string => `${prefix}-${++seq}`;

/** reset ตัวนับ id — เรียกใน beforeEach ถ้าต้องการ id ซ้ำเดิมข้าม test */
export const resetIdSeq = (): void => {
  seq = 0;
};

/**
 * Cast form-shaped object → ItemData สำหรับ store actions (addItem ฯลฯ)
 * runtime valid เพราะ engine/slice dispatch จาก `type` เท่านั้น
 */
export const asItemData = <T extends Record<string, unknown>>(base: T): ItemData =>
  base as unknown as ItemData;

// ─────────────────────────────────────────────────────────────────────────────
// Curtain factories
// ─────────────────────────────────────────────────────────────────────────────

/** ม่านทึบ (MAIN) สไตล์ 'จีบ' — hasRail=true จึงใส่ rail_color ให้ valid */
export const makeCurtain = <T extends Record<string, unknown>>(overrides?: T) => ({
  type: ITEM_TYPES.CURTAIN,
  id: testId('curtain'),
  width_m: '2.5',
  height_m: '2.8',
  style: 'จีบ',
  layer_mode: LAYER_MODES.MAIN,
  code: 'F001',
  price_per_m_raw: '350',
  rail_color: 'ขาว',
  is_suspended: false,
  enable_set_price: false,
  set_price_override: 0,
  ...overrides,
});

/** ม่านโปร่ง (SHEER) — ต้องมี sheer_code + sheer_price_per_m */
export const makeSheerCurtain = <T extends Record<string, unknown>>(overrides?: T) => ({
  type: ITEM_TYPES.CURTAIN,
  id: testId('curtain-sheer'),
  width_m: '2.5',
  height_m: '2.8',
  style: 'จีบ',
  layer_mode: LAYER_MODES.SHEER,
  sheer_code: 'S001',
  sheer_price_per_m: '180',
  rail_color: 'ขาว',
  is_suspended: false,
  enable_set_price: false,
  set_price_override: 0,
  ...overrides,
});

/** ม่านสองชั้น (DOUBLE) — ทึบ + โปร่ง ต้องครบทั้งคู่ */
export const makeDoubleCurtain = <T extends Record<string, unknown>>(overrides?: T) => ({
  type: ITEM_TYPES.CURTAIN,
  id: testId('curtain-double'),
  width_m: '3.0',
  height_m: '2.8',
  style: 'จีบ',
  layer_mode: LAYER_MODES.DOUBLE,
  code: 'F001',
  price_per_m_raw: '350',
  sheer_code: 'S001',
  sheer_price_per_m: '180',
  rail_color: 'ขาว',
  is_suspended: false,
  enable_set_price: false,
  set_price_override: 0,
  ...overrides,
});

// ─────────────────────────────────────────────────────────────────────────────
// Wallpaper factory
// ─────────────────────────────────────────────────────────────────────────────

export const makeWallpaper = <T extends Record<string, unknown>>(overrides?: T) => ({
  type: ITEM_TYPES.WALLPAPER,
  id: testId('wallpaper'),
  widths: ['3.0', '2.5'],
  height_m: '2.8',
  wallpaper_code: 'WP01',
  price_per_roll: '1200',
  install_cost_per_roll: '200',
  is_suspended: false,
  ...overrides,
});

// ─────────────────────────────────────────────────────────────────────────────
// Area-item factory (Wooden/Roller/Vertical/Aluminum Blind, Partition, Pleated Screen)
// ─────────────────────────────────────────────────────────────────────────────

export const makeAreaItem = <T extends Record<string, unknown>>(
  type: (typeof ITEM_TYPES)[keyof typeof ITEM_TYPES] = ITEM_TYPES.WOODEN_BLIND,
  overrides?: T
) => ({
  type,
  id: testId('area'),
  width_m: '2.0',
  height_m: '2.0',
  price_sqyd: '500',
  is_suspended: false,
  enable_set_price: false,
  set_price_override: 0,
  ...overrides,
});

// ─────────────────────────────────────────────────────────────────────────────
// Removal factory
// ─────────────────────────────────────────────────────────────────────────────

export const makeRemoval = <T extends Record<string, unknown>>(overrides?: T) => ({
  type: ITEM_TYPES.REMOVAL,
  id: testId('removal'),
  description: 'รื้อม่านเก่า',
  quantity: '2',
  price_per_item: '300',
  is_suspended: false,
  enable_set_price: false,
  set_price_override: 0,
  ...overrides,
});

// ─────────────────────────────────────────────────────────────────────────────
// Aggregate factories — Room / Customer / Discount
// ─────────────────────────────────────────────────────────────────────────────

export const makeRoom = (overrides?: Partial<Room>): Room => ({
  id: testId('room'),
  name: 'ห้องทดสอบ',
  items: [],
  is_suspended: false,
  ...overrides,
});

export const makeCustomer = (overrides?: Partial<Customer>): Customer => ({
  name: 'คุณทดสอบ',
  phone: '081-000-0000',
  address: 'ที่อยู่ทดสอบ',
  taxId: '',
  installationAddress: '',
  useSameAddress: true,
  showInstallationAddress: true,
  ...overrides,
});

export const makeDiscount = (overrides?: Partial<Discount>): Discount => ({
  type: 'percent',
  value: 5,
  is_enabled: true,
  ...overrides,
});
