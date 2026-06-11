import React from 'react';
import { fmtTH } from '@/utils/formatters';
import { cn } from '@/lib/utils';
import { TrendingUp } from 'lucide-react';
import type { CostBreakdown } from '@/lib/pricing/CostEngine';

/**
 * สรุปต้นทุน/กำไรแบบอ่านอย่างเดียว — proSlot ของประเภทที่ทุนถังเดียว (area/wallpaper/removal:
 * Vault by code → 2 บรรทัดพอ โชว์เสมอใน Detail) ต่างจากผ้าม่าน (CurtainCostAnalysis/ProModeControl)
 * ที่ทุนหลายถัง (ผ้า/ราง/แรง) จึงโชว์ breakdown ละเอียด + toggle — ทั้งคู่อ่านอย่างเดียวเหมือนกัน
 */
export const CostReadout: React.FC<{ analysis: CostBreakdown }> = ({ analysis }) => {
  const lowMargin = analysis.marginPercent < 30;

  return (
    <div className="rounded-xl border border-border bg-muted/40 p-3 space-y-1.5 text-sm">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <TrendingUp className="w-3.5 h-3.5" /> วิเคราะห์ต้นทุน
      </div>

      <div className="flex justify-between text-muted-foreground">
        <span>
          ต้นทุน ({analysis.usedQuantity.toFixed(2)} {analysis.unit})
        </span>
        <span className="tabular-nums">{fmtTH(analysis.totalCost)}</span>
      </div>

      <div className="flex justify-between font-semibold">
        <span>กำไร</span>
        <span className="flex items-center gap-2">
          <span
            className={cn(
              'tabular-nums',
              lowMargin ? 'text-amber-500' : 'text-emerald-600 dark:text-emerald-400'
            )}
          >
            {analysis.marginPercent.toFixed(1)}%
          </span>
          <span className="tabular-nums text-emerald-600 dark:text-emerald-400">
            +{fmtTH(analysis.profitAmount)}
          </span>
        </span>
      </div>
    </div>
  );
};
