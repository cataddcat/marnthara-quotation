// src/hooks/useAsyncCalculator.test.ts
// calculateBatch: array→map conversion, context passing, error rejection
// mock Vite `?worker` import ด้วย FakeWorker ที่ echo ผลตาม item._mockTotal / _mockError

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const hoisted = vi.hoisted(() => {
  const posted: Array<{ id: string; items: unknown[]; context: unknown }> = [];

  class FakeWorker {
    listeners: Record<string, Array<(e: MessageEvent) => void>> = {};
    addEventListener(type: string, cb: (e: MessageEvent) => void) {
      (this.listeners[type] ||= []).push(cb);
    }
    removeEventListener(type: string, cb: (e: MessageEvent) => void) {
      this.listeners[type] = (this.listeners[type] || []).filter((l) => l !== cb);
    }
    terminate() {}
    postMessage(data: { id: string; items: Array<Record<string, unknown>>; context: unknown }) {
      posted.push(data);
      const hasErr = data.items.some((i) => i._mockError);
      queueMicrotask(() => {
        const ev = hasErr
          ? { data: { id: data.id, error: 'boom' } }
          : {
              data: {
                id: data.id,
                results: data.items.map((i) => ({ itemId: i.id, total: i._mockTotal ?? 0 })),
              },
            };
        (this.listeners['message'] || []).forEach((cb) => cb(ev as MessageEvent));
      });
    }
  }

  return { posted, FakeWorker };
});

vi.mock('@/lib/pricing/pricing.worker?worker', () => ({ default: hoisted.FakeWorker }));

beforeEach(() => {
  hoisted.posted.length = 0;
});

describe('useAsyncCalculator.calculateBatch', () => {
  it('แปลง results array → map { itemId: total }', async () => {
    const { result } = renderHook(() => useAsyncCalculatorImport());
    const map = await result.current.calculateBatch([
      { id: 'a', _mockTotal: 100 },
      { id: 'b', _mockTotal: 250 },
    ] as never);
    expect(map).toEqual({ a: 100, b: 250 });
  });

  it('ส่ง context.formulas เข้า worker', async () => {
    const { result } = renderHook(() => useAsyncCalculatorImport());
    await result.current.calculateBatch([{ id: 'a', _mockTotal: 1 }] as never);
    expect(hoisted.posted).toHaveLength(1);
    expect(hoisted.posted[0].context).toHaveProperty('formulas');
  });

  it('worker คืน error → promise reject', async () => {
    const { result } = renderHook(() => useAsyncCalculatorImport());
    await expect(
      result.current.calculateBatch([{ id: 'bad', _mockError: true }] as never)
    ).rejects.toThrow('boom');
  });

  it('batch ว่าง → map ว่าง', async () => {
    const { result } = renderHook(() => useAsyncCalculatorImport());
    const map = await result.current.calculateBatch([] as never);
    expect(map).toEqual({});
  });
});

// import แบบ lazy หลัง vi.mock hoist เพื่อให้ mock มีผล
import { useAsyncCalculator as useAsyncCalculatorImport } from './useAsyncCalculator';
