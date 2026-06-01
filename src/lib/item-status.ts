import { ItemData } from '@/types';
import { ITEM_TYPES, LAYER_MODES, ItemTypeKey } from '@/config/enums';
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

/** ป้ายบอกสิ่งที่ยังขาด (ใช้กับ chip บน ItemCard) */
export const incompleteLabel = (item: ItemData): string =>
  item.type === ITEM_TYPES.CURTAIN ? 'ยังไม่ใส่ผ้า' : 'ยังไม่ใส่ราคา';
