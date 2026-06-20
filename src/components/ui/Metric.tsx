import React from 'react';
import { cn } from '@/lib/utils';
import { DATA_TONE_TEXT, DATA_TONE_PLATE, DATA_TONE_PILL, type DataTone } from '@/config/dataTones';
import { useThemeStore, isColorfulTheme } from '@/store/useThemeStore';

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
 * under the 18px cap (DESIGN.md §1). Heroes are emphasized by a tone-tinted background,
 * not by size — size carries no hierarchy in the numeric layer.
 *
 * Hero emphasis has two looks, picked by theme:
 *   • EEERT theme (pilot) → soft tone PILL (rounded-full, bg-{tone}-500/10, no border —
 *     same language as the room/type chips). Any caller opts in via `plate`.
 *   • other themes → the legacy framed PLATE (bg + border), kept for `size="lg"` only so
 *     nothing outside the pilot changes. When the pilot graduates, drop the theme gate.
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
  /** Meta label (12px, muted) — a unit/role, e.g. "ยอดสุทธิ", "ขนาด · กว้าง×สูง". Omit to render the number alone. */
  label?: React.ReactNode;
  /** the number itself — already formatted (e.g. fmtTH(total)) */
  value: React.ReactNode;
  tone?: MetricTone;
  size?: MetricSize;
  /** mark this as the surface hero → tone background (pill in EEERT). Defaults to `size==='lg'`. */
  plate?: boolean;
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
  plate = size === 'lg',
  align = 'left',
  icon,
  sub,
  struck = false,
  className,
}) => {
  // Colorful themes (EEERT + Dark Vivid): heroes wear the soft tone PILL. Other themes keep
  // the legacy framed PLATE on size="lg" only, so nothing outside the pilot moves.
  const isColorful = useThemeStore((s) => isColorfulTheme(s.theme));
  const usePill = isColorful && plate;
  const useFramed = !usePill && size === 'lg';

  return (
    <div
      className={cn('flex flex-col gap-1 min-w-0', align === 'right' && 'items-end text-right', className)}
    >
      {label != null && (
        <span className="inline-flex items-center gap-1 text-xs font-medium tracking-wide text-muted-foreground">
          {icon}
          <span className="truncate">{label}</span>
        </span>
      )}
      <span
        className={cn(
          'font-mono tabular-nums font-bold tracking-tight leading-none',
          VALUE_SIZE[size],
          // EEERT hero pill — soft tone bg, borderless (same look as the chips)
          usePill && 'rounded-full px-2.5 py-1',
          usePill && (struck ? 'bg-muted/60' : DATA_TONE_PILL[tone]),
          // legacy framed plate (other themes, size="lg") — emphasis by tinted bg + border
          useFramed && 'border rounded-lg px-2 py-1',
          useFramed && (struck ? 'bg-muted/50 border-border' : TONE_PLATE[tone]),
          struck ? 'text-muted-foreground line-through' : TONE[tone]
        )}
      >
        {value}
      </span>
      {sub && <span className="text-xs text-muted-foreground leading-tight">{sub}</span>}
    </div>
  );
};
