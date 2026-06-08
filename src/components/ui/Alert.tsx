import React from 'react';
import { AlertTriangle, AlertCircle, Info, CheckCircle2, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AlertVariant = 'info' | 'warning' | 'success' | 'destructive';

// Status carried by a tinted bg + border + icon (DESIGN.md §2 — status colors are
// the sanctioned exception to monochrome). Dark text shade keeps it readable (AA);
// the vivid semantic tokens are too light for body text, so the alert palette
// uses the darker -700/-300 steps consistently across all four variants.
const VARIANT_STYLES: Record<AlertVariant, string> = {
  info: 'bg-sky-50 dark:bg-sky-950/30 border-sky-200/60 dark:border-sky-800/50 text-sky-800 dark:text-sky-300',
  warning:
    'bg-amber-50 dark:bg-amber-950/30 border-amber-200/60 dark:border-amber-800/50 text-amber-800 dark:text-amber-300',
  success:
    'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200/60 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-300',
  destructive:
    'bg-rose-50 dark:bg-rose-950/30 border-rose-200/60 dark:border-rose-800/50 text-rose-800 dark:text-rose-300',
};

const VARIANT_ICON: Record<AlertVariant, LucideIcon> = {
  info: Info,
  warning: AlertTriangle,
  success: CheckCircle2,
  destructive: AlertCircle,
};

export interface AlertProps {
  variant?: AlertVariant;
  /** Override the default icon, or pass `null` to hide it. */
  icon?: LucideIcon | null;
  className?: string;
  children: React.ReactNode;
}

/**
 * Canonical inline notice / "ป้ายแจ้งเตือน". One consistent shell so every
 * warning / info / success / error banner across the app reads the same:
 * border + soft tint + lucide icon (stroke 1.5) + readable 14px body.
 */
export const Alert: React.FC<AlertProps> = ({ variant = 'info', icon, className, children }) => {
  const Icon = icon === null ? null : (icon ?? VARIANT_ICON[variant]);

  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-xl border p-2.5 text-sm leading-snug',
        VARIANT_STYLES[variant],
        className
      )}
    >
      {Icon && <Icon className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={1.5} />}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
};
