import React from 'react';
import { PrintBlock } from '@/lib/export/printModel';
import { fmtNum } from './fmt';

interface Props {
  block: PrintBlock;
  showPrices: boolean;
}

/**
 * One table row for a room header or an item line. forwardRef so the measure
 * layer can read its rendered height; the same component renders the real pages,
 * so measured heights match printed heights exactly.
 */
export const BlockRow = React.forwardRef<HTMLTableRowElement, Props>(
  ({ block, showPrices }, ref) => {
    if (block.kind === 'room') {
      return (
        <tr ref={ref} className="room-header border-b border-slate-300">
          <td className="py-1.5 px-1 text-center font-bold text-slate-600 border-r border-slate-300 bg-slate-100">
            {block.no}
          </td>
          <td colSpan={showPrices ? 4 : 3} className="py-1.5 px-2 font-bold text-slate-900">
            🏠 {block.name}
          </td>
        </tr>
      );
    }

    const { seq, row } = block;
    return (
      <tr ref={ref} className="border-b border-slate-200 text-xs even:bg-slate-50">
        <td className="py-2 px-1 text-center text-slate-500 align-top border-r border-slate-300">
          {seq}
        </td>
        <td className="py-2 px-2 align-top border-r border-slate-300">
          <div className="font-bold text-slate-800 text-[13px]">{row.itemName}</div>
          {row.details && <div className="text-slate-600">{row.details}</div>}
          {row.dimensions !== '-' && (
            <div className="text-slate-500 font-mono mt-0.5 text-[12px]">{row.dimensions}</div>
          )}
          {row.notes && <div className="text-[12px] text-red-500 mt-0.5">* {row.notes}</div>}
        </td>
        <td className="py-2 px-2 text-center align-top font-mono text-slate-900 border-r border-slate-300 font-bold text-[13px]">
          {row.count}
        </td>
        {showPrices ? (
          <>
            <td className="py-2 px-2 text-right align-top font-mono text-slate-700 border-r border-slate-300 text-[13px]">
              {fmtNum(row.unitPrice)}
            </td>
            <td className="py-2 pr-2 text-right align-top font-mono font-bold text-slate-900 text-[13px]">
              {fmtNum(row.amount)}
            </td>
          </>
        ) : (
          <td className="py-2 px-2 text-center align-top text-slate-400">-</td>
        )}
      </tr>
    );
  }
);

BlockRow.displayName = 'BlockRow';
