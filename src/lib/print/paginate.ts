// src/lib/print/paginate.ts
//
// Pure, app-controlled pagination. The browser cannot place a correct
// carried-forward subtotal at a page break (it's a partial sum at a break point
// CSS can't compute), so we decide the breaks ourselves from measured heights.
// Pure + deterministic → unit-tested in paginate.test.ts.

import { PrintBlock } from './printModel';

export interface PaginateBudgets {
  /** px available for [brought row + items + carried row] on the FIRST page (customer block already subtracted). */
  first: number;
  /** px available for the same band on a MIDDLE page. */
  middle: number;
  /** px the last-page summary + signature block needs below the items. */
  summary: number;
  /** px height of one carry row (ยอดยกมา / ยอดยกไป). */
  carryRow: number;
}

export interface PrintPageModel {
  blocks: PrintBlock[];
  /** ยอดยกมา — running total brought in from the previous page (null on first page / unpriced). */
  broughtForward: number | null;
  /** ยอดยกไป — running total carried out to the next page (null on last page / unpriced). */
  carriedForward: number | null;
  isFirst: boolean;
  isLast: boolean;
}

/**
 * @param blocks      ordered room/item blocks
 * @param rowHeights  measured px height per block (same index as `blocks`)
 * @param budgets     per-page space budgets (px)
 * @param priced      false for the delivery note (no money column → no carry rows)
 */
export function paginate(
  blocks: PrintBlock[],
  rowHeights: number[],
  budgets: PaginateBudgets,
  priced: boolean
): PrintPageModel[] {
  const n = blocks.length;

  // Empty doc → one page that still carries header/customer/empty table/summary.
  if (n === 0) {
    return [{ blocks: [], broughtForward: null, carriedForward: null, isFirst: true, isLast: true }];
  }

  // 1) Greedy pack into index ranges. Assume every page continues (reserve a
  //    carried row); the genuine last page reclaims it in step 2.
  const ranges: { start: number; end: number }[] = [];
  let i = 0;
  let pageIdx = 0;
  while (i < n) {
    const isFirst = pageIdx === 0;
    let avail = isFirst ? budgets.first : budgets.middle;
    if (priced && !isFirst) avail -= budgets.carryRow; // ยอดยกมา (top)
    if (priced) avail -= budgets.carryRow; // ยอดยกไป (bottom, tentative)

    const start = i;
    let used = 0;
    while (i < n) {
      const block = blocks[i];
      // Keep a room header glued to its first item so it never orphans at a page foot.
      let need = rowHeights[i];
      if (block.kind === 'room' && i + 1 < n && blocks[i + 1].kind === 'item') {
        need += rowHeights[i + 1];
      }
      if (used + need > avail && i > start) break;
      used += rowHeights[i];
      i++;
    }
    // Guarantee forward progress even if a single block exceeds a full page.
    if (i === start) i = start + 1;

    ranges.push({ start, end: i });
    pageIdx++;
  }

  // 2) Make room for the last-page summary. The last page renders no carried row,
  //    so it reclaims that space; if the summary still doesn't fit, give it its own page.
  const last = ranges[ranges.length - 1];
  const lastIsFirst = ranges.length === 1;
  let lastAvail = lastIsFirst ? budgets.first : budgets.middle;
  if (priced && !lastIsFirst) lastAvail -= budgets.carryRow; // brought only; no carried on last
  let lastUsed = 0;
  for (let k = last.start; k < last.end; k++) lastUsed += rowHeights[k];
  if (lastUsed + budgets.summary > lastAvail) {
    ranges.push({ start: last.end, end: last.end }); // summary-only final page
  }

  // 3) Materialise pages with running carried/brought sums.
  const pages: PrintPageModel[] = [];
  let running = 0;
  ranges.forEach((r, idx) => {
    const isFirst = idx === 0;
    const isLast = idx === ranges.length - 1;
    const broughtForward = priced && !isFirst ? running : null;
    for (let k = r.start; k < r.end; k++) {
      const b = blocks[k];
      if (b.kind === 'item') running += b.row.amount;
    }
    const carriedForward = priced && !isLast ? running : null;
    pages.push({
      blocks: blocks.slice(r.start, r.end),
      broughtForward,
      carriedForward,
      isFirst,
      isLast,
    });
  });

  return pages;
}
