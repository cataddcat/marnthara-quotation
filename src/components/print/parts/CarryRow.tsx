import React from 'react';
import { fmtNum } from './fmt';

interface Props {
  /** "ยอดยกมา" (brought forward) or "ยอดยกไป" (carried forward). */
  label: string;
  amount: number;
}

/**
 * Running-subtotal row at a page boundary. Only used on priced documents
 * (the layout always has 5 columns when carry rows appear).
 */
export const CarryRow = React.forwardRef<HTMLTableRowElement, Props>(({ label, amount }, ref) => (
  <tr ref={ref} className="border-b border-slate-300 bg-slate-50">
    <td
      colSpan={4}
      className="py-1.5 px-2 text-right font-bold text-slate-700 border-r border-slate-300 uppercase tracking-wide text-xs"
    >
      {label}
    </td>
    <td className="py-1.5 pr-2 text-right align-middle font-mono font-bold text-slate-900 text-[13px]">
      {fmtNum(amount)}
    </td>
  </tr>
));

CarryRow.displayName = 'CarryRow';
