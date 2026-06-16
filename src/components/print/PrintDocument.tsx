import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useCalculations } from '@/hooks/useCalculations';
import { buildBlocks } from '@/lib/print/printModel';
import { paginate, PaginateBudgets } from '@/lib/print/paginate';
import { DocumentType } from './docTypes';
import { PrintDocContext } from './parts/types';
import { PrintPage } from './parts/PrintPage';
import { PrintMeasureLayer, PrintMetrics } from './PrintMeasureLayer';
import { CONTENT_H_PX, SLACK_PX } from './parts/geometry';
import { formatDocCode } from '@/lib/docName';

// Re-export so existing importers (PdfPreviewModal) keep working.
export type { DocumentType } from './docTypes';

interface PrintDocumentProps {
  docType: DocumentType;
  /** Reports the computed page count so the preview chrome can show "หน้า X/Y". */
  onPageCount?: (count: number) => void;
}

/** Translate measured chrome heights into the paginator's per-page px budgets. */
const buildBudgets = (m: PrintMetrics): PaginateBudgets => {
  const tableArea = CONTENT_H_PX - m.headerH - m.colHeadH - SLACK_PX;
  return {
    first: Math.max(tableArea - m.customerH, 0),
    middle: Math.max(tableArea, 0),
    summary: m.summaryH,
    carryRow: m.carryRowH,
  };
};

// @page margin:0 + each sheet is a full A4 box with its own padding → exact,
// app-controlled pagination. Container switches to block in print so the
// per-sheet page breaks are honoured (break-after on flex items is unreliable).
const printStyles = `
  @page { size: A4; margin: 0; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    html, body { height: auto !important; overflow: visible !important; }
    #root { display: block !important; }
    .no-print { display: none !important; }
    tr { break-inside: avoid; page-break-inside: avoid; }
    .print-page { box-shadow: none !important; }
  }
`;

export const PrintDocument = React.forwardRef<HTMLDivElement, PrintDocumentProps>(
  ({ docType, onPageCount }, ref) => {
    const { shopConfig, customer, rooms, discount } = useAppStore((state) => state);
    const ensureCustomerIdentity = useAppStore((state) => state.ensureCustomerIdentity);
    const { grandTotal, discountAmount, vatAmount, finalTotal } = useCalculations();

    // เคาะราคา + เลือกซ่อนรายการ → เอกสารลูกค้าแสดงเฉพาะยอดสุทธิ (ราคาเดียว)
    const hideBreakdown = discount.type === 'target' && !!discount.hide_breakdown;

    // "เลขที่" บนเอกสาร = รหัสเอกสารจาก identity ลูกค้า (คงที่/สืบกลับลูกค้าได้,
    // ไม่ใช่เลขสุ่มที่ regenerate ทุก render แบบเดิม). backfill id แบบ lazy ตอน mount
    useEffect(() => {
      ensureCustomerIdentity();
    }, [ensureCustomerIdentity]);
    const docId = formatDocCode({
      id: customer.id,
      code: customer.code,
      seq: customer.docSeq ?? 1,
    });

    const [metrics, setMetrics] = useState<PrintMetrics | null>(null);

    const showPrices = docType !== 'delivery';

    const blocks = useMemo(() => buildBlocks(rooms), [rooms]);

    const ctx: PrintDocContext = useMemo(
      () => ({
        shopConfig,
        customer,
        docType,
        docId,
        showPrices,
        totals: { grandTotal, discountAmount, vatAmount, finalTotal, hideBreakdown },
      }),
      [
        shopConfig,
        customer,
        docType,
        docId,
        showPrices,
        grandTotal,
        discountAmount,
        vatAmount,
        finalTotal,
        hideBreakdown,
      ]
    );

    const pages = useMemo(() => {
      if (!metrics) return [];
      return paginate(blocks, metrics.rowHeights, buildBudgets(metrics), showPrices);
    }, [metrics, blocks, showPrices]);

    const handleMetrics = useCallback((m: PrintMetrics) => setMetrics(m), []);

    useEffect(() => {
      if (pages.length) onPageCount?.(pages.length);
    }, [pages.length, onPageCount]);

    return (
      <>
        {/* Hidden measuring pass — outside the printable ref, never printed. */}
        <PrintMeasureLayer ctx={ctx} blocks={blocks} onMetrics={handleMetrics} />

        <div ref={ref} className="bg-white">
          <style>{printStyles}</style>
          <div className="print-doc flex flex-col items-center gap-6 print:block print:gap-0">
            {pages.map((page, i) => (
              <PrintPage key={i} ctx={ctx} page={page} pageNo={i + 1} pageCount={pages.length} />
            ))}
          </div>
        </div>
      </>
    );
  }
);

PrintDocument.displayName = 'PrintDocument';
