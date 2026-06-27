import React, { useLayoutEffect, useRef } from 'react';
import { PrintBlock } from '@/lib/export/printModel';
import { PrintDocContext } from './parts/types';
import { CONTENT_W_PX } from './parts/geometry';
import { PrintPageHeader } from './parts/PrintPageHeader';
import { CustomerSection } from './parts/CustomerSection';
import { ItemsTableHead } from './parts/ItemsTableHead';
import { BlockRow } from './parts/BlockRow';
import { CarryRow } from './parts/CarryRow';
import { SummaryFooter } from './parts/SummaryFooter';
import { SignatureBlock } from './parts/SignatureBlock';

export interface PrintMetrics {
  headerH: number;
  customerH: number;
  colHeadH: number;
  carryRowH: number;
  summaryH: number;
  rowHeights: number[];
}

interface Props {
  ctx: PrintDocContext;
  blocks: PrintBlock[];
  onMetrics: (m: PrintMetrics) => void;
}

/**
 * Hidden, off-print layer rendered at the exact print content width. It renders
 * the real parts (so heights match the printed sheet) and reports measured
 * heights up to the orchestrator, which feeds the paginator. Lives outside the
 * printable ref + is `.no-print`, so it is never printed.
 */
export const PrintMeasureLayer: React.FC<Props> = ({ ctx, blocks, onMetrics }) => {
  const headerRef = useRef<HTMLDivElement>(null);
  const customerRef = useRef<HTMLDivElement>(null);
  const theadRef = useRef<HTMLTableSectionElement>(null);
  const carryRef = useRef<HTMLTableRowElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<(HTMLTableRowElement | null)[]>([]);

  useLayoutEffect(() => {
    onMetrics({
      headerH: headerRef.current?.offsetHeight ?? 0,
      customerH: customerRef.current?.offsetHeight ?? 0,
      colHeadH: theadRef.current?.offsetHeight ?? 0,
      carryRowH: carryRef.current?.offsetHeight ?? 0,
      summaryH: summaryRef.current?.offsetHeight ?? 0,
      rowHeights: blocks.map((_, i) => rowRefs.current[i]?.offsetHeight ?? 0),
    });
    // Re-measure only when content / layout-affecting context changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks, ctx.showPrices, ctx.shopConfig, ctx.customer, ctx.docType]);

  return (
    <div
      aria-hidden
      className="no-print"
      style={{
        position: 'absolute',
        left: -99999,
        top: 0,
        width: CONTENT_W_PX,
        visibility: 'hidden',
        pointerEvents: 'none',
      }}
    >
      <div ref={headerRef}>
        <PrintPageHeader
          shopConfig={ctx.shopConfig}
          docType={ctx.docType}
          docId={ctx.docId}
          pageNo={1}
          pageCount={1}
        />
      </div>
      <div ref={customerRef}>
        <CustomerSection customer={ctx.customer} />
      </div>
      <table className="w-full border-collapse">
        <thead ref={theadRef}>
          <ItemsTableHead showPrices={ctx.showPrices} />
        </thead>
        <tbody>
          {blocks.map((block, i) => (
            <BlockRow
              key={block.key}
              ref={(el) => {
                rowRefs.current[i] = el;
              }}
              block={block}
              showPrices={ctx.showPrices}
            />
          ))}
          <CarryRow ref={carryRef} label="ยอดยกมา" amount={0} />
        </tbody>
      </table>
      <div ref={summaryRef}>
        <SummaryFooter
          showPrices={ctx.showPrices}
          shopConfig={ctx.shopConfig}
          grandTotal={ctx.totals.grandTotal}
          discountAmount={ctx.totals.discountAmount}
          vatAmount={ctx.totals.vatAmount}
          finalTotal={ctx.totals.finalTotal}
          hideBreakdown={ctx.totals.hideBreakdown}
        />
        <SignatureBlock />
      </div>
    </div>
  );
};
