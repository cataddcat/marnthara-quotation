import { useIsMobile } from './useIsMobile';
import { useExperienceStore, ExperienceMode } from '@/store/useExperienceStore';

export interface ExperienceModeResult {
  mode: ExperienceMode;
  isLite: boolean;
  isFull: boolean;
  /** true เมื่อยังไม่ได้ override (ตามอุปกรณ์) */
  isAuto: boolean;
  setMode: (m: ExperienceMode | 'auto') => void;
}

/**
 * Single source of truth ของ tier ปัจจุบัน — รวม "ขนาดอุปกรณ์" กับ "override ของผู้ใช้"
 * ไม่ให้ logic `isMobile` กระจัดกระจายทั่วแอป และ override/test ได้
 */
export const useExperienceMode = (): ExperienceModeResult => {
  const isMobile = useIsMobile();
  const override = useExperienceStore((s) => s.override);
  const setMode = useExperienceStore((s) => s.setMode);

  const mode: ExperienceMode = override ?? (isMobile ? 'lite' : 'full');

  return {
    mode,
    isLite: mode === 'lite',
    isFull: mode === 'full',
    isAuto: override === null,
    setMode,
  };
};

export type ControlSize = 'sm' | 'md' | 'lg';

export interface TierSizeResult {
  control: ControlSize;
  button: ControlSize;
  /** density tokens ของ section card (adaptive) — Lite โปร่ง / Full แน่น */
  section: { pad: string; stack: string };
  /** ระยะห่างระหว่าง section ในคอลัมน์ */
  sectionGap: string;
}

/**
 * ขนาด default ของ control + ความแน่น (density) ตาม tier (touch ergonomics)
 * Lite = ใหญ่ขึ้น/โปร่ง กดด้วยนิ้วโป้งง่าย; Full = หนาแน่นกว่า เห็นข้อมูลพร้อมกันมากขึ้น
 */
export const useTierSize = (): TierSizeResult => {
  const { isLite } = useExperienceMode();
  return isLite
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
