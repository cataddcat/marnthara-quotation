import { ITEM_TYPES, LAYER_MODES } from '@/config/enums';
import { newUuid } from '@/lib/id';

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

/**
 * v4→v5: เติม key ค่าขนส่งที่เพิ่มทีหลังให้ object ที่ persist ไว้แล้ว — idempotent
 * (persist ทำ shallow merge: object เดิมแทนที่ default ทั้งก้อน → key ใหม่หายถ้าไม่ migrate;
 * ค่า literal จงใจ freeze ในไฟล์นี้ ไม่ import จาก CostDataSlice — migration ต้องนิ่งตามเวลา)
 * - serviceCosts มีอยู่แต่ไม่มี shipping_per_job → เติม 0 (ยังไม่ตั้งอัตรา)
 * - costInclude มีอยู่แต่ไม่มี shipping → เติม false (ขนส่งไม่เคยถูกนับ — opt-in)
 * - object ไหนไม่มีทั้งก้อน → ไม่แตะ (default จาก slice ครบอยู่แล้ว)
 */
const migrateShippingDefaults = (state: Record<string, unknown>): Record<string, unknown> => {
  let next = state;

  const svc = state.serviceCosts;
  if (svc && typeof svc === 'object' && !('shipping_per_job' in (svc as object))) {
    next = { ...next, serviceCosts: { ...(svc as Record<string, unknown>), shipping_per_job: 0 } };
  }

  const ci = next.costInclude;
  if (ci && typeof ci === 'object' && !('shipping' in (ci as object))) {
    next = { ...next, costInclude: { ...(ci as Record<string, unknown>), shipping: false } };
  }

  return next;
};

/**
 * v3→v4: ชื่อร้านเริ่มต้นเดิมพ่วงคำโฆษณาแอป ("Marnthara Smart Quotation") — แอปไม่ใช่
 * "เครื่องทำใบเสนอราคา" จึงเปลี่ยนเป็นชื่อแบรนด์จริง "ม่านธารา" เฉพาะกรณีที่ยังเป็นค่า default
 * เดิมเป๊ะ (ไม่แตะชื่อร้านที่ผู้ใช้ตั้งเอง) — idempotent
 */
const OLD_DEFAULT_SHOP_NAME = 'Marnthara Smart Quotation';
const migrateShopName = (state: Record<string, unknown>): Record<string, unknown> => {
  const sc = state.shopConfig;
  if (!sc || typeof sc !== 'object') return state;
  const conf = sc as Record<string, unknown>;
  if (conf.name !== OLD_DEFAULT_SHOP_NAME) return state;
  return { ...state, shopConfig: { ...conf, name: 'ม่านธารา' } };
};

/**
 * v5→v6: "รับงานที่ค้างอยู่" เข้าชั้นวางงาน (jobs[]) ตอนเปิดระบบสลับงานครั้งแรก
 *
 * ⚠️ เรียก "เฉพาะใน persist migrate" เท่านั้น — ห้ามใส่ใน migrateLegacyState เพราะ backup.ts
 * ใช้ migrateLegacyState ร่วม และไฟล์ backup = งานเดียว ไม่ใช่ registry (จะได้ jobs ปลอม)
 *
 * - มี jobs อยู่แล้ว → ไม่แตะ
 * - มีงาน live (ชื่อลูกค้า/มีห้อง) → ห่อเป็น JobBundle ก้อนเดียว seed jobs + currentJobId
 * - ว่าง → jobs=[], currentJobId=null (literal 'lead' จงใจ freeze — migration ต้องนิ่งตามเวลา)
 */
export const adoptCurrentJobIntoRegistry = (
  state: Record<string, unknown>
): Record<string, unknown> => {
  if (Array.isArray(state.jobs)) return state;

  const customer = (state.customer ?? {}) as Record<string, unknown>;
  const rooms = Array.isArray(state.rooms) ? state.rooms : [];
  const hasName = typeof customer.name === 'string' && customer.name.trim().length > 0;
  if (!hasName && rooms.length === 0) {
    return { ...state, jobs: [], currentJobId: null, jobStatus: 'lead' };
  }

  const now = new Date().toISOString();
  const id = typeof customer.id === 'string' && customer.id ? customer.id : newUuid();
  const customerWithId = { ...customer, id };
  const bundle = {
    id,
    customerCode: typeof customer.code === 'string' ? customer.code : undefined,
    customer: customerWithId,
    rooms,
    discount: state.discount ?? { type: 'amount', value: 0, is_enabled: false },
    receipts: Array.isArray(state.receipts) ? state.receipts : [],
    expenses: Array.isArray(state.expenses) ? state.expenses : [],
    status: 'lead',
    createdAt: now,
    updatedAt: now,
  };
  return {
    ...state,
    customer: customerWithId,
    jobs: [bundle],
    currentJobId: id,
    jobStatus: 'lead',
  };
};

/** แปลง persisted state ทั้งก้อน — เดินทุกห้อง/ทุกรายการ (ทนต่อรูปร่างที่ไม่คาดคิด) */
export const migrateLegacyState = (persisted: unknown): unknown => {
  if (!persisted || typeof persisted !== 'object') return persisted;
  // v2→v3: จัดถังต้นทุนก่อน (รันแม้ rooms จะมีรูปร่างผิดคาด)
  let state = migrateCostVaults(persisted as Record<string, unknown>);
  // v3→v4: ชื่อร้าน default เดิม → ชื่อแบรนด์จริง
  state = migrateShopName(state);
  // v4→v5: เติม key ค่าขนส่ง (shipping_per_job / costInclude.shipping) ให้ store เดิม
  state = migrateShippingDefaults(state);

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
