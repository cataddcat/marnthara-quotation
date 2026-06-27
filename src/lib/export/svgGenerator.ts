// src/lib/export/svgGenerator.ts
// ────────────────────────────────────────────────────────────────────────────
// Proportional, *semantic* item drawings for the Lookbook / reports.
// Each drawing communicates: what kind of curtain/blind, which way it opens, and
// which side the cord/chain is on — plus W×H dimension labels.
//
// Ported & adapted from the vanilla reference (AOE_Vite_ST/src/lib/documentGenerator.js).
// All styling is INLINE (fill/stroke/font attributes) so it survives html2canvas
// capture without depending on any external CSS classes.
// ────────────────────────────────────────────────────────────────────────────

import {
  ItemData,
  CurtainItemInput,
  AreaItemInput,
  WallpaperItemInput,
} from '@/types';
import { toNum } from '@/utils/formatters';
import { ITEM_TYPES } from '@/config/enums';
import { STYLES_WITHOUT_OPENING } from '@/config/constants';

// Inline palette (theme-neutral; the Lookbook page is always light)
const C = {
  frame: '#94a3b8',
  opaque: '#cbd5e1',
  opaqueStroke: '#64748b',
  sheer: '#eef2f7',
  sheerStroke: '#cbd5e1',
  slat: '#e2e8f0',
  slatStroke: '#94a3b8',
  wood: '#e8dcc8',
  woodStroke: '#b08d57',
  accent: '#1d4ed8', // blue-700 — opening direction + cord/chain (โทนมิติ ทะเบียน §2.1 — sky สงวนให้ hardware)
  dim: '#94a3b8',
  dimText: '#64748b',
} as const;

interface Frame {
  x: number;
  y: number;
  w: number;
  h: number;
  lines: string;
}

const FALLBACK_SVG =
  '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">' +
  '<circle cx="50" cy="50" r="18" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1"/>' +
  '<path d="M42 58 L58 42 M42 42 L58 58" stroke="#94a3b8" stroke-width="2"/></svg>';

const NO_SIZE_SVG =
  '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">' +
  `<text x="50" y="52" font-size="9" fill="${C.dimText}" text-anchor="middle" font-family="sans-serif">ไม่มีขนาด</text></svg>`;

// ── Frame: aspect-correct rectangle (PADDING 15) + dimension tick lines/labels ──
function frame(width: number, height: number): Frame {
  const PAD = 15;
  const MAX = 100 - PAD * 2; // 70
  const scale = width > 0 && height > 0 ? Math.min(MAX / width, MAX / height) : 1;
  const w = width * scale || 50;
  const h = height * scale || 50;
  const x = (100 - w) / 2;
  const y = (100 - h) / 2;

  const lines = `
    <line x1="${x}" y1="${y + h + 5}" x2="${x + w}" y2="${y + h + 5}" stroke="${C.dim}" stroke-width="0.5"/>
    <line x1="${x}" y1="${y + h + 3}" x2="${x}" y2="${y + h + 7}" stroke="${C.dim}" stroke-width="0.5"/>
    <line x1="${x + w}" y1="${y + h + 3}" x2="${x + w}" y2="${y + h + 7}" stroke="${C.dim}" stroke-width="0.5"/>
    <text x="50" y="${y + h + 13}" font-size="7" fill="${C.dimText}" text-anchor="middle" font-family="sans-serif">${width.toFixed(2)} ม.</text>
    <line x1="${x - 5}" y1="${y}" x2="${x - 5}" y2="${y + h}" stroke="${C.dim}" stroke-width="0.5"/>
    <line x1="${x - 7}" y1="${y}" x2="${x - 3}" y2="${y}" stroke="${C.dim}" stroke-width="0.5"/>
    <line x1="${x - 7}" y1="${y + h}" x2="${x - 3}" y2="${y + h}" stroke="${C.dim}" stroke-width="0.5"/>
    <text x="${x - 9}" y="50" font-size="7" fill="${C.dimText}" text-anchor="middle" font-family="sans-serif" transform="rotate(-90, ${x - 9}, 50)">${height.toFixed(2)} ม.</text>
  `;
  return { x, y, w, h, lines };
}

