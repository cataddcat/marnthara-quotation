import React from 'react';
import { ShopConfig } from '@/types';
import { cn } from '@/lib/utils';
import { DocumentType, DOC_TITLES } from '../docTypes';

interface Props {
  shopConfig: ShopConfig;
  docType: DocumentType;
  docId: string;
  pageNo: number;
  pageCount: number;
}

/**
 * Consistent per-page masthead — the shop's identity + document meta + page X/Y.
 * Identical on every page so any loose sheet is traceable to the shop.
 * Border-based (print flattens backgrounds to white — see index.css).
 */
export const PrintPageHeader: React.FC<Props> = ({
  shopConfig,
  docType,
  docId,
  pageNo,
  pageCount,
}) => {
  const isDelivery = docType === 'delivery';

  return (
    <header className="flex justify-between items-start border-b-2 border-slate-800 pb-2 mb-3">
      <div className="flex gap-3 items-start">
        {shopConfig.logoUrl ? (
          <img
            src={shopConfig.logoUrl}
            alt="Logo"
            className="w-[60px] h-[60px] object-contain border border-slate-200 rounded"
          />
        ) : (
          <div className="w-[60px] h-[60px] border border-slate-200 flex items-center justify-center text-slate-300 font-bold rounded text-xs">
            LOGO
          </div>
        )}
        <div className="leading-tight">
          <h1 className="text-lg font-bold text-slate-900">{shopConfig.name || 'ชื่อร้านค้า'}</h1>
          <div className="text-slate-600 whitespace-pre-line text-[12px] mt-0.5">
            {shopConfig.address}
          </div>
          <div className="text-slate-600 text-[12px] mt-1">
            <span className="font-bold">โทร:</span> {shopConfig.phone}
            {shopConfig.taxId && (
              <span className="ml-3">
                <span className="font-bold">เลขผู้เสียภาษี:</span> {shopConfig.taxId}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="text-right shrink-0">
        <div
          className={cn(
            'inline-block px-3 py-1 text-sm font-bold rounded border mb-2',
            isDelivery ? 'border-slate-400' : 'bg-slate-900 text-white border-slate-900'
          )}
        >
          {DOC_TITLES[docType]}
        </div>
        <div className="space-y-1 text-[12px]">
          <div className="flex justify-end items-center gap-2">
            <span className="font-bold text-slate-500">เลขที่:</span>
            <span className="font-mono font-bold text-sm">{docId}</span>
          </div>
          <div className="flex justify-end items-center gap-2">
            <span className="font-bold text-slate-500">วันที่:</span>
            <div className="w-[90px] border-b border-slate-400 h-4"></div>
          </div>
          <div className="flex justify-end items-center gap-2">
            <span className="font-bold text-slate-500">หน้า:</span>
            <span className="font-mono">
              {pageNo} / {pageCount}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
