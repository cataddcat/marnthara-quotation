import React from 'react';

interface FormTwoColumnProps {
  /** true = โหมด Full (เดสก์ท็อป) → 2 คอลัมน์บนจอกว้าง; false = stack คอลัมน์เดียว */
  full: boolean;
  /** คอลัมน์ขวา (สรุปราคา/ต้นทุน) — sticky บนจอกว้าง */
  right: React.ReactNode;
  /** คอลัมน์ซ้าย (ส่วน input) */
  children: React.ReactNode;
}

/**
 * เลย์เอาต์ 2 คอลัมน์สำหรับฟอร์มสินค้าในโหมด Full บนเดสก์ท็อปจอกว้าง (lg+)
 * input อยู่ซ้าย, สรุปราคาเกาะขวา (sticky); จอแคบ/มือถือ/Lite → stack คอลัมน์เดียว
 */
export const FormTwoColumn: React.FC<FormTwoColumnProps> = ({ full, right, children }) => {
  if (!full) {
    return (
      <div className="space-y-6">
        {children}
        {right}
      </div>
    );
  }

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-5 lg:items-start space-y-6 lg:space-y-0">
      <div className="space-y-6">{children}</div>
      <div className="lg:sticky lg:top-0 space-y-6">{right}</div>
    </div>
  );
};
