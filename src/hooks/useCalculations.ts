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
  // กรองทั้งห้องที่พัก และ "รายการที่พัก" (item.is_suspended) — ให้ตรงกับ printModel/summaryGenerator
  // ที่ตัดรายการพักออกจากเอกสารอยู่แล้ว (ไม่งั้นยอดรวมบนใบพิมพ์ ≠ ผลรวมรายการที่แสดง)
  const allActiveItems = useMemo(() => {
    return rooms.flatMap((r) => (r.is_suspended ? [] : r.items.filter((i) => !i.is_suspended)));
  }, [rooms]);

  const itemCount = allActiveItems.length;
  const useWorker = itemCount >= WORKER_THRESHOLD;

  // 2. 🐢 Logic for Heavy Load (Async / Worker)
  useEffect(() => {
    if (!useWorker) return;

    // จับ ID ของ run นี้ เพื่อ ignore ผลลัพธ์จาก run ก่อนหน้า (stale result)
    const runId = ++runIdRef.current;

    // ตั้งสถานะ "กำลังคำนวณ" ผ่าน setTimeout(0) — กฎ react-hooks/set-state-in-effect ห้าม setState
    // ตรง ๆ ใน effect body; เก็บ handle ไว้ clearTimeout เมื่อผลลัพธ์มาก่อน (กันเคสงานเสร็จไวมาก
    // แล้ว timer ยิงทีหลัง ทับ false ด้วย true ค้าง)
    const busyTimer = setTimeout(() => setIsWorkerBusy(true), 0);

    calculateBatch(allActiveItems)
      .then((priceMap) => {
        clearTimeout(busyTimer); // ผลมาแล้ว — busy ที่ยังไม่ทันตั้งไม่ต้องตั้ง
        // ตรวจสอบทั้ง unmount และ superseded request
        if (!isMountedRef.current || runIdRef.current !== runId) return;

        const total = Object.values(priceMap).reduce((sum, val) => sum + val, 0);
        const finalCalc = performFinalAdjustments(total, discount, shopConfig.baseVatRate);

        setAsyncResult({ ...finalCalc, isCalculating: false });
        setIsWorkerBusy(false);
      })
      .catch((err) => {
        clearTimeout(busyTimer);
        if (!isMountedRef.current || runIdRef.current !== runId) return;
        console.error("Worker Failed:", err);
        setIsWorkerBusy(false);
      });

    return () => {
      // คงผลเก่าไว้ระหว่างรอ run ใหม่ (isCalculating บอกสถานะอยู่แล้ว) — ห้าม setAsyncResult(null)
      // ไม่งั้นงาน ≥ WORKER_THRESHOLD ยอดรวมจะกระพริบเป็น 0 ทุกครั้งที่ autosave แตะ rooms
      clearTimeout(busyTimer);
    };
  }, [allActiveItems, discount, shopConfig.baseVatRate, calculateBatch, useWorker]);

  // Effect สำหรับติดตาม mount state — ต้อง set true ใน setup ด้วย ไม่ใช่พึ่งค่าเริ่มของ ref
  // (StrictMode รัน setup→cleanup→setup: ถ้าไม่ set กลับ ref จะค้าง false แล้วผล worker ถูกทิ้งทั้ง session)
  useEffect(() => {
    isMountedRef.current = true;
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
// export: ใช้ซ้ำในสรุปเงินต่องาน (job-summary.ts) — สูตรส่วนลด/VAT เดียวกับหน้าหลัก
//
// นโยบายปัดเศษ = "round-then-derive": ปัดยอดตั้งต้นก่อน แล้ว "คำนวณยอดถัดไปจากค่าที่ปัดแล้ว"
// เพื่อให้ทุกบรรทัดบนเอกสารบวก/ลบกันลงตัวเสมอ (grand − discount = net · net + vat = final)
// — ห้ามปัดแต่ละยอดแยกจากค่าดิบ float (เคยทำให้เอกสารโชว์ 333.34 − 33.33 = 300.01 แต่ net 300.00)

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export const performFinalAdjustments = (
  rawTotal: number,
  discount: { type: 'amount' | 'percent' | 'target'; value: number; is_enabled?: boolean },
  vatRate: number
) => {
  const grandTotal = round2(rawTotal);

  // โหมด target (เคาะราคา): value = ยอดสุทธิที่ต้องการ → derive ย้อนจาก finalTotal ที่ปัดแล้ว
  if (discount.is_enabled && discount.type === 'target' && discount.value >= 0) {
    const finalTotal = round2(discount.value);
    // VAT เปิด → target คือยอดรวม VAT แล้ว, ถอด VAT กลับเพื่อหายอดก่อนภาษี
    const netTotal = vatRate > 0 ? round2(finalTotal / (1 + vatRate / 100)) : finalTotal;
    const vatAmount = round2(finalTotal - netTotal); // ผลต่างของค่า 2 ตำแหน่ง → net+vat=final เป๊ะ
    // discountAmount อาจติดลบได้ถ้าเคาะราคา > ยอดรวมสินค้า (ปัดราคาขึ้น) — ปล่อยให้จอ guard เอง
    const discountAmount = round2(grandTotal - netTotal);

    return { grandTotal, discountAmount, netTotal, vatAmount, finalTotal };
  }

  // 1. Apply Discount — คิดจาก grandTotal (ค่าที่ปัดแล้ว) ให้ตรงกับที่ผู้ใช้เห็นบนเอกสาร
  let discountAmount = 0;
  if (discount.is_enabled && discount.value > 0) {
    const raw =
      discount.type === 'percent' ? (grandTotal * discount.value) / 100 : discount.value;
    // ป้องกันส่วนลดเกินราคาสินค้า
    discountAmount = round2(Math.min(raw, grandTotal));
  }

  const netTotal = round2(grandTotal - discountAmount);

  // 2. Apply VAT — คิดจาก netTotal ที่ปัดแล้ว
  const vatAmount = vatRate > 0 ? round2((netTotal * vatRate) / 100) : 0;
  const finalTotal = round2(netTotal + vatAmount);

  return { grandTotal, discountAmount, netTotal, vatAmount, finalTotal };
};