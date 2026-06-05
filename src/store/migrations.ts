import { ITEM_TYPES, LAYER_MODES } from '@/config/enums';

/**
 * Persist migrations — แปลงข้อมูล schema เก่าใน localStorage ให้เข้ากับโครงสร้างปัจจุบัน
 *
 * ที่มา: ข้อมูลรุ่นเก่าเก็บผ้าม่านเป็น `type: 'set'` พร้อมชื่อฟิลด์เดิม (fabric_code, track_color,
 * sheer_fabric_code) และ "ไม่มี" layer_mode — ทำให้ PricingEngine ขึ้น
 * "Unknown item type detected" และคิดราคาผิด (ตกผ้าโปร่ง) migration นี้ทำให้ครั้งเดียวตอนโหลด
 */

type RawItem = Record<string, unknown>;

/** legacy `fabric_variant` (เช่น "ทึบ&โปร่ง") → layer_mode ปัจจุบัน */
const deriveLayerMode = (variant: unknown): string => {
  const v = typeof variant === 'string' ? variant : '';
  const hasMain = v.includes('ทึบ');
  const hasSheer = v.includes('โปร่ง');
  if (hasMain && hasSheer) return LAYER_MODES.DOUBLE;
  if (hasSheer) return LAYER_MODES.SHEER;
  return LAYER_MODES.MAIN;
};

/**
 * แปลงรายการเดียวให้เข้ากับ schema ปัจจุบัน — idempotent (รายการที่ถูกต้องอยู่แล้วจะไม่ถูกแตะ)
 * - `type: 'set'` → `'curtain'` + เดา layer_mode จาก fabric_variant (ถ้ายังไม่มี)
 * - ชื่อฟิลด์เก่า → ใหม่ (เฉพาะเมื่อฟิลด์ปลายทางยังว่าง): fabric_code→code,
 *   sheer_fabric_code→sheer_code, track_color→rail_color
 * - ขนาดที่เก็บเป็น number → string (ให้ตรงกับฟอร์ม/สคีมาปัจจุบัน)
 */
export const migrateLegacyItem = (raw: unknown): unknown => {
  if (!raw || typeof raw !== 'object') return raw;
  const item: RawItem = { ...(raw as RawItem) };

  if (item.type === 'set') {
    item.type = ITEM_TYPES.CURTAIN;

    if (item.layer_mode == null || item.layer_mode === '') {
      item.layer_mode = deriveLayerMode(item.fabric_variant);
    }
    if (item.code == null && typeof item.fabric_code === 'string') {
      item.code = item.fabric_code;
    }
    if (item.sheer_code == null && typeof item.sheer_fabric_code === 'string') {
      item.sheer_code = item.sheer_fabric_code;
    }
    if (item.rail_color == null && typeof item.track_color === 'string') {
      item.rail_color = item.track_color;
    }
  }

  if (typeof item.width_m === 'number') item.width_m = String(item.width_m);
  if (typeof item.height_m === 'number') item.height_m = String(item.height_m);

  return item;
};

/** v2→v3: ค่าบริการที่เคยปนอยู่ใน accessoryCosts → serviceCosts */
const SERVICE_KEYS = [
  'install_point',
  'install_min',
  'transport_base',
  'transport_upcountry',
  'fuel_diesel_liter',
  'removal_per_point',
];

/**
 * ย้าย service keys ออกจาก accessoryCosts → serviceCosts — idempotent
 * (ของที่ปกติอยู่แล้วจะไม่ถูกแตะ; รันได้ซ้ำโดยไม่เพี้ยน)
 */
const migrateCostVaults = (state: Record<string, unknown>): Record<string, unknown> => {
  const accessory = state.accessoryCosts;
  if (!accessory || typeof accessory !== 'object') return state;

  const acc = { ...(accessory as Record<string, unknown>) };
  const service = { ...((state.serviceCosts as Record<string, unknown>) ?? {}) };

  let moved = false;
  for (const key of SERVICE_KEYS) {
    if (key in acc) {
      if (!(key in service)) service[key] = acc[key]; // ไม่ทับค่าที่ user ตั้งใน serviceCosts แล้ว
      delete acc[key];
      moved = true;
    }
  }
  if (!moved) return state;
  return { ...state, accessoryCosts: acc, serviceCosts: service };
};

/** แปลง persisted state ทั้งก้อน — เดินทุกห้อง/ทุกรายการ (ทนต่อรูปร่างที่ไม่คาดคิด) */
export const migrateLegacyState = (persisted: unknown): unknown => {
  if (!persisted || typeof persisted !== 'object') return persisted;
  // v2→v3: จัดถังต้นทุนก่อน (รันแม้ rooms จะมีรูปร่างผิดคาด)
  const state = migrateCostVaults(persisted as Record<string, unknown>);

  const rooms = state.rooms;
  if (!Array.isArray(rooms)) return state;

  return {
    ...state,
    rooms: rooms.map((room) => {
      if (!room || typeof room !== 'object') return room;
      const r = room as Record<string, unknown>;
      if (!Array.isArray(r.items)) return room;
      return { ...r, items: r.items.map(migrateLegacyItem) };
    }),
  };
};
