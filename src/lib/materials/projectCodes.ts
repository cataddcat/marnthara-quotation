// src/lib/materials/projectCodes.ts
// ────────────────────────────────────────────────────────────────────────────
// เก็บ "รหัส + ราคาขาย" ที่ผู้ใช้กรอกไว้แล้วในงานปัจจุบัน (rooms) ต่อหมวด —
// เพื่อนำกลับมาเป็นตัวเลือก/auto-fill ที่ "จุดต่อไป" โดยไม่ต้องพิมพ์ใหม่.
//
// `itemCodeEntries` = single source ของ field-mapping ต่อชนิด (รหัส/ราคาขายอยู่ฟิลด์ไหน) —
// ใช้ทั้ง collectProjectCodes (derive suggestion) และ captureDrafts (auto-save รหัสที่สร้างเอง).
// field-mapping ล้อตาม buildSummary.ts.
// ────────────────────────────────────────────────────────────────────────────

import type { Room, ItemData, CurtainItemInput, WallpaperItemInput, AreaItemInput } from '@/types';
import { ITEM_TYPES, FAVORITE_CATEGORIES } from '@/config/enums';
import { normalizeCode } from '@/lib/codes';
import { toNum } from '@/utils/formatters';

export interface ProjectCode {
  /** รหัส normalize แล้ว */
  code: string;
  /** ราคาขายล่าสุดที่กรอกไว้กับรหัสนี้ (0 = ยังไม่ได้ใส่ราคา) */
  sellPrice: number;
}

/** รหัส + ราคาขาย ที่ item หนึ่งอ้างถึง (code = trim แล้ว ยังไม่ normalize) ต่อหมวด */
export interface ItemCodeEntry {
  category: string;
  code: string;
  sellPrice: number;
}

/**
 * ดึง "รหัส + ราคาขาย" ที่ item หนึ่งอ้างถึง แยกตามหมวด — single source ของ field-mapping ต่อชนิด.
 * ผ้าม่าน = 2 entry (ผ้าทึบ + ผ้าโปร่ง) · area = หมวด === item.type · รื้อถอน/ไม่มีรหัส = ว่าง.
 * code คืนแบบ trim แล้ว (ยังไม่ normalize) — ผู้เรียก normalize เอง (collect ใช้ normalizeCode, capture ผ่าน upsert).
 */
export function itemCodeEntries(item: ItemData): ItemCodeEntry[] {
  const out: ItemCodeEntry[] = [];
  const add = (
    category: string,
    rawCode: string | undefined,
    rawPrice: number | string | undefined
  ) => {
    const code = (rawCode || '').trim();
    if (!code) return;
    out.push({ category, code, sellPrice: toNum(rawPrice) });
  };

  if (item.type === ITEM_TYPES.CURTAIN) {
    const c = item as CurtainItemInput;
    add(FAVORITE_CATEGORIES.CURTAIN_MAIN, c.code, c.price_per_m_raw);
    add(FAVORITE_CATEGORIES.CURTAIN_SHEER, c.sheer_code, c.sheer_price_per_m);
  } else if (item.type === ITEM_TYPES.WALLPAPER) {
    const w = item as WallpaperItemInput;
    add(FAVORITE_CATEGORIES.WALLPAPER, w.wallpaper_code, w.price_per_roll);
  } else if (item.type !== ITEM_TYPES.REMOVAL) {
    // หมวดพื้นที่: ค่า FAVORITE_CATEGORIES === ITEM_TYPES (มู่ลี่/ฉาก/มุ้ง)
    const a = item as AreaItemInput;
    add(item.type, a.code, a.price_sqyd);
  }

  return out;
}

/**
 * รวมรหัสที่ถูกใช้ในงานปัจจุบันสำหรับหมวดที่ระบุ (distinct ด้วย normalizeCode).
 * ราคาที่คืน = ค่าที่ไม่เป็นศูนย์ล่าสุดที่พบ (กันราคา 0 ทับราคาจริงที่เคยกรอก).
 */
export function collectProjectCodes(rooms: Room[], category: string): ProjectCode[] {
  const byCode = new Map<string, ProjectCode>();

  const record = (rawCode: string, price: number) => {
    const code = normalizeCode(rawCode);
    if (!code) return;
    const prev = byCode.get(code);
    // last-seen wins, แต่ราคา 0 ไม่ทับราคาที่เคยมีค่า
    byCode.set(code, { code, sellPrice: price > 0 ? price : prev?.sellPrice ?? 0 });
  };

  for (const room of rooms) {
    for (const item of room.items) {
      for (const e of itemCodeEntries(item)) {
        if (e.category === category) record(e.code, e.sellPrice);
      }
    }
  }

  return [...byCode.values()];
}
