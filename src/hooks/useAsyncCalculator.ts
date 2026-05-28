// src/hooks/useAsyncCalculator.ts

import { useEffect, useRef, useCallback } from 'react';
import { ItemData } from '@/types';
import { useAppStore } from '@/store/useAppStore';

// Vite Worker Import Syntax
import PricingWorker from '@/lib/pricing/pricing.worker?worker';

export const useAsyncCalculator = () => {
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    // Initialize the worker thread
    workerRef.current = new PricingWorker();

    return () => {
      // Cleanup: Kill worker when component unmounts to free memory
      workerRef.current?.terminate();
      workerRef.current = null;
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

      // ✅ Capture current formulas state
      const { formulas } = useAppStore.getState();

      const requestId = Math.random().toString(36).substring(7);

      // สร้าง Listener ชั่วคราวสำหรับ Request นี้
      const handleMessage = (e: MessageEvent) => {
        // ตรวจสอบว่าเป็นคำตอบของ Request ID นี้หรือไม่
        if (e.data.id === requestId) {
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