// Filled triangle arrow centered at (cx,cy), pointing left/right. Drawn as an SVG
// path (not a text glyph) so it renders identically in browser + html2canvas + print.
function arrow(cx: number, cy: number, dir: 'left' | 'right'): string {
  const s = 2.6;
  return dir === 'right'
    ? `<path d="M ${cx - s},${cy - s} L ${cx + s},${cy} L ${cx - s},${cy + s} Z" fill="${C.accent}"/>`
    : `<path d="M ${cx + s},${cy - s} L ${cx - s},${cy} L ${cx + s},${cy + s} Z" fill="${C.accent}"/>`;
}

// ── Opening direction indicator ──
//   แยกกลาง / center        → 🡄 🡆  two arrows pointing OUTWARD (panels part to both sides)
//   เก็บซ้าย / เก็บขวา / side → 🡄 / 🡆 a single arrow toward the side the fabric collects to
// Curtains store Thai values ('แยกกลาง'|'เก็บซ้าย'|'เก็บขวา') which already encode the side;
// partition/pleated store codes ('center'|'side') with no side → fall back to `fallbackSide`.
function openingIndicator(
  openingStyle: string | undefined,
  style: string | undefined,
  f: Frame,
  fallbackSide: 'left' | 'right' = 'right'
): string {
  if (!openingStyle) return '';
  if (style && STYLES_WITHOUT_OPENING.includes(style)) return '';
  const cy = f.y + f.h / 2;
  const bg = `<rect x="40" y="${cy - 7}" width="20" height="14" rx="3" fill="#ffffff" stroke="${C.accent}" stroke-width="0.5" opacity="0.95"/>`;
  let arrows: string;
  let tag: string;
  if (openingStyle === 'แยกกลาง' || openingStyle === 'center') {
    arrows = arrow(46.5, cy, 'left') + arrow(53.5, cy, 'right'); // 🡄 🡆 outward
    tag = 'center';
  } else {
    const dir =
      openingStyle === 'เก็บซ้าย' ? 'left' : openingStyle === 'เก็บขวา' ? 'right' : fallbackSide;
    arrows = arrow(50, cy, dir); // 🡄 or 🡆 toward the collect side
    tag = dir === 'left' ? 'side-left' : 'side-right';
  }
  return `<g data-open="${tag}">${bg}${arrows}</g>`;
}

// ── Cord / chain glyph on the correct side ──
const sideFromAdjustment = (v?: string): 'left' | 'right' => (v === 'ซ้าย' ? 'left' : 'right');
const sideFromChain = (v?: string): 'left' | 'right' => (v === 'left' ? 'left' : 'right');

function cord(side: 'left' | 'right', f: Frame): string {
  const cx = side === 'left' ? f.x + 6 : f.x + f.w - 6;
  const bottom = f.y + Math.min(f.h, 20);
  return (
    `<circle cx="${cx}" cy="${f.y + 2}" r="1.6" fill="${C.accent}"/>` +
    `<line x1="${cx}" y1="${f.y + 3.5}" x2="${cx}" y2="${bottom}" stroke="${C.accent}" stroke-width="0.8"/>` +
    `<circle cx="${cx}" cy="${bottom}" r="1" fill="${C.accent}"/>`
  );
}

// ── Curtain panels (split for center, single for side) layered by layer_mode ──
function curtainPanels(f: Frame, openingStyle: string | undefined, layerMode: string | undefined): string {
  const hasMain = !layerMode || layerMode === 'main' || layerMode === 'double';
  const hasSheer = layerMode === 'sheer' || layerMode === 'double';
  const split = openingStyle === 'แยกกลาง' || openingStyle === 'center';

  const panel = (fill: string, stroke: string, yOff: number): string => {
    if (split) {
      return (
        `<rect x="${f.x}" y="${f.y + yOff}" width="${f.w / 2 - 1}" height="${f.h}" fill="${fill}" stroke="${stroke}" stroke-width="0.6"/>` +
        `<rect x="${f.x + f.w / 2 + 1}" y="${f.y + yOff}" width="${f.w / 2 - 1}" height="${f.h}" fill="${fill}" stroke="${stroke}" stroke-width="0.6"/>`
      );
    }
    return `<rect x="${f.x}" y="${f.y + yOff}" width="${f.w}" height="${f.h}" fill="${fill}" stroke="${stroke}" stroke-width="0.6"/>`;
  };

  let s = '';
  if (hasSheer) s += panel(C.sheer, C.sheerStroke, 0);
  if (hasMain) s += panel(C.opaque, C.opaqueStroke, hasSheer ? -2 : 0);
  return s;
}

