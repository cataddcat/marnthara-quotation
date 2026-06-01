import type { CostBreakdown } from '@/lib/pricing/CostEngine';

/**
 * สีจุดไฟจราจรกำไร (traffic-light) — ใช้ร่วมทุกฟอร์ม/สรุป
 * profit = เขียว, warning = เหลือง, loss = แดง, unknown = เทา
 */
export const STATUS_DOT: Record<CostBreakdown['status'], string> = {
  profit: 'bg-emerald-500',
  warning: 'bg-amber-400',
  loss: 'bg-destructive',
  unknown: 'bg-muted-foreground/30',
};
