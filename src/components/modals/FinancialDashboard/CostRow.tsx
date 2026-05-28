// src/components/modals/FinancialDashboard/CostRow.tsx

import { cn } from '@/lib/utils';
import { fmtTH } from '@/utils/formatters';

interface CostRowProps {
  label: string;
  value: number;
  sub?: string;
  highlight?: boolean;
}

// Cost row inside expanded item card
export const CostRow = ({ label, value, sub, highlight }: CostRowProps) => (
  <div className={cn('flex justify-between items-center', highlight && 'font-bold')}>
    <div className="flex items-center gap-1 min-w-0">
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
        'tabular-nums text-xs shrink-0 ml-2',
        highlight ? 'text-foreground text-sm' : 'text-foreground/80'
      )}
    >
      ฿{fmtTH(value)}
    </span>
  </div>
);
