import React from 'react';
import { ShopConfig } from '@/types';
import { bahttext } from '@/utils/formatters';
import { fmtNum } from './fmt';

interface Props {
  showPrices: boolean;
  shopConfig: ShopConfig;
  grandTotal: number;
  discountAmount: number;
  vatAmount: number;
  finalTotal: number;
}

/** Conditions / bank / amount-in-words + the totals box — last page only. */
export const SummaryFooter: React.FC<Props> = ({
  showPrices,
  shopConfig,
  grandTotal,
  discountAmount,
  vatAmount,
  finalTotal,
}) => (
  <div className="mt-4">
    <div className="flex items-start border-t-2 border-slate-800 pt-3 gap-6">
      <div className="flex-1">
        {showPrices && (
          <div className="bg-slate-100 p-2 rounded mb-2 text-center border border-slate-200">
            <span className="text-[12px] text-slate-500 block uppercase tracking-wider mb-1">
              จำนวนเงินตัวอักษร
            </span>
            <span className="font-bold text-slate-800 text-sm">{bahttext(finalTotal)}</span>
          </div>
        )}
        <div className="text-[12px] text-slate-600 space-y-1">
          <div className="font-bold text-slate-800 text-xs">เงื่อนไข / หมายเหตุ:</div>
          <ul className="list-disc list-inside pl-1">
            {shopConfig.pdf?.priceValidity && <li>ยืนยันราคาภายใน {shopConfig.pdf.priceValidity}</li>}
            {shopConfig.pdf?.paymentTerms && <li>{shopConfig.pdf.paymentTerms}</li>}
            {shopConfig.pdf?.notes?.map((note, i) => note.trim() && <li key={i}>{note}</li>)}
          </ul>

          {shopConfig.bankAccount?.isEnabled !== false && shopConfig.bankAccount?.accountNumber && (
            <div className="mt-2 p-2 border border-slate-300 rounded bg-white inline-block min-w-[250px]">
              <div className="font-bold text-slate-900 mb-1 border-b border-slate-200 pb-1">
                ชำระเงินผ่านบัญชี
              </div>
              <div className="grid grid-cols-[60px_1fr] gap-1">
                <span className="text-slate-500">ธนาคาร:</span>
                <span>{shopConfig.bankAccount.bankName}</span>
                <span className="text-slate-500">ชื่อบัญชี:</span>
                <span>{shopConfig.bankAccount.accountName}</span>
                <span className="text-slate-500">เลขที่:</span>
                <span className="font-mono font-bold text-slate-900 text-[13px]">
                  {shopConfig.bankAccount.accountNumber}
                </span>
                {shopConfig.bankAccount.branch && (
                  <>
                    <span className="text-slate-500">สาขา:</span>
                    <span>{shopConfig.bankAccount.branch}</span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {showPrices && (
        <div className="w-[260px] text-sm">
          <div className="space-y-1 border-b border-slate-300 pb-2 mb-2">
            <div className="flex justify-between text-slate-600">
              <span>รวมเป็นเงิน</span>
              <span className="font-mono font-medium text-[13px]">{fmtNum(grandTotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-green-700">
                <span>ส่วนลด</span>
                <span className="font-mono font-medium text-[13px]">-{fmtNum(discountAmount)}</span>
              </div>
            )}
            {shopConfig.baseVatRate > 0 && (
              <>
                <div className="flex justify-between text-slate-600 text-xs">
                  <span>หลังหักส่วนลด</span>
                  <span className="font-mono">{fmtNum(grandTotal - discountAmount)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>VAT {shopConfig.baseVatRate}%</span>
                  <span className="font-mono">{fmtNum(vatAmount)}</span>
                </div>
              </>
            )}
          </div>
          <div className="flex justify-between items-center text-black p-3 rounded shadow-sm">
            <span className="font-bold">ยอดสุทธิ</span>
            <span className="font-bold text-xl font-mono">{fmtNum(finalTotal)}</span>
          </div>
        </div>
      )}
    </div>
  </div>
);
