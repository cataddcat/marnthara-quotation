// src/components/modals/FinancialDashboard/CostRow.tsx

import { cn } from '@/lib/utils';
import { fmtTH } from '@/utils/formatters';

interface CostRowProps {
  label: string;
  value: number;
  sub?: string;
  highlight?: boolean;
  /** จุดสีนำหน้า — ใช้สื่อหมวดต้นทุน (ผ้า=violet, แรง=blue, ราง=orange) ให้สแกนเร็ว */
  dotClass?: string;
}

// Cost row inside expanded item card
export const CostRow = ({ label, value, sub, highlight, dotClass }: CostRowProps) => (
  <div className={cn('flex justify-between items-center', highlight && 'font-bold')}>
    <div className="flex items-center gap-1.5 min-w-0">
      {dotClass && <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotClass)} />}
      <span
        className={cn('text-xs truncate', highlight ? 'text-foreground' : 'text-muted-foreground')}
      >
        {label}
      </span>
      {sub && (
        <span className="text-[10px] text-muted-foreground/60 font-mono shrink-0">{sub}</span>
      )}
    </div>
    <span
      className={cn(
        'font-mono tabular-nums text-xs shrink-0 ml-2',
        highlight ? 'text-foreground text-sm' : 'text-foreground/80'
      )}
    >
      ฿{fmtTH(value)}
    </span>
  </div>
);
