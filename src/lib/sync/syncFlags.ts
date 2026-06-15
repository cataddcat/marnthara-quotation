// src/lib/sync/syncFlags.ts
// ────────────────────────────────────────────────────────────────────────────
// ธงเล็ก ๆ บอก auto-save subscription ว่า "การเปลี่ยน live ครั้งถัดไปเป็นการโหลด (programmatic)
// ไม่ใช่ผู้ใช้แก้" → จะได้ไม่ตั้ง activeDirty / ไม่ push ซ้ำ. ไม่ import อะไร (กัน circular)
// ────────────────────────────────────────────────────────────────────────────

let suppress = false;

/** เรียกก่อน set() ที่โหลดงานเข้า live (switchJob/createJob/applyRemoteToActive/deleteJob) */
export const suppressNextLiveSync = (): void => {
  suppress = true;
};

/** auto-save subscription เรียก: ถ้า true = ข้าม (เป็นการโหลด ไม่ใช่ผู้ใช้แก้) */
export const consumeSuppress = (): boolean => {
  const s = suppress;
  suppress = false;
  return s;
};
