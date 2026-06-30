import React from 'react';
import { AlertTriangle, AlertCircle, Info, CheckCircle2, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Squircle } from '@/components/ui/Squircle';

export type AlertVariant = 'info' | 'warning' | 'success' | 'destructive';

// Status carried by a tinted bg + border + icon (DESIGN.md §2 — status colors are
// the sanctioned exception to monochrome). Squircle surface: bg→path fill, border→path stroke;
// text stays on the element. Dark text shade keeps it readable (AA); eeert: crisper -300 stroke.
const VARIANT_PATH: Record<AlertVariant, string> = {
  info: 'fill-sky-50 dark:fill-sky-950/30 stroke-sky-200/60 dark:stroke-sky-800/50 eeert:stroke-sky-300',
  warning:
    'fill-amber-50 dark:fill-amber-950/30 stroke-amber-200/60 dark:stroke-amber-800/50 eeert:stroke-amber-300',
  success:
    'fill-emerald-50 dark:fill-emerald-950/30 stroke-emerald-200/60 dark:stroke-emerald-800/50 eeert:stroke-emerald-300',
  destructive:
    'fill-rose-50 dark:fill-rose-950/30 stroke-rose-200/60 dark:stroke-rose-800/50 eeert:stroke-rose-300',
};

const VARIANT_TEXT: Record<AlertVariant, string> = {
  info: 'text-sky-800 dark:text-sky-300',
  warning: 'text-amber-800 dark:text-amber-300',
  success: 'text-emerald-800 dark:text-emerald-300',
  destructive: 'text-rose-800 dark:text-rose-300',
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
    <Squircle
      as="div"
      strokeWidth={1}
      pathClassName={VARIANT_PATH[variant]}
      className={cn(
        'flex items-start gap-2 rounded-xl p-2.5 text-sm leading-snug',
        VARIANT_TEXT[variant],
        className
      )}
    >
      {Icon && <Icon className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={1.5} />}
      <div className="min-w-0 flex-1">{children}</div>
    </Squircle>
  );
};
