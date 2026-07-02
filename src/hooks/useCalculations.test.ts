// src/hooks/useCalculations.test.ts
// discount + VAT math (sync path) + WORKER_THRESHOLD boundary (>=50 → worker path)
// mock useAsyncCalculator เพื่อเลี่ยง Worker จริง + ควบคุมผลลัพธ์

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const hoisted = vi.hoisted(() => ({ calculateBatch: vi.fn() }));
vi.mock('@/hooks/useAsyncCalculator', () => ({
  useAsyncCalculator: () => ({ calculateBatch: hoisted.calculateBatch }),
}));

import { useCalculations, performFinalAdjustments } from './useCalculations';
import { useAppStore } from '@/store/useAppStore';
import { DEFAULT_SHOP_CONFIG } from '@/config/constants';
import { asItemData, makeCurtain } from '@/test/factories';
import type { Discount } from '@/types';

const setPriceItem = (total: number, suspended = false) =>
  asItemData(
    makeCurtain({ enable_set_price: true, set_price_override: total, is_suspended: suspended })
  );

const seed = (opts: {
  items?: number[];
  discount?: Discount;
  vat?: number;
  suspendedItems?: number[];
  /** รายการที่ "พักรายการ" (item-level suspend) ในห้องปกติ — ต้องไม่ถูกนับยอด */
  suspendedItemsInRoom?: number[];
}) => {
  const rooms = [
    {
      id: 'r1',
      name: 'A',
      is_suspended: false,
      items: [
        ...(opts.items ?? []).map((t) => setPriceItem(t)),
        ...(opts.suspendedItemsInRoom ?? []).map((t) => setPriceItem(t, true)),
      ],
    },
  ];
  if (opts.suspendedItems) {
    rooms.push({
      id: 'r2',
      name: 'Suspended',
      is_suspended: true,
      items: opts.suspendedItems.map((t) => setPriceItem(t)),
    });
  }
  useAppStore.setState({
    rooms,
    discount: opts.discount ?? { type: 'amount', value: 0, is_enabled: false },
    shopConfig: { ...DEFAULT_SHOP_CONFIG, baseVatRate: opts.vat ?? 7 },
  });
};

beforeEach(() => {
  hoisted.calculateBatch.mockReset();
  hoisted.calculateBatch.mockResolvedValue({});
});

