// src/hooks/useIsMobile.ts
import { useState, useEffect } from 'react';

// Breakpoint ที่ 768px (iPad Mini / Tablets)
// ต่ำกว่านี้ถือเป็น Mobile
const MOBILE_BREAKPOINT = 768;

export const useIsMobile = (): boolean => {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    // ป้องกัน Error กรณีรันฝั่ง Server (ถ้ามี)
    if (typeof window === 'undefined') return false;
    return window.innerWidth < MOBILE_BREAKPOINT;
  });

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    // 1. ตรวจสอบทันทีเมื่อโหลด
    checkIsMobile();

    // 2. ดักฟัง Event เมื่อมีการยืดหดหน้าจอ
    window.addEventListener('resize', checkIsMobile);

    // 3. Clean up event listener เมื่อ Component ถูกทำลาย
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  return isMobile;
};
