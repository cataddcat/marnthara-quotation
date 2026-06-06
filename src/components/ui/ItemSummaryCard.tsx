import React from 'react';
import { Switch } from './Switch';
import { fmtTH } from '@/utils/formatters';
import { cn } from '@/lib/utils';
import { STATUS_DOT } from '@/lib/status-style';
import type { CostBreakdown } from '@/lib/pricing/CostEngine';

export interface SummaryRow {
  label: string;
  value: React.ReactNode;
  valueClass?: string;
}

interface ItemSummaryCardProps {
  /** Tier-0 — ราคาสุทธิ */
  total: number;
  totalLabel?: string;
  totalClass?: string;
  /** chrome */
  title?: string;
  titleIcon?: React.ElementType;
  titleClass?: string;
  /** breakdown rows (พื้นที่/ม้วน/—) */
  rows?: SummaryRow[];
  /** override "กำหนดราคาเอง" (สม่ำเสมอทุกฟอร์ม) */
  enableSetPrice: boolean;
  onToggleSetPrice: (v: boolean) => void;
  setPriceValue: string | number | undefined;
  onSetPriceChange: (v: string) => void;
  /** Tier-1 (Full) — ไฟจราจรกำไร */
  status?: CostBreakdown['status'];
  /** โชว์ไฟเฉพาะตอนรู้ต้นทุนจริง (= isFull && totalCost > 0) */
  showStatus?: boolean;
  /** Tier-1 (Full) — ส่วนวิเคราะห์ต้นทุนเชิงลึก (ผ้าม่าน=แก้ได้ / area-wallpaper=อ่านอย่างเดียว) */
  proSlot?: React.ReactNode;
}

/**
 * Summary card แบบ layered ที่ทั้ง 8 ประเภทใช้ร่วมกัน:
 * Tier-0 (เสมอ): breakdown + ราคาสุทธิ + override
 * Tier-1 (Full): ไฟจราจรกำไร + proSlot
 */
export const ItemSummaryCard: React.FC<ItemSummaryCardProps> = ({
  total,
  totalLabel = 'ราคาสุทธิ',
  totalClass = 'text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400',
  title,
  titleIcon: TitleIcon,
  titleClass = 'text-emerald-600 dark:text-emerald-400',
  rows = [],
  enableSetPrice,
  onToggleSetPrice,
  setPriceValue,
  onSetPriceChange,
  status,
  showStatus = false,
  proSlot,
}) => {
  const pulse = status === 'warning' || status === 'loss';

  return (
    <div className="bg-card border border-border p-5 rounded-xl space-y-4 relative overflow-hidden">
      {title && (
        <div className={cn('flex items-center gap-2 font-bold border-b border-border pb-3', titleClass)}>
          {TitleIcon && <TitleIcon className="w-5 h-5" />}
          <h3>{title}</h3>
        </div>
      )}

      <div className="space-y-2 text-sm">
        {rows.map((row, i) => (
          <div key={i} className="flex justify-between text-muted-foreground">
            <span>{row.label}</span>
            <span className={cn('font-mono tabular-nums', row.valueClass)}>{row.value}</span>
          </div>
        ))}

        <div
          className={cn(
            'flex justify-between items-end',
            rows.length > 0 && 'pt-2 border-t border-border mt-2'
          )}
        >
          <span className="text-muted-foreground pb-1">{totalLabel}</span>
          <span className="flex items-center gap-2">
            <span className={totalClass}>{fmtTH(total)}</span>
            {showStatus && status && (
              <span
                className={cn(
                  'inline-flex h-2.5 w-2.5 rounded-full ring-2 ring-background shrink-0',
                  STATUS_DOT[status],
                  pulse && 'animate-pulse'
                )}
                title={status}
              />
            )}
          </span>
        </div>

        {/* Override — กำหนดราคาเอง */}
        <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Switch
              checked={enableSetPrice}
              onCheckedChange={onToggleSetPrice}
              className="data-[state=checked]:bg-emerald-500"
            />
            <span className="text-sm text-muted-foreground">กำหนดราคาเอง</span>
          </div>
          {enableSetPrice && (
            <div className="w-32">
              <input
                type="text"
                inputMode="decimal"
                value={setPriceValue || ''}
                onChange={(e) => onSetPriceChange(e.target.value)}
                className="w-full bg-muted/50 text-foreground border border-input rounded-lg px-3 py-1.5 text-right font-mono text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              />
            </div>
          )}
        </div>
      </div>

      {proSlot && <div className="relative">{proSlot}</div>}
    </div>
  );
};
