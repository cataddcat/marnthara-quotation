import React from 'react';
import { PrintPageModel } from '@/lib/print/paginate';
import { PrintDocContext } from './types';
import { PAGE_STYLE } from './geometry';
import { PrintPageHeader } from './PrintPageHeader';
import { CustomerSection } from './CustomerSection';
import { ItemsTableHead } from './ItemsTableHead';
import { BlockRow } from './BlockRow';
import { CarryRow } from './CarryRow';
import { SummaryFooter } from './SummaryFooter';
import { SignatureBlock } from './SignatureBlock';

interface Props {
  ctx: PrintDocContext;
  page: PrintPageModel;
  pageNo: number;
  pageCount: number;
}

/** One fully-composed A4 sheet (preview + print share this exact markup). */
export const PrintPage: React.FC<Props> = ({ ctx, page, pageNo, pageCount }) => {
  const { shopConfig, customer, docType, docId, showPrices, totals } = ctx;

  return (
    <div
      className="print-page bg-white text-slate-900 font-sans leading-normal text-[12px] flex flex-col shadow-lg print:shadow-none"
      style={{ ...PAGE_STYLE, breakAfter: page.isLast ? 'auto' : 'page' }}
    >
      <PrintPageHeader
        shopConfig={shopConfig}
        docType={docType}
        docId={docId}
        pageNo={pageNo}
        pageCount={pageCount}
      />

      {page.isFirst && <CustomerSection customer={customer} />}

      <div className="flex-1">
        <table className="w-full border border-slate-300 border-collapse">
          <thead>
            <ItemsTableHead showPrices={showPrices} />
          </thead>
          <tbody>
            {showPrices && page.broughtForward != null && (
              <CarryRow label="ยอดยกมา" amount={page.broughtForward} />
            )}
            {page.blocks.map((block) => (
              <BlockRow key={block.key} block={block} showPrices={showPrices} />
            ))}
            {showPrices && page.carriedForward != null && (
              <CarryRow label="ยอดยกไป" amount={page.carriedForward} />
            )}
          </tbody>
        </table>
      </div>

      {page.isLast && (
        <>
          <SummaryFooter
            showPrices={showPrices}
            shopConfig={shopConfig}
            grandTotal={totals.grandTotal}
            discountAmount={totals.discountAmount}
            vatAmount={totals.vatAmount}
            finalTotal={totals.finalTotal}
          />
          <SignatureBlock />
        </>
      )}
    </div>
  );
};