describe('useCalculations — sync path (discount + VAT)', () => {
  it('ไม่มี item → ศูนย์ทั้งหมด', () => {
    seed({ items: [] });
    const { result } = renderHook(() => useCalculations());
    expect(result.current.grandTotal).toBe(0);
    expect(result.current.finalTotal).toBe(0);
    expect(result.current.isCalculating).toBe(false);
  });

  it('1 item 1000 + VAT 7% ไม่มีส่วนลด → final 1070', () => {
    seed({ items: [1000] });
    const { result } = renderHook(() => useCalculations());
    expect(result.current.grandTotal).toBe(1000);
    expect(result.current.discountAmount).toBe(0);
    expect(result.current.netTotal).toBe(1000);
    expect(result.current.vatAmount).toBe(70);
    expect(result.current.finalTotal).toBe(1070);
  });

  it('ส่วนลด percent 10% เปิด → discount 100, net 900, vat 63, final 963', () => {
    seed({ items: [1000], discount: { type: 'percent', value: 10, is_enabled: true } });
    const { result } = renderHook(() => useCalculations());
    expect(result.current.discountAmount).toBe(100);
    expect(result.current.netTotal).toBe(900);
    expect(result.current.vatAmount).toBe(63);
    expect(result.current.finalTotal).toBe(963);
  });

  it('ส่วนลด amount แต่ is_enabled=false → ไม่หักส่วนลด', () => {
    seed({ items: [1000], discount: { type: 'amount', value: 500, is_enabled: false } });
    const { result } = renderHook(() => useCalculations());
    expect(result.current.discountAmount).toBe(0);
    expect(result.current.netTotal).toBe(1000);
  });

  it('ส่วนลดเกินราคา → clamp ไม่ให้ติดลบ', () => {
    seed({ items: [1000], discount: { type: 'amount', value: 5000, is_enabled: true } });
    const { result } = renderHook(() => useCalculations());
    expect(result.current.discountAmount).toBe(1000);
    expect(result.current.netTotal).toBe(0);
    expect(result.current.finalTotal).toBe(0);
  });

  it('VAT 0% → ไม่มี vat, final = net', () => {
    seed({ items: [1000], vat: 0 });
    const { result } = renderHook(() => useCalculations());
    expect(result.current.vatAmount).toBe(0);
    expect(result.current.finalTotal).toBe(1000);
  });

  it('เคาะราคา (target) VAT 0% → คิดส่วนลดย้อน, ยอดสุทธิ = ราคาที่เคาะเป๊ะ', () => {
    seed({ items: [1000], vat: 0, discount: { type: 'target', value: 900, is_enabled: true } });
    const { result } = renderHook(() => useCalculations());
    expect(result.current.grandTotal).toBe(1000);
    expect(result.current.discountAmount).toBe(100); // 1000 - 900
    expect(result.current.netTotal).toBe(900);
    expect(result.current.vatAmount).toBe(0);
    expect(result.current.finalTotal).toBe(900); // เป๊ะ
  });

  it('เคาะราคา (target) VAT 7% → ถอด VAT กลับ, ยอดสุทธิรวม VAT = ราคาที่เคาะ', () => {
    // target 856 = 800 (ก่อน VAT) × 1.07
    seed({ items: [1000], vat: 7, discount: { type: 'target', value: 856, is_enabled: true } });
    const { result } = renderHook(() => useCalculations());
    expect(result.current.netTotal).toBe(800);
    expect(result.current.vatAmount).toBe(56);
    expect(result.current.discountAmount).toBe(200); // 1000 - 800
    expect(result.current.finalTotal).toBe(856); // เป๊ะ
  });

  it('เคาะราคา (target) สูงกว่ายอดรวม → ปรับราคาขึ้น (discount ติดลบ), final = target', () => {
    seed({ items: [1000], vat: 0, discount: { type: 'target', value: 1200, is_enabled: true } });
    const { result } = renderHook(() => useCalculations());
    expect(result.current.discountAmount).toBe(-200); // 1000 - 1200
    expect(result.current.netTotal).toBe(1200);
    expect(result.current.finalTotal).toBe(1200);
  });

  it('เคาะราคา (target) แต่ is_enabled=false → ไม่คิดย้อน (เหมือนไม่มีส่วนลด)', () => {
    seed({ items: [1000], vat: 0, discount: { type: 'target', value: 900, is_enabled: false } });
    const { result } = renderHook(() => useCalculations());
    expect(result.current.discountAmount).toBe(0);
    expect(result.current.finalTotal).toBe(1000);
  });

  it('ห้อง suspended → ไม่นับ items ในห้องนั้น', () => {
    seed({ items: [1000], suspendedItems: [9999] });
    const { result } = renderHook(() => useCalculations());
    expect(result.current.grandTotal).toBe(1000);
  });

  it('รายการที่พัก (item.is_suspended) ในห้องปกติ → ไม่นับยอด (ตรงกับใบพิมพ์/สรุปที่ตัดออก)', () => {
    seed({ items: [1000], suspendedItemsInRoom: [9999] });
    const { result } = renderHook(() => useCalculations());
    expect(result.current.grandTotal).toBe(1000);
    expect(result.current.finalTotal).toBe(1070); // +VAT 7% จากยอดที่ไม่รวมรายการพัก
  });
});

// นโยบาย "round-then-derive": ทุกบรรทัดบนเอกสารต้องบวก/ลบกันลงตัวที่ทศนิยม 2 ตำแหน่งเสมอ
//   grand − discount = net · net + vat = final
// เทียบเป็นสตางค์ (integer) กัน float equality พลาด
const cents = (n: number) => Math.round(n * 100);

