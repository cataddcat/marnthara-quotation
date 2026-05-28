// src/hooks/useCalculations.ts

import { useMemo, useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { PricingEngine } from '@/lib/pricing/PricingEngine';
import { useAsyncCalculator } from '@/hooks/useAsyncCalculator';

// ⚙️ CONFIG: จำนวนสินค้าที่จะเริ่มใช้ Worker (ปรับได้ตามความแรงเครื่อง)
const WORKER_THRESHOLD = 50;

export interface CalculationResult {
  grandTotal: number;
  discountAmount: number;
  vatAmount: number;
  finalTotal: number;
  netTotal: number; // ยอดก่อน VAT หลังหักส่วนลด
  isCalculating: boolean; // สถานะกำลังคำนวณ (สำหรับโหมด Worker)
}

const DEFAULT_RESULT: CalculationResult = {
  grandTotal: 0,
  discountAmount: 0,
  vatAmount: 0,
  finalTotal: 0,
  netTotal: 0,
  isCalculating: false,
};

export const useCalculations = (): CalculationResult => {
  const rooms = useAppStore((state) => state.rooms);
  const discount = useAppStore((state) => state.discount);
  const shopConfig = useAppStore((state) => state.shopConfig);

  const { calculateBatch } = useAsyncCalculator();

  // State สำหรับเก็บผลลัพธ์จาก Worker
  const [asyncResult, setAsyncResult] = useState<CalculationResult | null>(null);
  const [isWorkerBusy, setIsWorkerBusy] = useState(false);

  const isMountedRef = useRef(true);
  // นับ request ที่ส่งไป Worker เพื่อ abort ผลลัพธ์ที่ล้าสมัย
  const runIdRef = useRef(0);

  // 1. รวบรวม Items ทั้งหมดเพื่อเช็คปริมาณงาน
  const allActiveItems = useMemo(() => {
    return rooms.flatMap((r) => (r.is_suspended ? [] : r.items));
  }, [rooms]);

  const itemCount = allActiveItems.length;
  const useWorker = itemCount >= WORKER_THRESHOLD;

  // 2. 🐢 Logic for Heavy Load (Async / Worker)
  useEffect(() => {
    if (!useWorker) return;

    // จับ ID ของ run นี้ เพื่อ ignore ผลลัพธ์จาก run ก่อนหน้า (stale result)
    const runId = ++runIdRef.current;

    setTimeout(() => setIsWorkerBusy(true), 0);

    calculateBatch(allActiveItems)
      .then((priceMap) => {
        // ตรวจสอบทั้ง unmount และ superseded request
        if (!isMountedRef.current || runIdRef.current !== runId) return;

        const total = Object.values(priceMap).reduce((sum, val) => sum + val, 0);
        const finalCalc = performFinalAdjustments(total, discount, shopConfig.baseVatRate);

        setAsyncResult({ ...finalCalc, isCalculating: false });
        setIsWorkerBusy(false);
      })
      .catch((err) => {
        if (!isMountedRef.current || runIdRef.current !== runId) return;
        console.error("Worker Failed:", err);
        setIsWorkerBusy(false);
      });

    return () => {
      setAsyncResult(null);
      setIsWorkerBusy(false);
    };
  }, [allActiveItems, discount, shopConfig.baseVatRate, calculateBatch, useWorker]);

  // Effect สำหรับรีเซ็ต mount state เมื่อ component ถูก unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 3. 🐇 Logic for Light Load (Sync / Main Thread)
  const syncResult = useMemo(() => {
    if (useWorker) return DEFAULT_RESULT; // ถ้าใช้ Worker ให้ข้ามส่วนนี้

    const total = allActiveItems.reduce((sum, item) => {
      return sum + PricingEngine.calculatePrice(item);
    }, 0);

    return {
      ...performFinalAdjustments(total, discount, shopConfig.baseVatRate),
      isCalculating: false
    };
  }, [allActiveItems, discount, shopConfig.baseVatRate, useWorker]);

  // 4. Decision: คืนค่าไหนดี?
  if (useWorker) {
    // กรณีใช้ Worker: คืนค่าล่าสุดที่คำนวณเสร็จ (หรือ Default ถ้าเพิ่งเริ่ม)
    return {
      ...(asyncResult || DEFAULT_RESULT),
      isCalculating: isWorkerBusy
    };
  }

  // กรณีปกติ: คืนค่า Sync ทันที
  return syncResult;
};

// --- Helper: Logic คำนวณส่วนลดและ VAT (ใช้ร่วมกันทั้ง 2 โหมด) ---
// แยกออกมาเพื่อให้ Code Clean และ Logic ตรงกันเป๊ะ 100%
const performFinalAdjustments = (
  rawTotal: number,
  discount: { type: 'amount' | 'percent'; value: number; is_enabled?: boolean },
  vatRate: number
) => {
  // 1. Apply Discount
  let discountAmt = 0;
  if (discount.is_enabled && discount.value > 0) {
    if (discount.type === 'percent') {
      discountAmt = (rawTotal * discount.value) / 100;
    } else {
      discountAmt = discount.value;
    }
    // ป้องกันส่วนลดเกินราคาสินค้า
    if (discountAmt > rawTotal) discountAmt = rawTotal;
  }

  const afterDiscount = rawTotal - discountAmt;

  // 2. Apply VAT
  let vatAmt = 0;
  let final = afterDiscount;

  if (vatRate > 0) {
    vatAmt = (afterDiscount * vatRate) / 100;
    final = afterDiscount + vatAmt;
  }

  return {
    grandTotal: Math.round(rawTotal * 100) / 100,
    discountAmount: Math.round(discountAmt * 100) / 100,
    netTotal: Math.round(afterDiscount * 100) / 100,
    vatAmount: Math.round(vatAmt * 100) / 100,
    finalTotal: Math.round(final * 100) / 100,
  };
};