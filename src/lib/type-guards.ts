import { ITEM_TYPES } from '@/config/enums';
import {
  ItemData,
  CurtainItemInput,
  WallpaperItemInput,
  RemovalItemInput,
  AreaItemInput,
} from '@/types';

export const isCurtainItem = (item: ItemData): item is ItemData & CurtainItemInput =>
  item.type === ITEM_TYPES.CURTAIN;

export const isWallpaperItem = (item: ItemData): item is ItemData & WallpaperItemInput =>
  item.type === ITEM_TYPES.WALLPAPER;

export const isRemovalItem = (item: ItemData): item is ItemData & RemovalItemInput =>
  item.type === ITEM_TYPES.REMOVAL;

export const isAreaItem = (item: ItemData): item is ItemData & AreaItemInput =>
  !isCurtainItem(item) && !isWallpaperItem(item) && !isRemovalItem(item);

/**
 * มีมิติ กว้าง×สูง เป็น field ตรง (ม่าน + งานพื้นที่ทุกชนิด) — ใช้แทน cast `as Record` เวลาอ่านขนาด
 * แบบ generic. วอลเปเปอร์ไม่เข้าข่าย (กว้างเป็น widths[] ราย ผนัง) · รื้อถอนไม่มีมิติ.
 */
export const hasDimensions = (
  item: ItemData
): item is ItemData & (CurtainItemInput | AreaItemInput) =>
  isCurtainItem(item) || isAreaItem(item);
