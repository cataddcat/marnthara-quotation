// src/hooks/useCalculations.test.ts
// discount + VAT math (sync path) + WORKER_THRESHOLD boundary (>=50 → worker path)
// mock useAsyncCalculator เพื่อเลี่ยง Worker จริง + ควบคุมผลลัพธ์

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const hoisted = vi.hoisted(() => ({ calculateBatch: vi.fn() }));
vi.mock('@/hooks/useAsyncCalculator', () => ({
  useAsyncCalculator: () => ({ calculateBatch: hoisted.calculateBatch }),
}));

import { useCalculations } from './useCalculations';
import { useAppStore } from '@/store/useAppStore';
import { DEFAULT_SHOP_CONFIG } from '@/config/constants';
import { asItemData, makeCurtain } from '@/test/factories';
import type { Discount } from '@/types';

const setPriceItem = (total: number) =>
  asItemData(makeCurtain({ enable_set_price: true, set_price_override: total }));

const seed = (opts: {
  items?: number[];
  discount?: Discount;
  vat?: number;
  suspendedItems?: number[];
}) => {
  const rooms = [
    {
      id: 'r1',
      name: 'A',
      is_suspended: false,
      items: (opts.items ?? []).map(setPriceItem),
    },
  ];
  if (opts.suspendedItems) {
    rooms.push({
      id: 'r2',
      name: 'Suspended',
      is_suspended: true,
      items: opts.suspendedItems.map(setPriceItem),
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

  it('ห้อง suspended → ไม่นับ items ในห้องนั้น', () => {
    seed({ items: [1000], suspendedItems: [9999] });
    const { result } = renderHook(() => useCalculations());
    expect(result.current.grandTotal).toBe(1000);
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
