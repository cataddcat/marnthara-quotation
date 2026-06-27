import { ITEM_TYPES } from '@/config/enums';
import { cn } from '@/lib/utils';

/**
 * โทนสี brand ต่อชนิดสินค้า — ใช้กับ valueClass (ตัวเลข) + iconClass (ไอคอน section) ในฟอร์ม.
 */
export type ThemeStyle = {
  /** สีตัวเลข/ค่า (valueClass) */
  text: string;
  /** สีไอคอน section (iconClass) */
  icon: string;
};

/**
 * ⚠️ ต้องเป็น string literal **static** เท่านั้น (เช่น `'text-brand-curtain'`) — ห้ามประกอบจาก template var.
 * Tailwind v4 สแกนซอร์สแบบ static: คลาสที่สร้างจากตัวแปร (`text-[hsl(var(${x}))]`) ไม่เคยปรากฏเป็นคลาสเต็ม
 * → scanner มองไม่เห็น → ไม่ generate CSS → สีตายเงียบ. (ดู memory `tailwind-dynamic-class-gotcha`
 * + แพทเทิร์น `TYPE_CHIP_PLATE` ใน ItemCard.tsx). สี `brand-*` ลงทะเบียนเป็น `@theme` ใน src/index.css.
 */
const BRAND_TEXT: Record<string, string> = {
  [ITEM_TYPES.CURTAIN]: 'text-brand-curtain',
  [ITEM_TYPES.WALLPAPER]: 'text-brand-wallpaper',
  [ITEM_TYPES.ROLLER_BLIND]: 'text-brand-roller',
  [ITEM_TYPES.WOODEN_BLIND]: 'text-brand-wood',
  [ITEM_TYPES.VERTICAL_BLIND]: 'text-brand-vertical',
  [ITEM_TYPES.ALUMINUM_BLIND]: 'text-brand-alum',
  [ITEM_TYPES.PARTITION]: 'text-brand-partition',
  [ITEM_TYPES.PLEATED_SCREEN]: 'text-brand-screen',
  [ITEM_TYPES.REMOVAL]: 'text-brand-removal',
};

export const getItemTheme = (type: string): ThemeStyle => {
  const brand = BRAND_TEXT[type] ?? 'text-foreground';
  return { text: brand, icon: brand };
};

/* ── Segmented / option toggle — recipe เดียวทุกฟอร์ม ───────────────────────── */

/** ราง (track) ของ segmented control */
export const SEGMENTED_TRACK = 'bg-muted/50 p-1 rounded-xl';

/**
 * คลาสของแต่ละปุ่มใน segmented control — active = ยกขึ้นเป็นการ์ด + ข้อความสี brand
 * ใช้ร่วมทุกฟอร์มแทนการ reimplement สี active/radius/padding ที่ drift กันเอง
 */
export const segmentedItemClass = (active: boolean, theme: ThemeStyle): string =>
  cn(
    'flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-all',
    active
      ? cn('bg-card shadow-sm', theme.text)
      : 'text-muted-foreground hover:text-foreground'
  );

/* ── Radio tile — ไทล์ขอบรายตัว (เข้าชุด OpeningStyleSelector/LayerSelector tiles) ───── */

/**
 * คลาสปุ่มไทล์ radio — ขอบรายตัว (border-2), active = ขอบเข้ม + พื้น accent.
 * recipe เดียวกับ OpeningStyleSelector/LayerSelector(variant="tiles") เพื่อกัน drift ของโค้ดใหม่.
 * ผู้เรียกใส่ไอคอน + ป้าย + badge `Check` เองด้านใน (เหมือน OpeningStyleSelector).
 */
export const radioTileClass = (active: boolean): string =>
  cn(
    'relative flex flex-col items-center justify-center h-16 rounded-xl border-2 transition-all active:scale-95',
    active
      ? 'border-foreground bg-accent text-foreground'
      : 'border-border bg-card text-muted-foreground hover:bg-muted/30 hover:border-foreground/40'
  );
