import React from 'react';
import { cn } from '@/lib/utils';
import { useTierSize } from '@/hooks/useExperienceMode';

interface FormTwoColumnProps {
  /** true = โหมดละเอียด (isDetail) → 2 คอลัมน์เมื่อจอกว้างพอ (lg+); false = stack คอลัมน์เดียว */
  full: boolean;
  /** คอลัมน์ขวา (สรุปราคา/ต้นทุน) — sticky บนจอกว้าง */
  right: React.ReactNode;
  /** คอลัมน์ซ้าย (ส่วน input) */
  children: React.ReactNode;
}

/**
 * เลย์เอาต์ 2 คอลัมน์สำหรับฟอร์มสินค้าในโหมดละเอียดบนจอกว้าง (lg+)
 * input อยู่ซ้าย, สรุปราคาเกาะขวา (sticky); จอแคบ/มือถือ/โหมดหน้างาน → stack คอลัมน์เดียว
 */
export const FormTwoColumn: React.FC<FormTwoColumnProps> = ({ full, right, children }) => {
  const { sectionGap } = useTierSize();

  if (!full) {
    return (
      <div className={sectionGap}>
        {children}
        {right}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-5 lg:items-start lg:space-y-0',
        sectionGap
      )}
    >
      <div className={sectionGap}>{children}</div>
      <div className={cn('lg:sticky lg:top-0', sectionGap)}>{right}</div>
    </div>
  );
};
