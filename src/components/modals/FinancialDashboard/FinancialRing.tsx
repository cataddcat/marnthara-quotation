// src/components/modals/FinancialDashboard/FinancialRing.tsx

import { Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fmtTH } from '@/utils/formatters';

interface FinancialRingProps {
  revenue: number;
  cost: number;
  profit: number;
  targetMargin: number;
}

export const FinancialRing = ({ revenue, cost, profit, targetMargin }: FinancialRingProps) => {
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
  const profitDeg = Math.max(0, Math.min(360, (profit / revenue) * 360));
  const isHealthy = margin >= targetMargin;
  const ringColor = isHealthy ? '#10b981' : '#f59e0b';

  return (
    <div className="relative flex flex-col items-center justify-center py-4">
      <div
        className="w-40 h-40 rounded-full flex items-center justify-center"
        style={{
          background: `conic-gradient(${ringColor} 0deg ${profitDeg}deg, var(--color-muted) ${profitDeg}deg 360deg)`,
        }}
      >
        <div className="w-28 h-28 bg-card rounded-full flex flex-col items-center justify-center">
          <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">
            Net Margin
          </span>
          <div
            className={cn(
              'text-3xl font-black font-mono tabular-nums tracking-tighter',
              isHealthy ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'
            )}
          >
            {margin.toFixed(1)}
            <span className="text-sm text-muted-foreground/60">%</span>
          </div>
          <div className="text-[9px] text-muted-foreground flex items-center gap-1 mt-0.5">
            <Target className="w-2.5 h-2.5" strokeWidth={1.5} /> เป้า {targetMargin}%
          </div>
        </div>
      </div>

      <div className="absolute bottom-2 w-full flex justify-between px-6 opacity-90">
        <div className="flex flex-col items-start bg-card/80 backdrop-blur border border-border p-1.5 rounded-lg text-xs">
          <span className="text-muted-foreground text-[11px]">ยอดขาย</span>
          <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">{fmtTH(revenue)}</span>
        </div>
        <div className="flex flex-col items-end bg-card/80 backdrop-blur border border-border p-1.5 rounded-lg text-xs">
          <span className="text-muted-foreground text-[11px]">ต้นทุนรวม</span>
          <span className="font-bold font-mono text-rose-500">{fmtTH(cost)}</span>
        </div>
      </div>
    </div>
  );
};
