import { useCallback, useEffect } from 'react';
import { useStore } from 'zustand';
import { useAppStore } from '@/store/useAppStore';
import { useUIStore } from '@/store/useUIStore';
import { useHaptic } from '@/hooks/useHaptic';

type Trigger = ReturnType<typeof useHaptic>['trigger'];

// อ่าน temporal state สดทุกครั้ง (ไม่ subscribe) — ใช้ร่วมทั้งปุ่มและคีย์ลัด
const doUndo = (trigger: Trigger) => {
  const t = useAppStore.temporal.getState();
  if (t.pastStates.length === 0) return;
  t.undo();
  trigger('medium');
  useUIStore.getState().addToast('info', 'ย้อนกลับแล้ว');
};

const doRedo = (trigger: Trigger) => {
  const t = useAppStore.temporal.getState();
  if (t.futureStates.length === 0) return;
  t.redo();
  trigger('medium');
  useUIStore.getState().addToast('info', 'ทำซ้ำแล้ว');
};

/**
 * Reactive undo/redo สำหรับ "ข้อมูลงาน" (zundo temporal ที่ตั้งไว้ใน useAppStore แล้ว).
 * canUndo/canRedo อ่านจาก past/futureStates; undo()/redo() = action + haptic + toast.
 * ประวัติถูกล้างตอนสลับงานโดย JobsSlice.clearUndoHistory อยู่แล้ว — undo จึงไม่ข้ามงาน.
 */
export const useUndoRedo = () => {
  const canUndo = useStore(useAppStore.temporal, (s) => s.pastStates.length > 0);
  const canRedo = useStore(useAppStore.temporal, (s) => s.futureStates.length > 0);
  const { trigger } = useHaptic();

  const undo = useCallback(() => doUndo(trigger), [trigger]);
  const redo = useCallback(() => doRedo(trigger), [trigger]);

  return { canUndo, canRedo, undo, redo };
};

/**
 * คีย์ลัด global: Ctrl/Cmd+Z = undo · Ctrl/Cmd+Shift+Z หรือ Ctrl+Y = redo.
 * ไม่จับเมื่อโฟกัสอยู่ในช่องพิมพ์ (ปล่อยให้เป็น native text-undo). เรียกครั้งเดียวที่ root (App).
 */
export const useUndoRedoShortcuts = () => {
  const { trigger } = useHaptic();

  useEffect(() => {
    const isEditable = (el: EventTarget | null): boolean => {
      const node = el as HTMLElement | null;
      if (!node || typeof node.tagName !== 'string') return false;
      return (
        node.tagName === 'INPUT' ||
        node.tagName === 'TEXTAREA' ||
        node.tagName === 'SELECT' ||
        node.isContentEditable === true
      );
    };

    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const key = e.key.toLowerCase();
      if (key !== 'z' && key !== 'y') return;
      if (isEditable(e.target)) return; // ปล่อย undo ของช่องข้อความ

      e.preventDefault();
      if (key === 'y' || (key === 'z' && e.shiftKey)) doRedo(trigger);
      else doUndo(trigger);
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [trigger]);
};
