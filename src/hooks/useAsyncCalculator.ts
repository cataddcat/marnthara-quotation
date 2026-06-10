// src/hooks/useAsyncCalculator.ts

import { useEffect, useRef, useCallback } from 'react';
import { ItemData } from '@/types';
import { FORMULAS } from '@/config/formulas';

// Vite Worker Import Syntax
import PricingWorker from '@/lib/pricing/pricing.worker?worker';

export const useAsyncCalculator = () => {
  const workerRef = useRef<Worker | null>(null);
  // promise ที่ยังรอ worker ตอบ — เก็บ reject ไว้เพื่อ settle ตอน terminate
  // (เดิมถ้า unmount ก่อนได้ผลลัพธ์ promise จะค้างไม่ settle ตลอดไป)
  const pendingRef = useRef<Map<string, (reason: Error) => void>>(new Map());

  useEffect(() => {
    // Initialize the worker thread
    workerRef.current = new PricingWorker();
    const pending = pendingRef.current;

    return () => {
      // Cleanup: Kill worker when component unmounts to free memory
      workerRef.current?.terminate();
      workerRef.current = null;
      // settle ทุก promise ที่ค้าง — ผู้เรียก (useCalculations) มี .catch รองรับอยู่แล้ว
      pending.forEach((reject) => reject(new Error('Pricing Worker terminated')));
      pending.clear();
    };
  }, []);

  /**
   * ส่งรายการสินค้าไปคำนวณหลังบ้าน (Asynchronous)
   * Returns: Promise ที่คืนค่าเป็น Map { [itemId]: price }
   */
  const calculateBatch = useCallback((items: ItemData[]): Promise<Record<string, number>> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        reject(new Error('Pricing Worker is not initialized'));
        return;
      }

      // FORMULAS เป็น compile-time constant (src/config/formulas.ts)
      // ส่งเข้า worker เพื่อรักษา API เดิม + รองรับ test override pattern ในอนาคต
      const formulas = FORMULAS;

      const requestId = Math.random().toString(36).substring(7);

      // ลงทะเบียน reject ไว้ก่อน — ถ้า worker ถูก terminate ระหว่างรอ จะถูก settle จาก cleanup
      pendingRef.current.set(requestId, reject);

      // สร้าง Listener ชั่วคราวสำหรับ Request นี้
      const handleMessage = (e: MessageEvent) => {
        // ตรวจสอบว่าเป็นคำตอบของ Request ID นี้หรือไม่
        if (e.data.id === requestId) {
          pendingRef.current.delete(requestId);
          if (e.data.error) {
            reject(new Error(e.data.error));
          } else {
            const resultsArray = e.data.results as Array<{ itemId: string; total: number }>;
            
            // Convert Array to Map for O(1) lookup
            const resultMap: Record<string, number> = {};
            resultsArray.forEach(r => {
              resultMap[r.itemId] = r.total;
            });
            
            resolve(resultMap);
          }
          
          // ล้าง Listener ออกเมื่อเสร็จงาน
          workerRef.current?.removeEventListener('message', handleMessage);
        }
      };

      workerRef.current.addEventListener('message', handleMessage);
      
      // ✅ Send data WITH Context to worker
      workerRef.current.postMessage({ 
        id: requestId, 
        items,
        context: { formulas } // Pack into PricingContext
      });
    });
  }, []);

  return { calculateBatch };
};