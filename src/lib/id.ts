// src/lib/id.ts
// ตัวสร้าง id กลาง — ใช้ UUID จริง (crypto.randomUUID) แทน Math.random 7 ตัวอักษรเดิม
// ซึ่งมีโอกาสชนกันได้จริงเมื่อรายการ/ห้องเยอะ (id ชน → updateItem/removeItem โดนหลายรายการพร้อมกัน)

/** UUID v4 — ใช้ crypto.randomUUID ถ้ามี (browser/Node 19+), ไม่งั้น fallback (กัน test env เก่า) */
export const newUuid = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
};
