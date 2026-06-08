import React from 'react';

const SignatureBox: React.FC<{ title: string }> = ({ title }) => (
  <div className="border border-slate-300 rounded-xl p-3 flex flex-col items-center justify-between min-h-[120px]">
    <div className="text-xs font-bold text-slate-900 uppercase tracking-wide">{title}</div>
    <div className="w-full flex flex-col items-center mt-auto">
      <div className="border-b border-slate-900 w-[160px] h-6 mb-3"></div>
      <div className="flex gap-1 text-slate-500 text-[12px]">
        (
        <div className="w-[140px] text-center relative top-[2px]">
          ..................................................
        </div>
        )
      </div>
    </div>
    <div className="flex items-center justify-center gap-2 text-[12px] text-slate-500 mt-2">
      <span>วันที่:</span>
      <div className="w-8 border-b border-slate-400 h-4"></div>
      <span>/</span>
      <div className="w-8 border-b border-slate-400 h-4"></div>
      <span>/</span>
      <div className="w-10 border-b border-slate-400 h-4"></div>
    </div>
  </div>
);

/** Two signature boxes — last page only. */
export const SignatureBlock: React.FC = () => (
  <div className="grid grid-cols-2 gap-6 mt-6">
    <SignatureBox title="ผู้เสนอราคา / ผู้รับเงิน" />
    <SignatureBox title="ผู้อนุมัติสั่งซื้อ / ผู้รับสินค้า" />
  </div>
);
