import { ItemData, CurtainItemInput, WallpaperItemInput, AreaItemInput } from '@/types';
import { toNum } from '@/utils/formatters';
import { ITEM_TYPES } from '@/config/enums';

const _getSvgFrame = (dimensions: { width: number; height: number }) => {
  const { width = 0, height = 0 } = dimensions;
  const MAX_W = 80;
  const MAX_H = 80;
  const ratio = width > 0 && height > 0 ? Math.min(MAX_W / width, MAX_H / height) : 1;

  const drawW = width * ratio || 50;
  const drawH = height * ratio || 50;
  const x = (100 - drawW) / 2;
  const y = (90 - drawH) / 2;

  return { x, y, w: drawW, h: drawH };
};

const _drawCurtain = (
  item: CurtainItemInput,
  f: { x: number; y: number; w: number; h: number }
) => {
  const isRoman = item.style === 'ม่านพับ';

  let path = '';
  if (isRoman) {
    const folds = 4;
    const foldH = f.h / folds;
    for (let i = 0; i < folds; i++) {
      path += `<rect x="${f.x}" y="${f.y + i * foldH}" width="${f.w}" height="${foldH - 1}" fill="#e2e8f0" stroke="#94a3b8" stroke-width="0.5" />`;
    }
  } else {
    path = `<rect x="${f.x}" y="${f.y}" width="${f.w}" height="${f.h}" fill="#f1f5f9" stroke="#cbd5e1" rx="2" />`;
    for (let i = 1; i < 4; i++) {
      path += `<path d="M${f.x + (f.w / 4) * i} ${f.y} L${f.x + (f.w / 4) * i} ${f.y + f.h}" stroke="#e2e8f0" stroke-width="1" />`;
    }
  }

  const rail = `<rect x="${f.x - 2}" y="${f.y - 2}" width="${f.w + 4}" height="2" fill="#64748b" />`;
  return rail + path;
};

const _drawWallpaper = (
  item: WallpaperItemInput,
  f: { x: number; y: number; w: number; h: number }
) => {
  const pattern = `<pattern id="p-${item.wallpaper_code}" width="4" height="4" patternUnits="userSpaceOnUse">
      <path d="M0 4L4 0M-1 1L1 -1M3 5L5 3" stroke="#cbd5e1" stroke-width="0.5"/>
  </pattern>`;

  const walls = `<rect x="${f.x}" y="${f.y}" width="${f.w}" height="${f.h}" fill="url(#p-${item.wallpaper_code})" stroke="#94a3b8" />`;
  return `<defs>${pattern}</defs>${walls}`;
};

// [FIXED] Renamed 'item' to '_item' to silence unused var warning
const _drawBlind = (_item: AreaItemInput, f: { x: number; y: number; w: number; h: number }) => {
  const slats = 8;
  const slatH = f.h / slats;
  let g = '';
  for (let i = 0; i < slats; i++) {
    g += `<line x1="${f.x}" y1="${f.y + i * slatH}" x2="${f.x + f.w}" y2="${f.y + i * slatH}" stroke="#cbd5e1" stroke-width="1" />`;
  }
  const box = `<rect x="${f.x}" y="${f.y}" width="${f.w}" height="${f.h}" fill="none" stroke="#94a3b8" stroke-width="1" />`;
  return box + g;
};

export const generateItemVisualSvg = (item: ItemData): string => {
  if (item.type === ITEM_TYPES.REMOVAL || item.is_suspended) {
    return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="20" fill="#f1f5f9"/><path d="M40 60 L60 40 M40 40 L60 60" stroke="#cbd5e1" stroke-width="2"/></svg>`;
  }

  let w = 0,
    h = 0;
  if ('width_m' in item && 'height_m' in item) {
    w = toNum(item.width_m as string);
    h = toNum(item.height_m as string);
  } else if (item.type === ITEM_TYPES.WALLPAPER) {
    w = 3;
    h = 2.6;
  }

  const f = _getSvgFrame({ width: w, height: h });
  let content: string;

  if (item.type === ITEM_TYPES.CURTAIN) content = _drawCurtain(item as CurtainItemInput, f);
  else if (item.type === ITEM_TYPES.WALLPAPER)
    content = _drawWallpaper(item as WallpaperItemInput, f);
  else content = _drawBlind(item as AreaItemInput, f);

  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${content}</svg>`;
};
