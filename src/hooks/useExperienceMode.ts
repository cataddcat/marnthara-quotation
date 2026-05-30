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

/**
 * ขนาด default ของ control ตาม tier (touch ergonomics)
 * Lite = ใหญ่ขึ้น กดด้วยนิ้วโป้งง่าย; Full = หนาแน่นกว่า
 */
export const useTierSize = (): { control: ControlSize; button: ControlSize } => {
  const { isLite } = useExperienceMode();
  return isLite ? { control: 'lg', button: 'lg' } : { control: 'md', button: 'md' };
};
