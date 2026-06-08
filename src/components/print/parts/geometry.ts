// Shared A4 geometry so the measure layer, paginator budgets, and rendered
// sheets all agree on the same physical page box.

import type { CSSProperties } from 'react';

export const PX_PER_MM = 96 / 25.4; // CSS px per mm at 96dpi (~3.7795)

export const A4_W_MM = 210;
export const A4_H_MM = 297;

/** Inner padding of each sheet = the print margins (with @page margin: 0). */
export const PAGE_PAD_V_MM = 12;
export const PAGE_PAD_H_MM = 14;

/** Per-page safety slack absorbing minor screen-vs-print rounding. */
export const PAGE_SLACK_MM = 8;

export const CONTENT_W_MM = A4_W_MM - 2 * PAGE_PAD_H_MM; // 182
export const CONTENT_H_MM = A4_H_MM - 2 * PAGE_PAD_V_MM; // 273

export const CONTENT_W_PX = Math.round(CONTENT_W_MM * PX_PER_MM);
export const CONTENT_H_PX = CONTENT_H_MM * PX_PER_MM;
export const SLACK_PX = PAGE_SLACK_MM * PX_PER_MM;

/** Inline style for one A4 sheet (box-border so padding is inside the A4 box). */
export const PAGE_STYLE: CSSProperties = {
  width: `${A4_W_MM}mm`,
  minHeight: `${A4_H_MM}mm`,
  padding: `${PAGE_PAD_V_MM}mm ${PAGE_PAD_H_MM}mm`,
  boxSizing: 'border-box',
};
