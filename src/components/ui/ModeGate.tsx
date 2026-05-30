import React from 'react';
import { useExperienceMode } from '@/hooks/useExperienceMode';
import type { ExperienceMode } from '@/store/useExperienceStore';

interface ModeGateProps {
  /** แสดง children เฉพาะเมื่อ tier ปัจจุบันตรงกับค่านี้ */
  show: ExperienceMode;
  /** escape hatch — ถ้า true จะแสดงเสมอ ไม่สนใจ tier (เช่น ปุ่ม "ตัวเลือกทั้งหมด" ใน Lite) */
  force?: boolean;
  children: React.ReactNode;
}

/**
 * Primitive ประกาศเชิงโครงสร้างสำหรับ Two-Tier Experience
 * @example <ModeGate show="full">...โหมดเต็มเท่านั้น...</ModeGate>
 */
export const ModeGate: React.FC<ModeGateProps> = ({ show, force = false, children }) => {
  const { mode } = useExperienceMode();
  if (!force && mode !== show) return null;
  return <>{children}</>;
};
