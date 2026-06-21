import { ItemData, Room } from '@/types';
import { ITEM_TYPES, LAYER_MODES, ItemTypeKey } from '@/config/enums';
import { ITEM_CONFIG, STYLES_WITHOUT_OPENING } from '@/config/constants';
import { toNum } from '@/utils/formatters';

/**
 * มี "ข้อมูลขั้นต่ำ" พอที่จะถือว่ารายการ "เริ่มแล้ว" หรือยัง — ใช้ gate การสร้าง draft
 * (auto-save) และปุ่ม "บันทึก & เพิ่มถัดไป" ให้ทำงานได้ทุกประเภทสินค้า
 * - วอลเปเปอร์: มีความกว้างผนังแรก
 * - งานรื้อถอน: มีรายละเอียด (description)
 * - ที่เหลือ (ผ้าม่าน/มู่ลี่/พาร์ทิชัน/จีบ): มีความกว้าง (width_m)
 */
export const hasMinimumItemData = (
  type: ItemTypeKey,
  data: Record<string, unknown>
): boolean => {
  if (type === ITEM_TYPES.WALLPAPER) {
    const widths = data.widths as string[] | undefined;
    return toNum(widths?.[0]) > 0;
  }
  if (type === ITEM_TYPES.REMOVAL) {
    const desc = data.description as string | undefined;
    return !!desc && desc.trim().length > 0;
  }
  return toNum(data.width_m as string | number | undefined) > 0;
};

/**
 * "ยังไม่เสร็จ" (incomplete) = รายการที่ "เริ่มแล้ว" (มีข้อมูลขั้นต่ำ) แต่ยังขาดสิ่งสำคัญ
 * ที่ทำให้พร้อมออกใบเสนอราคา (โดยทั่วไป = ราคา) — ใช้ติดธงจุดที่วัด/จดไว้หน้างานแต่ยังไม่ครบ
 * รายการที่ "กำหนดราคาเอง" (override > 0) ถือว่าพร้อมแล้วเสมอ
 */
export const isItemIncomplete = (item: ItemData): boolean => {
  // กำหนดราคาเอง → พร้อมแล้ว (ทุกประเภท)
  if (item.enable_set_price && toNum(item.set_price_override) > 0) return false;

  switch (item.type) {
    case ITEM_TYPES.CURTAIN: {
      if (toNum(item.width_m) <= 0 || toNum(item.height_m) <= 0) return false;
      const layer = item.layer_mode || LAYER_MODES.MAIN;
      const needMain = layer === LAYER_MODES.MAIN || layer === LAYER_MODES.DOUBLE;
      const needSheer = layer === LAYER_MODES.SHEER || layer === LAYER_MODES.DOUBLE;
      const hasMain = !!item.code || toNum(item.price_per_m_raw) > 0;
      const hasSheer = !!item.sheer_code || toNum(item.sheer_price_per_m) > 0;
      if (needMain && !hasMain) return true;
      if (needSheer && !hasSheer) return true;
      return false;
    }

    case ITEM_TYPES.WALLPAPER: {
      const started = toNum(item.widths?.[0]) > 0 && toNum(item.height_m) > 0;
      if (!started) return false;
      return toNum(item.price_per_roll) <= 0;
    }

    case ITEM_TYPES.REMOVAL: {
      const started = !!(item.description && item.description.trim());
      if (!started) return false;
      return toNum(item.price_per_item) <= 0;
    }

    // สินค้าแบบพื้นที่ (มู่ลี่/ม่านม้วน/ตั้ง/อลู/พาร์ทิชัน/จีบ) — ราคาอยู่ที่ price_sqyd
    case ITEM_TYPES.WOODEN_BLIND:
    case ITEM_TYPES.ROLLER_BLIND:
    case ITEM_TYPES.VERTICAL_BLIND:
    case ITEM_TYPES.ALUMINUM_BLIND:
    case ITEM_TYPES.PARTITION:
    case ITEM_TYPES.PLEATED_SCREEN: {
      if (toNum(item.width_m) <= 0 || toNum(item.height_m) <= 0) return false;
      return toNum(item.price_sqyd) <= 0;
    }

    default:
      return false;
  }
};

/**
 * ขนาด/ข้อมูลวัด "ครบ" หรือยัง — กว้าง×สูง (ส่วนใหญ่) · วอลล์=ผนังแรก+สูง · รื้อถอน=มีรายละเอียด
 * แหล่งเดียวของเกณฑ์ "ขนาดครบ" ใช้ร่วมโดย isItemReady + incompleteLabel
 */
const hasCompleteMeasurement = (item: ItemData): boolean => {
  if (item.type === ITEM_TYPES.WALLPAPER)
    return toNum(item.widths?.[0]) > 0 && toNum(item.height_m) > 0;
  if (item.type === ITEM_TYPES.REMOVAL) return !!(item.description && item.description.trim());
  return toNum(item.width_m) > 0 && toNum(item.height_m) > 0;
};

