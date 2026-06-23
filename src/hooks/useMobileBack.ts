import { useEffect, useRef } from 'react';

/**
 * useMobileBack — ปุ่ม Back (Android/เบราว์เซอร์) ปิด overlay บนสุด แทนการเปลี่ยนหน้า
 * ────────────────────────────────────────────────────────────────────────────
 * รวมศูนย์เป็น "back-stack" ระดับ module เพื่อให้ทุก overlay (Modal/OptionSheet/
 * AlertDialog/PdfPreview) ทำงานร่วมกันถูกต้องเมื่อซ้อนกัน:
 *  - มี history "guard" เพียง 1 อันตลอดช่วงที่มี overlay เปิด (ไม่ทิ้งขยะ history)
 *  - กด Back = ปิด "ตัวบนสุด" ทีละชั้น (LIFO) ไม่ใช่เลเยอร์ที่อยู่ข้างหลัง
 *  - ปิดด้วยวิธีอื่น (X/Esc/backdrop) แล้วไม่มี overlay เหลือ → กลืน guard ทิ้ง
 *    (ปุ่ม Back ของเบราว์เซอร์จึงไม่ "เสียเปล่า" ทีหลัง)
 *
 * การ push/pop guard ทำผ่าน reconcile ที่ debounce ด้วย microtask → กันกรณี "สลับ modal"
 * ที่ stack ว่างชั่วคราว (unregister ตัวเก่า ก่อน register ตัวใหม่ ใน commit เดียว) ไม่ให้
 * เผลอ history.back() ปิด modal ใหม่. ส่วนตอนกด Back จริง จัดการ guard แบบ sync ใน onPopState.
 */

type CloseEntry = { close: () => void };

const stack: CloseEntry[] = [];
let guardPushed = false;
let listenerAttached = false;
let reconcileScheduled = false;

const hasWindow = typeof window !== 'undefined';
const isGuard = () =>
  hasWindow && (window.history.state as { modalGuard?: boolean } | null)?.modalGuard === true;
const pushGuard = () => window.history.pushState({ modalGuard: true }, '', window.location.href);

const attachListener = () => {
  if (listenerAttached || !hasWindow) return;
  listenerAttached = true;
  window.addEventListener('popstate', onPopState);
};
const detachListener = () => {
  if (!listenerAttached) return;
  listenerAttached = false;
  window.removeEventListener('popstate', onPopState);
};

function onPopState() {
  // เบราว์เซอร์กลืน guard ของเราไปแล้ว 1 อัน
  guardPushed = false;
  const top = stack[stack.length - 1];
  if (!top) {
    scheduleReconcile();
    return;
  }
  if (stack.length > 1) {
    // ปิด top แล้วยังมี overlay เหลือ → re-arm guard ทันที (กัน Back ครั้งหน้าหลุดออกแอป)
    pushGuard();
    guardPushed = true;
  } else {
    // กำลังจะว่าง → ถอด listener เลย (ไม่ต้องรอ reconcile)
    detachListener();
  }
  top.close(); // → onClose → isOpen=false → effect cleanup → unregister → reconcile
}

function reconcile() {
  reconcileScheduled = false;
  const want = stack.length > 0;
  if (want) {
    attachListener();
    if (!guardPushed) {
      pushGuard();
      guardPushed = true;
    }
  } else {
    detachListener();
    if (guardPushed) {
      guardPushed = false;
      if (isGuard()) window.history.back(); // กลืน guard ที่ค้าง (ปิดด้วย X/Esc/backdrop)
    }
  }
}

function scheduleReconcile() {
  if (reconcileScheduled || !hasWindow) return;
  reconcileScheduled = true;
  queueMicrotask(reconcile);
}

const register = (entry: CloseEntry) => {
  stack.push(entry);
  scheduleReconcile();
};
const unregister = (entry: CloseEntry) => {
  const i = stack.indexOf(entry);
  if (i >= 0) stack.splice(i, 1);
  scheduleReconcile();
};

export const useMobileBack = (isOpen: boolean, onClose: () => void) => {
  // เก็บ onClose ล่าสุดใน ref → ไม่ต้อง re-register ทุก render (identity ของ onClose เปลี่ยนบ่อย)
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const entry: CloseEntry = { close: () => onCloseRef.current() };
    register(entry);
    return () => unregister(entry);
  }, [isOpen]);
};
