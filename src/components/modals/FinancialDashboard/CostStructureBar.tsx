// src/components/modals/FinancialDashboard/CostStructureBar.tsx

import { fmtTH } from '@/utils/formatters';

interface CostStructureBarProps {
  fabric: number;
  labor: number;
  rail: number;
  total: number;
}

// Horizontal cost structure bar
export const CostStructureBar = ({ fabric, labor, rail, total }: CostStructureBarProps) => {
  if (total <= 0) return null;
  const fp = Math.round((fabric / total) * 100);
  const lp = Math.round((labor / total) * 100);
  const rp = Math.max(0, 100 - fp - lp);

  return (
    <div className="px-4 pb-3 space-y-1.5">
      <div className="flex items-center justify-between text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
        <span>สัดส่วนต้นทุน</span>
        <span className="tabular-nums normal-case">{fmtTH(total)}</span>
      </div>
      <div className="h-2.5 rounded-full overflow-hidden flex gap-px bg-muted">
        {fp > 0 && <div style={{ width: `${fp}%` }} className="bg-violet-500 rounded-l-full" />}
        {lp > 0 && <div style={{ width: `${lp}%` }} className="bg-blue-500" />}
        {rp > 0 && <div style={{ width: `${rp}%` }} className="bg-orange-400 rounded-r-full" />}
      </div>
      <div className="flex gap-4 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-violet-500 shrink-0" />
          ผ้า {fp}% · {fmtTH(fabric)}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
          แรง {lp}% · {fmtTH(labor)}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-orange-400 shrink-0" />
          ราง {rp}% · {fmtTH(rail)}
        </span>
      </div>
    </div>
  );
};
