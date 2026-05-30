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
 * "ยังไม่เสร็จ" (incomplete) = รายการที่ "เริ่มแล้ว" (มีขนาด) แต่ยังขาดข้อมูลสำคัญ
 * ที่ทำให้พร้อมออกใบเสนอราคา — ใช้ติดธงจุดที่วัดไว้หน้างานแล้วยังไม่ได้เติมรายละเอียด
 *
 * นำร่อง: ผ้าม่านเท่านั้น ประเภทอื่นคืน false จนกว่าจะออกแบบเกณฑ์เฉพาะในรอบถัดไป
 */
export const isItemIncomplete = (item: ItemData): boolean => {
  if (item.type !== ITEM_TYPES.CURTAIN) return false;

  const width = toNum(item.width_m);
  const height = toNum(item.height_m);
  // ยังไม่เริ่ม (ไม่มีขนาด) → ไม่นับว่า "ค้างรายละเอียด"
  if (width <= 0 || height <= 0) return false;

  // กำหนดราคาเอง → ถือว่าพร้อมแล้ว
  if (item.enable_set_price && toNum(item.set_price_override) > 0) return false;

  const layer = item.layer_mode || LAYER_MODES.MAIN;
  const needMain = layer === LAYER_MODES.MAIN || layer === LAYER_MODES.DOUBLE;
  const needSheer = layer === LAYER_MODES.SHEER || layer === LAYER_MODES.DOUBLE;

  const hasMain = !!item.code || toNum(item.price_per_m_raw) > 0;
  const hasSheer = !!item.sheer_code || toNum(item.sheer_price_per_m) > 0;

  if (needMain && !hasMain) return true;
  if (needSheer && !hasSheer) return true;
  return false;
};
