// src/lib/materials/projectCodes.ts
// ────────────────────────────────────────────────────────────────────────────
// เก็บ "รหัส + ราคาขาย" ที่ผู้ใช้กรอกไว้แล้วในงานปัจจุบัน (rooms) ต่อหมวด —
// เพื่อนำกลับมาเป็นตัวเลือก/auto-fill ที่ "จุดต่อไป" โดยไม่ต้องพิมพ์ใหม่.
//
// เป็นแหล่ง suggestion แบบ "ฟรี" (derive จาก state ที่ persist อยู่แล้ว) ไม่ต้องมีกลไก capture.
// field-mapping ต่อชนิดล้อตาม buildSummary.ts (single source of truth ของการอ่านรหัส/ฟิลด์).
// ────────────────────────────────────────────────────────────────────────────

import type { Room, CurtainItemInput, WallpaperItemInput, AreaItemInput } from '@/types';
import { ITEM_TYPES, FAVORITE_CATEGORIES } from '@/config/enums';
import { normalizeCode } from '@/lib/codes';
import { toNum } from '@/utils/formatters';

export interface ProjectCode {
  /** รหัส normalize แล้ว */
  code: string;
  /** ราคาขายล่าสุดที่กรอกไว้กับรหัสนี้ (0 = ยังไม่ได้ใส่ราคา) */
  sellPrice: number;
}

/**
 * รวมรหัสที่ถูกใช้ในงานปัจจุบันสำหรับหมวดที่ระบุ (distinct ด้วย normalizeCode).
 * ราคาที่คืน = ค่าที่ไม่เป็นศูนย์ล่าสุดที่พบ (กันราคา 0 ทับราคาจริงที่เคยกรอก).
 */
export function collectProjectCodes(rooms: Room[], category: string): ProjectCode[] {
  const byCode = new Map<string, ProjectCode>();

  const record = (rawCode: string | undefined, rawPrice: number | string | undefined) => {
    const code = normalizeCode(rawCode || '');
    if (!code) return;
    const price = toNum(rawPrice);
    const prev = byCode.get(code);
    // last-seen wins, แต่ราคา 0 ไม่ทับราคาที่เคยมีค่า
    byCode.set(code, { code, sellPrice: price > 0 ? price : prev?.sellPrice ?? 0 });
  };

  for (const room of rooms) {
    for (const item of room.items) {
      if (category === FAVORITE_CATEGORIES.CURTAIN_MAIN) {
        if (item.type === ITEM_TYPES.CURTAIN) {
          const c = item as CurtainItemInput;
          record(c.code, c.price_per_m_raw);
        }
      } else if (category === FAVORITE_CATEGORIES.CURTAIN_SHEER) {
        if (item.type === ITEM_TYPES.CURTAIN) {
          const c = item as CurtainItemInput;
          record(c.sheer_code, c.sheer_price_per_m);
        }
      } else if (category === FAVORITE_CATEGORIES.WALLPAPER) {
        if (item.type === ITEM_TYPES.WALLPAPER) {
          const w = item as WallpaperItemInput;
          record(w.wallpaper_code, w.price_per_roll);
        }
      } else if (item.type === category) {
        // หมวดพื้นที่: ค่า FAVORITE_CATEGORIES === ITEM_TYPES (มู่ลี่/ฉาก/มุ้ง)
        const a = item as AreaItemInput;
        record(a.code, a.price_sqyd);
      }
    }
  }

  return [...byCode.values()];
}
