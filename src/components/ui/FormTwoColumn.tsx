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
        // right track shrinkable (minmax not rigid 360px) so any residual width loss shrinks the
        // summary column instead of pushing it off the panel edge (see modal-reflow hardening)
        'lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)] lg:gap-5 lg:items-start lg:space-y-0',
        sectionGap
      )}
    >
      <div className={cn('min-w-0', sectionGap)}>{children}</div>
      <div className={cn('min-w-0 lg:sticky lg:top-0', sectionGap)}>{right}</div>
    </div>
  );
};
