import { describe, it, expect } from 'vitest';
import { paginate, PaginateBudgets, PrintPageModel } from './paginate';
import { PrintBlock } from './printModel';

// --- builders -------------------------------------------------------------

let seq = 0;
const room = (name = 'ห้อง'): PrintBlock => ({ kind: 'room', key: `r${seq++}`, no: 1, name });
const item = (amount: number): PrintBlock => ({
  kind: 'item',
  key: `i${seq++}`,
  seq: '1.1',
  row: { itemName: 'x', details: '', dimensions: '-', count: 1, unitPrice: amount, amount },
});

const ITEM_H = 100;
const ROOM_H = 50;
const heightsFor = (blocks: PrintBlock[]) =>
  blocks.map((b) => (b.kind === 'room' ? ROOM_H : ITEM_H));

// Verifies the running-sum contract: first page has no brought, last has no
// carried, and every break's carried equals the next page's brought.
const assertCarryInvariants = (pages: PrintPageModel[], priced: boolean) => {
  expect(pages[0].broughtForward).toBeNull();
  expect(pages[pages.length - 1].carriedForward).toBeNull();

  let running = 0;
  pages.forEach((p, idx) => {
    const expectedBrought = !priced || idx === 0 ? null : running;
    expect(p.broughtForward).toBe(expectedBrought);

    p.blocks.forEach((b) => {
      if (b.kind === 'item') running += b.row.amount;
    });

    const expectedCarried = !priced || idx === pages.length - 1 ? null : running;
    expect(p.carriedForward).toBe(expectedCarried);
  });
};

describe('paginate', () => {
  it('keeps everything on one page when it all fits', () => {
    const blocks = [room(), item(100), item(200), item(300)];
    const budgets: PaginateBudgets = { first: 1000, middle: 1000, summary: 50, carryRow: 40 };
    const pages = paginate(blocks, heightsFor(blocks), budgets, true);

    expect(pages).toHaveLength(1);
    expect(pages[0].isFirst && pages[0].isLast).toBe(true);
    expect(pages[0].broughtForward).toBeNull();
    expect(pages[0].carriedForward).toBeNull();
  });

  it('splits across pages with consistent carried/brought running totals', () => {
    const blocks = [
      room(),
      item(100),
      item(100),
      item(100),
      item(100),
      item(100),
      item(100),
    ];
    // Small budgets force multiple pages.
    const budgets: PaginateBudgets = { first: 280, middle: 280, summary: 20, carryRow: 40 };
    const pages = paginate(blocks, heightsFor(blocks), budgets, true);

    expect(pages.length).toBeGreaterThan(1);
    assertCarryInvariants(pages, true);
    // Total carried at the final break reconciles to the sum of all amounts.
    const total = blocks.reduce((s, b) => s + (b.kind === 'item' ? b.row.amount : 0), 0);
    expect(total).toBe(600);
  });

  it('never orphans a room header at the foot of a page', () => {
    const blocks = [room(), item(100), item(100), room(), item(100)];
    const budgets: PaginateBudgets = { first: 300, middle: 300, summary: 0, carryRow: 0 };
    const pages = paginate(blocks, heightsFor(blocks), budgets, true);

    pages.forEach((p) => {
      if (p.blocks.length > 1) {
        const lastBlock = p.blocks[p.blocks.length - 1];
        expect(lastBlock.kind).not.toBe('room');
      }
    });
  });

  it('pushes the summary onto its own final page when it does not fit', () => {
    const blocks = [item(100), item(100)];
    const budgets: PaginateBudgets = { first: 300, middle: 300, summary: 200, carryRow: 0 };
    const pages = paginate(blocks, heightsFor(blocks), budgets, true);

    expect(pages).toHaveLength(2);
    expect(pages[1].blocks).toHaveLength(0);
    expect(pages[1].isLast).toBe(true);
    expect(pages[0].carriedForward).toBe(200);
    expect(pages[1].broughtForward).toBe(200);
  });

  it('emits no carry rows for an unpriced (delivery) document', () => {
    const blocks = [room(), item(100), item(100), item(100), item(100)];
    const budgets: PaginateBudgets = { first: 250, middle: 250, summary: 20, carryRow: 0 };
    const pages = paginate(blocks, heightsFor(blocks), budgets, false);

    expect(pages.length).toBeGreaterThan(1);
    assertCarryInvariants(pages, false);
  });

  it('returns a single page for an empty document', () => {
    const budgets: PaginateBudgets = { first: 300, middle: 300, summary: 200, carryRow: 40 };
    const pages = paginate([], [], budgets, true);

    expect(pages).toHaveLength(1);
    expect(pages[0].isFirst && pages[0].isLast).toBe(true);
    expect(pages[0].blocks).toHaveLength(0);
  });
});
