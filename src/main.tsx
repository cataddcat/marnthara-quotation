// src/main.tsx

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { GlobalErrorGuard } from '@/components/ui/GlobalErrorGuard'; // ✅ Import

// Mobile Height Fix for 100dvh
const setAppHeight = () => {
  const doc = document.documentElement;
  doc.style.setProperty('--app-height', `${window.innerHeight}px`);
};
window.addEventListener('resize', setAppHeight);
setAppHeight();

// ปิด scroll-restoration อัตโนมัติของเบราว์เซอร์ — แอปนี้ไม่มี router จริง history entry เดียวที่มี
// คือ "guard" ของ modal ที่ useMobileBack push ตอนเปิด (pushState) แล้วกลืนคืนตอนปิดด้วย history.back().
// ค่า default 'auto' ทำให้ history.back() นั้นสั่งเบราว์เซอร์คืนตำแหน่ง scroll (มักเป็น 0) ทุกครั้งที่ปิด
// overlay → หน้าหลัก "เด้งบนสุด" ทุก modal ทุกเบราว์เซอร์. 'manual' ยกการคุม scroll ให้แอป → หน้าอยู่นิ่ง
// เมื่อปิด overlay (ดู useMobileBack.ts + useModalScrollRestore.ts).
if ('scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual';
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* ✅ ครอบด้วย Guard เพื่อป้องกัน App ตาย */}
    <GlobalErrorGuard>
      <App />
    </GlobalErrorGuard>
  </StrictMode>
);