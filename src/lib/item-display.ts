import { ItemData } from '@/types';
import { ITEM_CONFIG, CURTAIN_STYLES } from '@/config/constants';
import { ITEM_TYPES } from '@/config/enums';

// รูปแบบม่าน → ป้ายไทยสั้น (ตัด " (English)" ออกจาก CURTAIN_STYLES) สำหรับ title การ์ด
// เช่น 'ลอน' → 'ม่านลอน', 'จีบ' → 'ม่านจีบ'
// แป๊บ: title ใช้ "ม่านแป๊บ" (ตัดหาง "/สอดราง" ที่เป็นคำพ้อง) — title นี้คือตัวยาวสุดในชุดที่จำกัด
//   วัดแล้ว truncate เฉพาะตอนมีชิปสถานะบนจอ <375px (ItemCard Row 1); ย่อจุดนี้จุดเดียวกัน truncate
//   โดยไม่เพิ่มความสูงการ์ด ส่วน dropdown เลือกสไตล์ยังโชว์ "ม่านแป๊บ/สอดราง (Rod)" เต็มตามเดิม
const CURTAIN_STYLE_TITLE_OVERRIDE: Record<string, string> = {
  แป๊บ: 'ม่านแป๊บ',
};
const CURTAIN_STYLE_LABELS: Record<string, string> = Object.fromEntries(
  CURTAIN_STYLES.map((s) => [
    s.value,
    CURTAIN_STYLE_TITLE_OVERRIDE[s.value] ?? s.label.replace(/\s*\(.*?\)\s*/, '').trim(),
  ])
);

/**
 * ชื่อรายการสำหรับแสดงผล — ผ้าม่านต่อท้ายด้วยรูปแบบให้ระบุชนิดชัด เช่น "ผ้าม่าน ม่านลอน",
 * ประเภทอื่นใช้ชื่อตามเดิม ("ม่านม้วน", "ฉากกั้นห้อง", ...)
 * ใช้ร่วมกันระหว่าง ItemCard / การ์ดห้อง compact / sidebar ภาพรวม
 */
export const itemTitle = (item: ItemData): string => {
  const baseName = ITEM_CONFIG[item.type]?.name || 'สินค้า';
  const styleLabel =
    item.type === ITEM_TYPES.CURTAIN && item.style
      ? CURTAIN_STYLE_LABELS[item.style] || item.style
      : '';
  return styleLabel ? `${baseName} ${styleLabel}` : baseName;
};

/**
 * สรุป "ชนิดสินค้า × จำนวน" ของรายการในห้อง — group ด้วย itemTitle (แยกรูปแบบม่าน เช่น
 * "ผ้าม่าน ม่านลอน" / "ผ้าม่าน ม่านจีบ") · นับเฉพาะรายการที่ไม่ถูกพัก (สอดคล้องตัวเลข "N รายการ")
 * ลำดับชนิดตามที่พบครั้งแรกในห้อง (คงลำดับงานหน้างาน)
 */
export const itemTypeBreakdown = (items: ItemData[]): { label: string; count: number }[] => {
  const counts = new Map<string, number>();
  items
    .filter((i) => !i.is_suspended)
    .forEach((item) => {
      const label = itemTitle(item);
      counts.set(label, (counts.get(label) ?? 0) + 1);
    });
  return [...counts.entries()].map(([label, count]) => ({ label, count }));
};
