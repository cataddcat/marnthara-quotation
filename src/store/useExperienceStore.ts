import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * Two-Mode Experience — แกน "งาน" ไม่ใช่อุปกรณ์
 * - field: หน้างาน — มือเดียว เร่งรีบ ปุ่มใหญ่ เน้นวัด/จดให้ครบ ไม่มีทุน/กำไร
 * - detail: ละเอียด — สองมือ มีเวลา เติมข้อมูล ใส่ราคา เช็คทุน/กำไร จัดเรียง ออกเอกสาร
 *
 * บนมือถือสลับได้เอง (persist ค่าล่าสุด); desktop = detail เสมอ (จอกว้างเป็นแค่
 * responsive enhancement ไม่ใช่โหมด — ดู useExperienceMode)
 */
export type ExperienceMode = 'field' | 'detail';

interface ExperienceState {
  mode: ExperienceMode;
  setMode: (m: ExperienceMode) => void;
}

export const useExperienceStore = create<ExperienceState>()(
  persist(
    (set) => ({
      mode: 'field',
      setMode: (m) => set({ mode: m }),
    }),
    {
      name: 'marnthara-experience',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
