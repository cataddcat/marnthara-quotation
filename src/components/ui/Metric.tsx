import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Metric — the canonical "labelled number" block of the dashboard redesign.
 *
 * A Meta-sized label (12px, muted) sits above a Geist Mono numeric hero, so every
 * surface (ItemCard, RoomCard, the Financial KPIs) renders prices/sizes/counts with
 * one identical title→label→number cascade. Honors the system laws: numbers ride the
 * mono layer (`tabular-nums`), money = emerald, dimensions = sky, cost = rose.
 *
 * Type floor stays safe: label is Meta (12px), value ≥ 16px — never below 12.
 */
export type MetricTone = 'money' | 'cost' | 'dimension' | 'neutral' | 'muted';
export type MetricSize = 'sm' | 'md' | 'lg' | 'xl';

// Light shades darkened to clear WCAG AA on white (v4 OKLCH *-600 sits ~3.5–4:1,
// failing 14–16px); dark shades stay bright for contrast on dark surfaces.
const TONE: Record<MetricTone, string> = {
  money: 'text-emerald-700 dark:text-emerald-400',
  cost: 'text-rose-600 dark:text-rose-400',
  dimension: 'text-sky-700 dark:text-sky-400',
  neutral: 'text-foreground',
  muted: 'text-muted-foreground',
};

// value sizes — all ≥ 16px so numeric heroes never collide with the 14px body floor
const VALUE_SIZE: Record<MetricSize, string> = {
  sm: 'text-base', // 16px — dense rows / 3-up strips
  md: 'text-lg', //  18px
  lg: 'text-xl', //  20px — card hero (price / room total)
  xl: 'text-3xl', // 30px — office KPI hero
};

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
        struck ? 'text-muted-foreground line-through' : TONE[tone]
      )}
    >
      {value}
    </span>
    {sub && <span className="text-xs text-muted-foreground leading-tight">{sub}</span>}
  </div>
);
