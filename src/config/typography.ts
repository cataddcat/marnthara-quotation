// src/config/typography.ts
//
// Typography scale — the single machine-readable source for the design type system.
// Mirrors DESIGN.md §2 and is shared by the `Text` primitive (src/components/ui/Text.tsx)
// and the Design Probe (src/components/dev/DevInspector.tsx).
//
// STANDARD (strict):
//   • Body / primary content = 14–16px (never below 14).
//   • 12px is restricted to META only (dates / counts / units / micro-labels).
//   • Anything < 12px is BANNED for human-readable content.
// See DESIGN.md for the full rationale + Phase-2 enforcement plan.

export type TypographyRole = 'display' | 'title' | 'body' | 'label' | 'meta';

export interface TypographyRoleSpec {
  /** human label shown in the Probe + docs */
  label: string;
  /** Tailwind classes for this role (default density) */
  className: string;
  /** smallest acceptable px for this role */
  minPx: number;
}

/** Hard floor — nothing readable below this. */
export const CONTENT_MIN_PX = 12;
/** Body / primary content floor — never below this. */
export const BODY_MIN_PX = 14;

export const TYPOGRAPHY: Record<TypographyRole, TypographyRoleSpec> = {
  display: { label: 'Display', className: 'text-2xl font-bold tracking-tight', minPx: 20 },
  title: { label: 'Title', className: 'text-base font-semibold', minPx: 16 },
  body: { label: 'Body', className: 'text-base', minPx: BODY_MIN_PX },
  label: { label: 'Label', className: 'text-sm', minPx: 14 },
  meta: { label: 'Meta', className: 'text-xs', minPx: CONTENT_MIN_PX },
};

export type SizeStatus = 'ok' | 'warn' | 'error';

export interface SizeVerdict {
  /** closest role band for the measured size */
  roleHint: string;
  status: SizeStatus;
  /** short Thai note for the Probe */
  note: string;
}

/**
 * Classify a measured computed font-size (px) against the standard.
 * Pure + dependency-free so the Probe, tests, and docs can reuse it.
 *   < 12px  → error (banned for content)
 *   ~12px   → warn  (Meta only — verify it's a date/count/unit)
 *   13–15px → ok    (Label / dense Body)
 *   16–19px → ok    (Title / Body)
 *   ≥ 20px  → ok    (Display)
 */
export function classifySizePx(px: number): SizeVerdict {
  if (!Number.isFinite(px) || px <= 0) {
    return { roleHint: '—', status: 'warn', note: 'อ่านขนาดไม่ได้' };
  }
  if (px < 11.5) {
    return { roleHint: '—', status: 'error', note: `${round(px)}px ต่ำกว่า 12px (ห้ามใช้กับเนื้อหา)` };
  }
  if (px < 12.5) {
    return { roleHint: 'Meta', status: 'warn', note: 'ใช้กับ Meta เท่านั้น (วันที่/จำนวน/หน่วย)' };
  }
  if (px < 15.5) {
    return { roleHint: 'Label / Body', status: 'ok', note: '' };
  }
  if (px < 19.5) {
    return { roleHint: 'Title / Body', status: 'ok', note: '' };
  }
  return { roleHint: 'Display', status: 'ok', note: '' };
}

function round(px: number): string {
  return Math.round(px * 10) / 10 + '';
}
