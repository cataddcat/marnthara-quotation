// src/store/temporalBridge.ts
// ────────────────────────────────────────────────────────────────────────────
// สะพานเล็ก ๆ ให้ slice เรียก "ล้างประวัติ undo (zundo)" ได้ โดยไม่ import useAppStore
// (กัน circular: useAppStore → createJobsSlice → ... ). useAppStore ลงทะเบียน impl จริงตอน init.
// ไฟล์นี้ตั้งใจไม่ import อะไรเลย.
// ────────────────────────────────────────────────────────────────────────────

let clearFn: () => void = () => {};

/** เรียกครั้งเดียวตอน init store: registerClearUndo(() => useAppStore.temporal.getState().clear()) */
export const registerClearUndo = (fn: () => void): void => {
  clearFn = fn;
};

/** ล้างประวัติ undo/redo — ใช้ตอนสลับ/สร้างงาน (กัน undo ข้ามงาน) */
export const clearUndoHistory = (): void => clearFn();
