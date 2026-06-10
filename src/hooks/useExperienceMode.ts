import { useIsMobile } from './useIsMobile';
import { useExperienceStore, ExperienceMode } from '@/store/useExperienceStore';

export interface ExperienceModeResult {
  mode: ExperienceMode;
  /** หน้างาน — มือเดียว เร่งรีบ: ปุ่มใหญ่ ซ่อนทุน/กำไร/เครื่องมือละเอียด */
  isField: boolean;
  /** ละเอียด — สองมือ มีเวลา: ทุน/กำไร/Pro Mode/catalog + ภาพรวมแบบทำงานได้ */
  isDetail: boolean;
  /** สลับโหมดได้เฉพาะจอแคบ (desktop = detail เสมอ) — ใช้ซ่อนสวิตช์ */
  canSwitch: boolean;
  setMode: (m: ExperienceMode) => void;
}

/**
 * Single source of truth ของโหมดปัจจุบัน — แกน "งาน" (field/detail) ไม่ใช่อุปกรณ์
 * - มือถือ (viewport < 768): ใช้โหมดที่ผู้ใช้เลือกล่าสุด (persist)
 * - desktop: บังคับ detail — จอกว้างเป็น responsive enhancement ไม่ใช่โหมด
 * ไม่ให้ logic `isMobile` กระจัดกระจายทั่วแอป; เรื่อง layout-ตามความกว้างจอจริง
 * (เช่น drawer→center ของ Modal) ให้ใช้ useIsMobile ตรงๆ ไม่ใช่โหมดนี้
 */
export const useExperienceMode = (): ExperienceModeResult => {
  const isMobile = useIsMobile();
  const storedMode = useExperienceStore((s) => s.mode);
  const setMode = useExperienceStore((s) => s.setMode);

  const mode: ExperienceMode = isMobile ? storedMode : 'detail';

  return {
    mode,
    isField: mode === 'field',
    isDetail: mode === 'detail',
    canSwitch: isMobile,
    setMode,
  };
};

export type ControlSize = 'sm' | 'md' | 'lg';

export interface TierSizeResult {
  control: ControlSize;
  button: ControlSize;
  /** density tokens ของ section card (adaptive) — field โปร่ง / detail แน่น */
  section: { pad: string; stack: string };
  /** ระยะห่างระหว่าง section ในคอลัมน์ */
  sectionGap: string;
}

/**
 * ขนาด default ของ control + ความแน่น (density) ตามโหมด (touch ergonomics)
 * field = ใหญ่ขึ้น/โปร่ง กดด้วยนิ้วโป้งง่ายกลางแดด; detail = หนาแน่นกว่า (48px ยังเกิน 44px ขั้นต่ำ)
 * เห็นข้อมูลพร้อมกันมากขึ้น
 */
export const useTierSize = (): TierSizeResult => {
  const { isField } = useExperienceMode();
  return isField
    ? {
        control: 'lg',
        button: 'lg',
        section: { pad: 'p-4', stack: 'space-y-4' },
        sectionGap: 'space-y-6',
      }
    : {
        control: 'md',
        button: 'md',
        section: { pad: 'p-3.5', stack: 'space-y-3' },
        sectionGap: 'space-y-4',
      };
};