// ── Header decor by style (eyelet / ripplefold / pleat) ──
function curtainDecor(style: string | undefined, f: Frame): string {
  if (style === 'ตาไก่') {
    const n = Math.max(4, Math.min(12, Math.floor(f.w / 8)));
    let s = '';
    for (let i = 0; i < n; i++) {
      const gx = f.x + (f.w / (n > 1 ? n - 1 : 1)) * i;
      s += `<circle cx="${gx}" cy="${f.y + 1}" r="1.6" fill="none" stroke="${C.opaqueStroke}" stroke-width="0.7"/>`;
    }
    return s;
  }
  if (style === 'ลอน') {
    const waves = Math.max(4, Math.floor(f.w / 10));
    let path = `M ${f.x},${f.y}`;
    for (let i = 0; i < waves; i++) path += ' q 5,-4 10,0';
    return `<path d="${path}" fill="none" stroke="${C.opaqueStroke}" stroke-width="0.8"/>`;
  }
  if (style === 'จีบ') {
    const n = Math.max(4, Math.floor(f.w / 6));
    let s = '';
    for (let i = 0; i < n; i++) {
      const px = f.x + (f.w / n) * i + 1;
      s += `<line x1="${px}" y1="${f.y}" x2="${px}" y2="${f.y + 4}" stroke="${C.opaqueStroke}" stroke-width="0.7"/>`;
    }
    return s;
  }
  return '';
}

// ── พับ → Roman blind (horizontal folds) + chain cord ──
function romanCurtain(f: Frame, item: CurtainItemInput): string {
  let s = `<rect x="${f.x}" y="${f.y}" width="${f.w}" height="${f.h}" fill="${C.sheer}" stroke="${C.frame}" stroke-width="0.6"/>`;
  const n = 5;
  const sh = f.h / n;
  for (let i = 0; i < n; i++) {
    s += `<rect x="${f.x + 0.5}" y="${f.y + i * sh}" width="${f.w - 1}" height="${sh - 1}" fill="${C.slat}" stroke="${C.slatStroke}" stroke-width="0.4"/>`;
  }
  return s + cord(sideFromChain(item.chain_position), f);
}

// ── แป๊บ → Rod pocket (gathered fabric on a rod) ──
function rodPocket(f: Frame): string {
  let s = `<rect x="${f.x}" y="${f.y}" width="${f.w}" height="${f.h}" fill="${C.opaque}" stroke="${C.opaqueStroke}" stroke-width="0.6"/>`;
  [f.y + 2, f.y + f.h - 2].forEach((yy) => {
    s += `<line x1="${f.x}" y1="${yy}" x2="${f.x + f.w}" y2="${yy}" stroke="${C.opaqueStroke}" stroke-width="0.6"/>`;
  });
  const n = Math.max(8, Math.floor(f.w / 4));
  for (let i = 1; i < n; i++) {
    const lx = f.x + (f.w / n) * i;
    s += `<line x1="${lx}" y1="${f.y + 2}" x2="${lx}" y2="${f.y + f.h - 2}" stroke="${C.opaqueStroke}" stroke-width="0.3" opacity="0.5"/>`;
  }
  return s;
}

// ── หลุยส์ → Louis curtain (swag valance + tails) ──
function louisCurtain(f: Frame, item: CurtainItemInput): string {
  let s = curtainPanels(f, 'center', item.layer_mode);
  const loops = Math.max(3, Math.floor(f.w / 15));
  const lw = f.w / loops;
  for (let i = 0; i < loops; i++) {
    const lx = f.x + i * lw;
    s += `<path d="M ${lx},${f.y} Q ${lx + lw / 2},${f.y + 9} ${lx + lw},${f.y}" fill="none" stroke="${C.opaqueStroke}" stroke-width="0.7"/>`;
  }
  s += `<polygon points="${f.x},${f.y} ${f.x + 7},${f.y} ${f.x},${f.y + 13}" fill="${C.opaque}" stroke="${C.opaqueStroke}" stroke-width="0.4"/>`;
  s += `<polygon points="${f.x + f.w},${f.y} ${f.x + f.w - 7},${f.y} ${f.x + f.w},${f.y + 13}" fill="${C.opaque}" stroke="${C.opaqueStroke}" stroke-width="0.4"/>`;
  return s;
}

