// src/components/modals/FinancialDashboard/constants.ts

import type { ItemData } from '@/types';
import type { CostBreakdown } from '@/lib/pricing/CostEngine';

export interface ItemRow {
  id: string;
  roomId: string;
  roomName: string;
  item: ItemData;
  typeName: string;
  specs: string[];
  analysis: CostBreakdown;
}

export const STATUS_ORDER: Record<CostBreakdown['status'], number> = {
  loss: 0,
  warning: 1,
  unknown: 2,
  profit: 3,
};

export const STATUS_STYLE: Record<
  CostBreakdown['status'],
  { badge: string; dot: string; accent: string; label: string }
> = {
  loss: {
    badge: 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-200/50 dark:border-rose-900/50',
    dot: 'bg-rose-500',
    accent: 'border-l-rose-500',
    label: 'ขาดทุน',
  },
  warning: {
    badge: 'text-amber-700 dark:text-amber-400 eeert:text-amber-900 bg-amber-500/10 border-amber-200/50 dark:border-amber-900/50',
    dot: 'bg-amber-400',
    accent: 'border-l-amber-400',
    label: 'ส่วนต่างต่ำ',
  },
  unknown: {
    badge: 'text-slate-600 dark:text-slate-400 bg-slate-500/10 border-slate-200/50 dark:border-slate-700/50',
    dot: 'bg-slate-400',
    accent: 'border-l-slate-400',
    label: 'ไม่ทราบทุน',
  },
  profit: {
    badge: 'text-emerald-700 dark:text-emerald-400 eeert:text-emerald-800 bg-emerald-500/10 border-emerald-200/50 dark:border-emerald-900/50',
    dot: 'bg-emerald-500',
    accent: 'border-l-emerald-500',
    label: 'ส่วนต่างดี',
  },
};
