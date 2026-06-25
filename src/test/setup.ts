import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useAppStore } from '@/store/useAppStore';

// jsdom ไม่มี Resize/IntersectionObserver — Headless UI (Menu/floating/use-on-disappear) ต้องใช้
// ต้องเป็น "คลาส" (constructable) เพราะโค้ดเรียก `new X()` — arrow/vi.fn ใช้ new ไม่ได้ ("is not a constructor")
class ResizeObserverStub {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
class IntersectionObserverStub {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn(() => []);
  root = null;
  rootMargin = '';
  thresholds = [];
}
globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
globalThis.IntersectionObserver = IntersectionObserverStub as unknown as typeof IntersectionObserver;

// Snapshot ของ store ตอนเริ่มต้น (ก่อน test แรกแก้ไข) — actions เป็น stable reference
// จึง restore ทั้งก้อนได้ปลอดภัย คืน slice state กลับเป็นค่า default ทุกครั้ง
const PRISTINE_STATE = useAppStore.getState();

afterEach(() => {
  // 1. unmount React components (ป้องกัน memory leak ข้าม test)
  cleanup();

  // 2. คืน store เป็นค่าเริ่มต้น + ล้าง undo/redo history ของ zundo
  useAppStore.setState(PRISTINE_STATE, true);
  useAppStore.temporal.getState().clear();

  // 3. ล้าง persisted state (กัน test รั่วถึงกันผ่าน localStorage)
  localStorage.clear();
});