// ── Wooden blind (slats + ladder tapes) + cord ──
function woodenBlind(f: Frame, item: AreaItemInput): string {
  let s = `<rect x="${f.x}" y="${f.y}" width="${f.w}" height="${f.h}" fill="${C.wood}" stroke="${C.woodStroke}" stroke-width="0.6"/>`;
  const n = Math.max(3, Math.floor(f.h / 8));
  const sh = f.h / n;
  for (let i = 0; i < n; i++) {
    s += `<rect x="${f.x + 0.5}" y="${f.y + i * sh}" width="${f.w - 1}" height="${sh - 1.2}" rx="0.5" fill="${C.wood}" stroke="${C.woodStroke}" stroke-width="0.4"/>`;
  }
  const sw = Math.max(1.5, f.w * 0.05);
  [f.x + f.w * 0.28, f.x + f.w * 0.72].forEach((sx) => {
    s += `<rect x="${sx - sw / 2}" y="${f.y}" width="${sw}" height="${f.h}" fill="${C.woodStroke}" opacity="0.5"/>`;
  });
  return s + cord(sideFromAdjustment(item.adjustment_side), f);
}

// ── Aluminium / generic horizontal blind (thin slats) + cord ──
function aluminiumBlind(f: Frame, item: AreaItemInput): string {
  let s = `<rect x="${f.x}" y="${f.y}" width="${f.w}" height="${f.h}" fill="none" stroke="${C.frame}" stroke-width="0.6"/>`;
  const n = Math.max(6, Math.floor(f.h / 4));
  const sh = f.h / n;
  for (let i = 1; i < n; i++) {
    const ly = f.y + i * sh;
    s += `<line x1="${f.x}" y1="${ly}" x2="${f.x + f.w}" y2="${ly}" stroke="${C.slatStroke}" stroke-width="0.4"/>`;
  }
  return s + cord(sideFromAdjustment(item.adjustment_side), f);
}

// ── Vertical blind (louvers) + cord + opening direction (เก็บใบ) ──
function verticalBlind(f: Frame, item: AreaItemInput): string {
  let s = `<rect x="${f.x}" y="${f.y}" width="${f.w}" height="${f.h}" fill="none" stroke="${C.frame}" stroke-width="0.6"/>`;
  const n = Math.max(4, Math.floor(f.w / 8));
  const sw = f.w / n;
  for (let i = 0; i < n; i++) {
    s += `<rect x="${f.x + i * sw + 0.5}" y="${f.y}" width="${sw - 1}" height="${f.h}" fill="${C.slat}" stroke="${C.slatStroke}" stroke-width="0.4"/>`;
  }
  return (
    s +
    cord(sideFromAdjustment(item.adjustment_side), f) +
    // ม่านปรับแสงเก็บ "เก็บใบ" (opening_style) แล้ว — วาดลูกศรทิศเหมือนฉากกั้น/มุ้งจีบ
    openingIndicator(item.opening_style, undefined, f, sideFromAdjustment(item.adjustment_side))
  );
}

// ── Roller blind (fabric + top roll + bottom bar) + cord ──
function rollerBlind(f: Frame, item: AreaItemInput): string {
  let s = `<rect x="${f.x}" y="${f.y}" width="${f.w}" height="${f.h}" fill="${C.slat}" stroke="${C.slatStroke}" stroke-width="0.5"/>`;
  s += `<rect x="${f.x - 1}" y="${f.y - 4}" width="${f.w + 2}" height="4" rx="1.5" fill="${C.opaque}" stroke="${C.opaqueStroke}" stroke-width="0.5"/>`;
  s += `<line x1="${f.x}" y1="${f.y + f.h}" x2="${f.x + f.w}" y2="${f.y + f.h}" stroke="${C.opaqueStroke}" stroke-width="1.2"/>`;
  return s + cord(sideFromAdjustment(item.adjustment_side), { ...f, y: f.y - 2 });
}

// ── Partition (folding panels + hinges) + opening direction ──
function partition(f: Frame, item: AreaItemInput): string {
  let s = '';
  const n = Math.max(4, Math.floor(f.w / 10));
  const pw = f.w / n;
  for (let i = 0; i < n; i++) {
    s += `<rect x="${f.x + i * pw}" y="${f.y}" width="${pw}" height="${f.h}" fill="${i % 2 ? C.sheer : C.slat}" stroke="${C.frame}" stroke-width="0.4"/>`;
    if (i > 0) {
      s += `<line x1="${f.x + i * pw}" y1="${f.y}" x2="${f.x + i * pw}" y2="${f.y + f.h}" stroke="${C.opaqueStroke}" stroke-width="0.5"/>`;
    }
  }
  return s + openingIndicator(item.opening_style, undefined, f, sideFromAdjustment(item.adjustment_side));
}

