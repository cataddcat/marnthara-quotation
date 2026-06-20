import React from 'react';
import { Lock } from 'lucide-react';
import { Switch } from './Switch';
import { fmtTH } from '@/utils/formatters';
import { cn } from '@/lib/utils';
import { useTierSize } from '@/hooks/useExperienceMode';
import { STATUS_DOT } from '@/lib/status-style';
import { DATA_TONE_TEXT, DATA_TONE_PLATE } from '@/config/dataTones';
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
  /** โหมดละเอียด (Detail) — ไฟจราจรกำไร */
  status?: CostBreakdown['status'];
  /** โชว์ไฟเฉพาะตอนรู้ต้นทุนจริง (= isDetail && totalCost > 0) */
  showStatus?: boolean;
  /** โหมดละเอียด (Detail) — ส่วนวิเคราะห์ต้นทุนเชิงลึก (ผ้าม่าน=แก้ได้ / area-wallpaper=อ่านอย่างเดียว) */
  proSlot?: React.ReactNode;
}

// รูปทรง plate ของยอดสุทธิ (numeric 16px + tone plate — DESIGN.md §1) แยกจาก "สี" ที่ไล่ตามสถานะ
const PLATE_SHAPE =
  'inline-flex items-center gap-1 text-base font-bold font-mono tabular-nums border rounded-lg px-2 py-1';
// สถานะ "กำหนดราคาเอง" = amber (ราคามือ ไม่ใช่คำนวณ — สื่อด้วยสี ไม่ใช่ขนาด)
const OVERRIDE_PLATE =
  'text-amber-700 dark:text-amber-400 eeert:text-amber-900 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-900';

/**
 * Summary card แบบ layered ที่ทั้ง 8 ประเภทใช้ร่วมกัน:
 * Tier-0 (เสมอ): breakdown + ราคาสุทธิ + override
 * โหมดละเอียด (Detail): ไฟจราจรกำไร + proSlot
 *
 * Plate ของยอดไล่สีตามสถานะ (ยกแบบมาจาก PriceSummary เดิมของม่าน — DESIGN.md §8):
 * กำหนดราคาเอง → amber + Lock · ขาดทุน (รู้ทุนจริง) → rose · ปกติ → totalClass (default เขียว)
 */
export const ItemSummaryCard: React.FC<ItemSummaryCardProps> = ({
  total,
  totalLabel = 'ราคาสุทธิ',
  // Numeric layer caps at 16px (DESIGN.md §1) — hero emphasis via tone-tinted plate, not size
  totalClass = cn(PLATE_SHAPE, DATA_TONE_TEXT.money, DATA_TONE_PLATE.money),
  title,
  titleIcon: TitleIcon,
  titleClass = 'text-emerald-700 dark:text-emerald-400 eeert:text-emerald-800',
  rows = [],
  enableSetPrice,
  onToggleSetPrice,
  setPriceValue,
  onSetPriceChange,
  status,
  showStatus = false,
  proSlot,
}) => {
  // ความหนาแน่นตามโหมด (field โปร่ง p-4 · detail แน่น p-3.5) — ให้การ์ดสรุปมี rhythm ตรงกับ FormSection
  const { section } = useTierSize();
  const pulse = status === 'warning' || status === 'loss';

  // สีของ plate ไล่ตามสถานะ — override ชนะ loss ชนะค่าปกติ
  const effectiveTotalClass = enableSetPrice
    ? cn(PLATE_SHAPE, OVERRIDE_PLATE)
    : showStatus && status === 'loss'
      ? cn(PLATE_SHAPE, DATA_TONE_TEXT.cost, DATA_TONE_PLATE.cost)
      : totalClass;

  return (
    <div
      className={cn(
        'bg-card border border-border rounded-2xl relative overflow-hidden',
        section.pad,
        section.stack
      )}
    >
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
            <span className={effectiveTotalClass}>
              {enableSetPrice && <Lock className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />}
              {fmtTH(total)}
            </span>
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

        {/* Override — กำหนดราคาเอง (แถวกดได้ทั้งแถว + คำอธิบาย — ยกแบบจาก PriceSummary เดิม) */}
        <div className="mt-4 pt-4 border-t border-border space-y-3">
          <div
            className="flex items-center justify-between gap-3 cursor-pointer select-none active:opacity-80 transition-opacity"
            onClick={() => onToggleSetPrice(!enableSetPrice)}
          >
            <div className="min-w-0">
              <div className="text-sm font-medium text-foreground">กำหนดราคาเอง</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                ตั้งราคาคงที่ ข้ามการคำนวณอัตโนมัติ
              </div>
            </div>
            <Switch
              checked={enableSetPrice}
              onCheckedChange={() => {}}
              className="pointer-events-none shrink-0 data-[state=checked]:bg-amber-500"
            />
          </div>
          {enableSetPrice && (
            <input
              type="text"
              inputMode="decimal"
              placeholder="0"
              autoFocus
              value={setPriceValue || ''}
              onChange={(e) => onSetPriceChange(e.target.value)}
              className="w-full text-right font-mono font-bold text-sm rounded-lg px-3 py-2 text-amber-700 dark:text-amber-400 eeert:text-amber-900 bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 animate-in slide-in-from-top-1 fade-in duration-200"
            />
          )}
        </div>
      </div>

      {proSlot && <div className="relative">{proSlot}</div>}
    </div>
  );
};
