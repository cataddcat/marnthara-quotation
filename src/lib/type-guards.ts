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
