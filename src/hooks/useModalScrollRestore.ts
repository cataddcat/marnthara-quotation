import { useEffect, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';

/**
 * useModalScrollRestore — คืนตำแหน่ง scroll ของหน้าหลักหลังปิด modal
 * ────────────────────────────────────────────────────────────────────────────
 * ปัญหา: เปิด modal จากเมนูหลัก (vaul drawer) → ซ้อน BBB (Headless Dialog) → ปิด แล้ว
 * หน้าหลักเด้งไปบนสุด (body-lock ของ 2 ไลบรารีส่งต่อกันแล้วทำตำแหน่งหาย).
 *
 * วิธี: เก็บ scrollY ของหน้าหลัก "ตอนไม่มี modal เปิด" (capture ก่อน lock เสมอ),
 * freeze ไว้ตอนเปิด modal ตัวแรก, แล้ว restore ตอนปิดตัวสุดท้าย (rAF → รันหลัง cleanup
 * ของ vaul/Headless จึง override ค่าที่ไลบรารีตั้งผิดได้). ผูกกับ activeModal (modal stack)
 * → เปิดซ้อนหลายชั้นก็คืนตำแหน่ง "ก่อนเปิดตัวแรก" ตัวเดียว.
 *
 * เรียกครั้งเดียวที่ระดับแอป (App.tsx).
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