const assertLedgerInvariants = (r: ReturnType<typeof performFinalAdjustments>) => {
  for (const v of Object.values(r)) {
    expect(cents(v) / 100, 'ยอดต้องปัด 2 ตำแหน่งแล้ว').toBeCloseTo(v, 9);
  }
  expect(cents(r.grandTotal) - cents(r.discountAmount), 'grand − discount = net').toBe(
    cents(r.netTotal)
  );
  expect(cents(r.netTotal) + cents(r.vatAmount), 'net + vat = final').toBe(cents(r.finalTotal));
};

// LCG กำหนด seed — ชุดสุ่มคงที่ทุกครั้งที่รัน (fail แล้วชี้เคสซ้ำได้)
const makeRng = (seed: number) => {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
};

describe('performFinalAdjustments — ledger invariants (round-then-derive)', () => {
  it('เคส regression: 333.335 · ส่วนลด 10% · VAT 7% ต้องบวกลงตัว (เดิม 333.34−33.33=300.01 แต่โชว์ 300.00)', () => {
    const r = performFinalAdjustments(333.335, { type: 'percent', value: 10, is_enabled: true }, 7);
    assertLedgerInvariants(r);
  });

  it('โหมด target เคาะสูงกว่ายอด → discount ติดลบ แต่ ledger ยังลงตัว', () => {
    const r = performFinalAdjustments(900.005, { type: 'target', value: 1000.004, is_enabled: true }, 7);
    assertLedgerInvariants(r);
    expect(r.finalTotal).toBe(1000);
    expect(r.discountAmount).toBeLessThan(0);
  });

  it('property: สุ่ม 1,500 เคสคงที่ (amount/percent/target × VAT 0/7) ลงตัวทุกเคส', () => {
    const rng = makeRng(20260702);
    const types = ['amount', 'percent', 'target'] as const;
    for (let i = 0; i < 1500; i++) {
      const rawTotal = Math.floor(rng() * 100_000_000) / 1000; // 0..100,000 ละเอียด 3 ตำแหน่ง (จงใจให้มีเศษ)
      const type = types[i % types.length];
      const value =
        type === 'percent'
          ? Math.floor(rng() * 10000) / 100
          : Math.floor(rng() * rawTotal * 120) / 100;
      const vatRate = i % 2 === 0 ? 7 : 0;

      const r = performFinalAdjustments(rawTotal, { type, value, is_enabled: true }, vatRate);
      assertLedgerInvariants(r);
      if (type !== 'target') {
        expect(r.discountAmount).toBeGreaterThanOrEqual(0);
        expect(cents(r.discountAmount)).toBeLessThanOrEqual(cents(r.grandTotal));
      }
      if (vatRate === 0) expect(r.vatAmount).toBe(0);
    }
  });
});

describe('useCalculations — worker path (>= 50 items)', () => {
  it('ใช้ worker, รอผล, แล้วคำนวณ discount/VAT จากผล worker', async () => {
    // resolve แบบหน่วงเวลา (เลียนแบบ worker จริง) เพื่อให้ setIsWorkerBusy(true)
    // ที่ schedule ด้วย setTimeout(0) ใน hook ทำงานก่อน แล้ว resolve ค่อยตั้งกลับเป็น false
    hoisted.calculateBatch.mockImplementation(
      () => new Promise((res) => setTimeout(() => res({ a: 1000 }), 20))
    );
    seed({ items: Array.from({ length: 50 }, () => 1) });

    const { result } = renderHook(() => useCalculations());

    // worker ถูกเรียก
    expect(hoisted.calculateBatch).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(result.current.isCalculating).toBe(false);
      expect(result.current.grandTotal).toBe(1000);
      expect(result.current.finalTotal).toBe(1070); // +7% VAT
    });
  });
});
