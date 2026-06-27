// src/lib/backup/backup-reminder.ts
// ────────────────────────────────────────────────────────────────────────────
// ตัวจำ "สำรองข้อมูลครั้งล่าสุด" — ใช้เตือนผู้ใช้ที่ยังไม่เปิด cloud (local-only)
// เก็บใน localStorage แยก key (ไม่ปนกับ store หลัก) ทนต่อ factoryReset ที่ clear ทั้ง origin
// ไม่ได้ — แต่ purpose คือเตือนระหว่างใช้งานปกติ
// ────────────────────────────────────────────────────────────────────────────

const KEY = 'marnthara.lastBackupAt';
const MS_PER_DAY = 86_400_000;

/** stamp เวลา backup ล่าสุด (เรียกหลังดาวน์โหลด backup สำเร็จ) */
export const markBackupDone = (): void => {
  try {
    localStorage.setItem(KEY, new Date().toISOString());
  } catch {
    /* localStorage ปิด/เต็ม — ข้าม */
  }
};

/** จำนวนวันตั้งแต่ backup ล่าสุด; null = ไม่เคย backup */
export const daysSinceBackup = (): number | null => {
  try {
    const v = localStorage.getItem(KEY);
    if (!v) return null;
    const t = new Date(v).getTime();
    if (Number.isNaN(t)) return null;
    return (Date.now() - t) / MS_PER_DAY;
  } catch {
    return null;
  }
};

/** ควรเตือนให้สำรองข้อมูลไหม — ไม่เคย backup หรือเกิน threshold วัน */
export const shouldRemindBackup = (thresholdDays = 7): boolean => {
  const d = daysSinceBackup();
  return d === null || d > thresholdDays;
};
