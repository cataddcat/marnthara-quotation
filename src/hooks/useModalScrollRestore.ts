import { useEffect, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';

/**
 * useModalScrollRestore — (insurance ฝั่ง iOS) คืนตำแหน่ง scroll หน้าหลักหลังปิด modal
 * ────────────────────────────────────────────────────────────────────────────
 * ⚠️ ตัวแก้ "หน้าเด้งบนสุดตอนปิด modal" ตัวจริงคือ `history.scrollRestoration='manual'` ใน main.tsx
 * (กัน browser auto-restore ตอน useMobileBack เรียก `history.back()` กลืน guard) — ดู HANDOFF §4
 * invariant 10 + memory `scroll-restore-technique`. hook นี้เหลือไว้เป็น insurance เฉพาะ Safari/iOS ที่
 * vaul ตั้ง body `position:fixed` (เป็น scroll ที่ history ไม่คุม). บน Chromium ไลบรารี modal ไม่แตะ
 * scroll หน้าหลัก → hook เป็น no-op โดยปลอดภัย (savedY = ตำแหน่งจริง, restore = ไม่ขยับ).
 *
 * วิธี: เก็บ scrollY "ตอนไม่มี modal เปิด" (capture ก่อน lock), freeze ตอนเปิดตัวแรก, restore ตอนปิด
 * ตัวสุดท้าย (rAF) ผูกกับ activeModal (modal stack). เรียกครั้งเดียวที่ระดับแอป (App.tsx).
 *
 * NB: scroll *ภายในตัว modal* ที่ถูกซ้อน (เช่น เมนูหลัก) เป็นคนละเรื่อง — ใช้ prop `scrollResetToken`
 * ของ Modal.tsx (ดู HANDOFF §2.1), ไม่เกี่ยวกับ hook นี้.
 */
export function useModalScrollRestore() {
  const activeModal = useAppStore((s) => s.activeModal);
  const lastY = useRef(0); // scrollY ล่าสุดขณะไม่มี modal เปิด
  const savedY = useRef(0); // ตำแหน่งที่ freeze ไว้ตอนเปิด modal ตัวแรก
  const prevActive = useRef<string | null>(null);

  // ติดตาม scrollY เฉพาะตอนหน้าหลักเปิดอยู่ (ไม่มี modal) — ได้ค่า S ล่าสุดก่อนเปิด
  useEffect(() => {
    if (activeModal !== null || typeof window === 'undefined') return;
    lastY.current = window.scrollY;
    const onScroll = () => {
      lastY.current = window.scrollY;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [activeModal]);

  // freeze ตอนเปิดตัวแรก / restore ตอนปิดตัวสุดท้าย (แยก ref กันชนกับ tracking effect)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const wasOpen = prevActive.current !== null;
    const isOpen = activeModal !== null;
    if (!wasOpen && isOpen) {
      savedY.current = lastY.current; // เปิดตัวแรก → จำตำแหน่งหน้าหลัก
    } else if (wasOpen && !isOpen) {
      const y = savedY.current; // ปิดตัวสุดท้าย → คืนตำแหน่ง (หลังไลบรารีปลดล็อก)
      requestAnimationFrame(() => window.scrollTo(0, y));
    }
    prevActive.current = activeModal;
  }, [activeModal]);
}