// ── Pleated screen (mesh) + opening direction ──
function pleatedScreen(f: Frame, item: AreaItemInput, uid: string): string {
  // sanitize id — uid มาจาก item.id ซึ่งอาจมาจากไฟล์ import ภายนอก และ SVG นี้
  // ถูก render ผ่าน dangerouslySetInnerHTML (LookbookModal) — กันอักขระหลุดออกนอก attribute
  const pid = `mesh-${uid.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return (
    `<defs><pattern id="${pid}" width="5" height="5" patternUnits="userSpaceOnUse">` +
    `<path d="M0 5 L5 0 M -1 1 L 1 -1 M 4 6 L 6 4" stroke="${C.slatStroke}" stroke-width="0.4"/></pattern></defs>` +
    `<rect x="${f.x}" y="${f.y}" width="${f.w}" height="${f.h}" fill="none" stroke="${C.frame}" stroke-width="0.6"/>` +
    `<rect x="${f.x}" y="${f.y}" width="${f.w}" height="${f.h}" fill="url(#${pid})"/>` +
    openingIndicator(item.opening_style, undefined, f, sideFromAdjustment(item.adjustment_side))
  );
}

// ── Wallpaper (patterned wall) ──
function wallpaper(f: Frame): string {
  let s = `<rect x="${f.x}" y="${f.y}" width="${f.w}" height="${f.h}" fill="${C.sheer}" stroke="${C.frame}" stroke-width="0.6"/>`;
  const cols = Math.max(1, Math.floor(f.w / 8));
  const rows = Math.max(1, Math.floor(f.h / 8));
  const dx = f.w / cols;
  const dy = f.h / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      s += `<circle cx="${f.x + dx * c + dx / 2}" cy="${f.y + dy * r + dy / 2}" r="1.2" fill="${C.slatStroke}" opacity="0.6"/>`;
    }
  }
  return s;
}

const svg = (content: string): string =>
  `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${content}</svg>`;

/**
 * Build a proportional, semantic SVG for an item.
 * Communicates product kind + opening direction (curtains/partitions) + cord side (blinds),
 * with W×H dimension labels. Returns a self-contained `<svg>` string (inline styles).
 */
export const generateItemVisualSvg = (item: ItemData): string => {
  if (item.type === ITEM_TYPES.REMOVAL || item.is_suspended) return FALLBACK_SVG;

  // Resolve dimensions (wallpaper = Σ widths × height)
  let width: number;
  let height: number;
  if (item.type === ITEM_TYPES.WALLPAPER) {
    const wp = item as WallpaperItemInput;
    width = (wp.widths || []).reduce((sum, w) => sum + toNum(w), 0);
    height = toNum(wp.height_m);
  } else {
    width = toNum((item as AreaItemInput).width_m);
    height = toNum((item as AreaItemInput).height_m);
  }
  if (width <= 0 || height <= 0) return NO_SIZE_SVG;

  const f = frame(width, height);
  let content: string;

  switch (item.type) {
    case ITEM_TYPES.CURTAIN: {
      const c = item as CurtainItemInput;
      if (c.style === 'พับ') content = romanCurtain(f, c);
      else if (c.style === 'แป๊บ') content = rodPocket(f);
      else if (c.style === 'หลุยส์') content = louisCurtain(f, c);
      else content = curtainPanels(f, c.opening_style, c.layer_mode) + curtainDecor(c.style, f);
      content += openingIndicator(c.opening_style, c.style, f, sideFromChain(c.chain_position));
      break;
    }
    case ITEM_TYPES.WALLPAPER:
      content = wallpaper(f);
      break;
    case ITEM_TYPES.WOODEN_BLIND:
      content = woodenBlind(f, item as AreaItemInput);
      break;
    case ITEM_TYPES.ALUMINUM_BLIND:
      content = aluminiumBlind(f, item as AreaItemInput);
      break;
    case ITEM_TYPES.VERTICAL_BLIND:
      content = verticalBlind(f, item as AreaItemInput);
      break;
    case ITEM_TYPES.ROLLER_BLIND:
      content = rollerBlind(f, item as AreaItemInput);
      break;
    case ITEM_TYPES.PARTITION:
      content = partition(f, item as AreaItemInput);
      break;
    case ITEM_TYPES.PLEATED_SCREEN:
      content = pleatedScreen(f, item as AreaItemInput, item.id);
      break;
    default:
      content = '';
  }

  return svg(content + f.lines);
};
