import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * Two-Tier Experience
 * - lite: มือถือ/หน้างาน — ลดรายละเอียด เน้นเร็ว ปุ่มใหญ่
 * - full: เดสก์ท็อป/ออฟฟิศ — ความสามารถครบ
 */
export type ExperienceMode = 'lite' | 'full';

/** null = auto (ตามขนาดจออุปกรณ์) */
export type ExperienceOverride = ExperienceMode | null;

interface ExperienceState {
  override: ExperienceOverride;
  /** 'auto' = ล้าง override ให้กลับไปตามอุปกรณ์ */
  setMode: (m: ExperienceMode | 'auto') => void;
}

export const useExperienceStore = create<ExperienceState>()(
  persist(
    (set) => ({
      override: null,
      setMode: (m) => set({ override: m === 'auto' ? null : m }),
    }),
    {
      name: 'marnthara-experience',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
