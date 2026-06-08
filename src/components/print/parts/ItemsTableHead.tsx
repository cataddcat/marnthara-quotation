import React from 'react';

interface Props {
  showPrices: boolean;
}

/** Column-label row — rendered inside each page's <thead> so widths stay aligned. */
export const ItemsTableHead: React.FC<Props> = ({ showPrices }) => (
  <tr className="bg-slate-100 text-slate-900 text-xs border-b border-slate-300">
    <th className="py-2 w-[45px] text-center font-bold border-r border-slate-300">ลำดับ</th>
    <th className="py-2 px-2 text-left font-bold border-r border-slate-300">
      รายการสินค้า (Description)
    </th>
    <th className="py-2 px-2 w-[60px] text-center font-bold border-r border-slate-300">จำนวน</th>
    {showPrices ? (
      <>
        <th className="py-2 px-2 w-[112px] text-right font-bold border-r border-slate-300">
          ราคา/หน่วย
        </th>
        <th className="py-2 pr-2 w-[120px] text-right font-bold">จำนวนเงิน</th>
      </>
    ) : (
      <th className="py-2 px-2 w-[150px] text-center font-bold">หมายเหตุ</th>
    )}
  </tr>
);
