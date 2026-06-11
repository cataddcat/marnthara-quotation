import React from 'react';
import { cn } from '@/lib/utils';
import { DATA_TONE_TEXT, DATA_TONE_PLATE, type DataTone } from '@/config/dataTones';

/**
 * Metric — the canonical "labelled number" block of the dashboard redesign.
 *
 * A Meta-sized label (12px, muted) sits above a Geist Mono numeric hero, so every
 * surface (ItemCard, RoomCard, the Financial KPIs) renders prices/sizes/counts with
 * one identical title→label→number cascade. Honors the system laws: numbers ride the
 * mono layer (`tabular-nums`); hues come from the §2.1 registry (`dataTones.ts`):
 * money = emerald, dimension = blue (never sky), cost = rose.
 *
 * Type band stays safe: label is Meta (12px), value 14px — at the Numeric floor, well
 * under the 18px cap (DESIGN.md §1). Heroes (`size="lg"`) are emphasized by a tone-tinted
 * PLATE (bg + border), not by size — size carries no hierarchy in the numeric layer.
 */
export type MetricTone = DataTone;
export type MetricSize = 'sm' | 'md' | 'lg';

// hue ทั้งหมดมาจากทะเบียน DESIGN.md §2.1 (single source — dataTones.ts)
const TONE: Record<MetricTone, string> = DATA_TONE_TEXT;

// value sizes — Metric (card/list/overview data) is a FLAT 14px: no size hierarchy
// inside Metric; emphasis = the tone plate / colour / weight. (Summary/document totals
// live one coarse step up at 16px in their own components — DESIGN.md §1 Numeric.)
const VALUE_SIZE: Record<MetricSize, string> = {
  sm: 'text-sm', // 14px — dense rows / 3-up strips
  md: 'text-sm', // 14px — section metric
  lg: 'text-sm', // 14px — card hero (price / room total); emphasis = tone plate, not size
};

// hero PLATE — `size="lg"` swaps "bigger" for a tone-tinted bg + border, so the
// card hero still pops without breaking the 18px cap (emphasis by colour, not size)
const TONE_PLATE: Record<MetricTone, string> = DATA_TONE_PLATE;

interface MetricProps {
  /** Meta label (12px, muted) — a unit/role, e.g. "ยอดสุทธิ", "ขนาด · กว้าง×สูง" */
  label: React.ReactNode;
  /** the number itself — already formatted (e.g. fmtTH(total)) */
  value: React.ReactNode;
  tone?: MetricTone;
  size?: MetricSize;
  align?: 'left' | 'right';
  /** small leading icon on the label row (lucide @ 1.5) */
  icon?: React.ReactNode;
  /** optional Meta sub-line under the value */
  sub?: React.ReactNode;
  /** strike + grey the value (suspended items) */
  struck?: boolean;
  className?: string;
}

/**
 * Renders a stacked label + numeric value. Compose horizontally for multi-up strips:
 *   <div className="flex justify-between"><Metric .../><Metric align="right" .../></div>
 */
export const Metric: React.FC<MetricProps> = ({
  label,
  value,
  tone = 'neutral',
  size = 'sm',
  align = 'left',
  icon,
  sub,
  struck = false,
  className,
}) => (
  <div
    className={cn('flex flex-col gap-1 min-w-0', align === 'right' && 'items-end text-right', className)}
  >
    <span className="inline-flex items-center gap-1 text-xs font-medium tracking-wide text-muted-foreground">
      {icon}
      <span className="truncate">{label}</span>
    </span>
    <span
      className={cn(
        'font-mono tabular-nums font-bold tracking-tight leading-none',
        VALUE_SIZE[size],
        // hero plate (lg): emphasis by tinted bg + border instead of size (18px cap)
        size === 'lg' && 'border rounded-lg px-2 py-1',
        size === 'lg' && (struck ? 'bg-muted/50 border-border' : TONE_PLATE[tone]),
        struck ? 'text-muted-foreground line-through' : TONE[tone]
      )}
    >
      {value}
    </span>
    {sub && <span className="text-xs text-muted-foreground leading-tight">{sub}</span>}
  </div>
);