/** ป้ายบอกสิ่งที่ยังขาด (ใช้กับ chip บน ItemCard) — ขนาดยังไม่ครบมาก่อน แล้วค่อยผ้า/ราคา */
export const incompleteLabel = (item: ItemData): string => {
  if (!hasCompleteMeasurement(item))
    return item.type === ITEM_TYPES.REMOVAL ? 'ยังไม่ใส่รายละเอียด' : 'ยังไม่ใส่ขนาด';
  return item.type === ITEM_TYPES.CURTAIN ? 'ยังไม่ใส่ผ้า' : 'ยังไม่ใส่ราคา';
};

/** "ว่างเปล่า" = ยังไม่มีข้อมูลขั้นต่ำ (ตรงข้ามกับ hasMinimumItemData) — ไม่ควรนับ/ไม่ควรให้เลขลำดับ */
export const isItemEmpty = (item: ItemData): boolean =>
  !hasMinimumItemData(item.type, item as unknown as Record<string, unknown>);

/**
 * "พร้อม" (ครบจริง) = ไม่ว่าง + ไม่ incomplete + ขนาดครบ — ใช้ตัดสินป้าย "ครบ" ของห้อง
 * กันเคสที่ `isItemIncomplete` คืน false ตอนขนาดยังไม่ครบ (เช่น มีกว้างแต่ยังไม่ใส่สูง)
 * ทำให้ห้องขึ้น "ครบ" ทั้งที่รายการยังกรอกไม่จบ
 */
export const isItemReady = (item: ItemData): boolean =>
  !isItemEmpty(item) && !isItemIncomplete(item) && hasCompleteMeasurement(item);

/**
 * "ค้าง" (ต้องตามเก็บให้ครบ) = เริ่มแล้ว (ไม่ว่าง) แต่ยัง "ไม่พร้อม" — กระจกเงาของ isItemReady
 * ครอบคลุมทั้งขาดผ้า/ราคา (isItemIncomplete) และ "กรอกกว้างแต่ลืมสูง" ที่ isItemIncomplete มองข้าม
 * ใช้กับป้าย "ค้าง N จุด" (ห้อง/งาน) + ชิปบน ItemCard ให้ตรงกับเกณฑ์ "ครบ" เสมอ
 */
export const isItemPending = (item: ItemData): boolean =>
  !isItemEmpty(item) && !isItemReady(item);

/** ลำดับแสดง (0-based) เฉพาะรายการที่ "ไม่ว่าง"; รายการว่าง = -1 (ItemCard จะไม่โชว์เลข ⌗) */
export const displayIndexes = (items: ItemData[]): number[] => {
  let n = 0;
  return items.map((it) => (isItemEmpty(it) ? -1 : n++));
};

// ── ทิศทางการเปิด (opening_style) ───────────────────────────────────────────

// ประเภทที่ "ต้องเลือกทิศเปิด" นอกเหนือจากผ้าม่าน (ม่านปรับแสง=เก็บใบ, ฉากกั้น/มุ้งจีบ=รูปแบบเปิด)
const TYPES_NEED_OPENING: readonly string[] = [
  ITEM_TYPES.VERTICAL_BLIND,
  ITEM_TYPES.PARTITION,
  ITEM_TYPES.PLEATED_SCREEN,
];

/**
 * ประเภท/สไตล์นี้ต้องระบุทิศเปิดไหม (ไม่สนว่าระบุแล้วหรือยัง) —
 * ผ้าม่าน: ทุกสไตล์ยกเว้น พับ/แป๊บ (STYLES_WITHOUT_OPENING) · ม่านปรับแสง/ฉากกั้น/มุ้งจีบ: ต้องเสมอ
 */
export const requiresOpeningStyle = (item: ItemData): boolean => {
  if (item.type === ITEM_TYPES.CURTAIN) return !STYLES_WITHOUT_OPENING.includes(item.style);
  return TYPES_NEED_OPENING.includes(item.type);
};

/**
 * รายการที่ "เริ่มแล้ว" (active, มีความกว้าง) แต่ยังไม่เลือกทิศเปิด — ใช้ gate การออกเอกสารผลิต
 * (ใบสั่งราง/สั่งของ/ช่างเย็บ): ✅ เจ้าของร้านยืนยัน (มิ.ย. 2026) ว่า "ต้องใส่ทิศเปิดก่อนออกเอกสาร"
 * เพราะค่าว่างจะถูกตีความเป็น "แยกกลาง" เงียบ ๆ → ลูกล้อ/สไลด์ผิด
 */
export const missingOpeningItems = (
  rooms: Room[]
): { roomName: string; label: string }[] => {
  const out: { roomName: string; label: string }[] = [];
  rooms.forEach((room) => {
    if (room.is_suspended) return;
    room.items.forEach((item) => {
      if (item.is_suspended) return;
      if (!requiresOpeningStyle(item)) return;
      if ('opening_style' in item && item.opening_style) return;
      const width = toNum((item as { width_m?: number | string }).width_m);
      if (width <= 0) return; // ยังไม่เริ่ม — เอกสารไม่นับรายการนี้อยู่แล้ว
      const name = ITEM_CONFIG[item.type]?.name ?? 'สินค้า';
      const style = item.type === ITEM_TYPES.CURTAIN && item.style ? ` ${item.style}` : '';
      out.push({ roomName: room.name, label: `${name}${style}` });
    });
  });
  return out;
};
