import React from 'react';
import { cn } from '@/lib/utils';
import { useTierSize } from '@/hooks/useExperienceMode';

interface FormSectionProps {
  /** ไอคอนหัวข้อ section */
  icon?: React.ElementType;
  /** สีไอคอน — dimension ใช้ sky (semantic การวัด); ส่วนระบุประเภทใช้สี brand */
  iconClass?: string;
  /** หัวข้อ section (ตัวหนา) */
  title?: React.ReactNode;
  /** สล็อตขวาของ header — เช่น ปุ่ม "จัดการรายการ" หรือ error inline */
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  /** คลาสเสริมบนการ์ด */
  className?: string;
  /** override ระยะห่างภายใน (ดีฟอลต์ = adaptive ตาม tier) */
  stack?: string;
}

/**
 * การ์ด section มาตรฐานของฟอร์มสินค้า — single source ของ chrome + density
 * uniform: bg-card rounded-xl border (Geist §1.7 — borders over shadows); padding/stack ปรับตาม tier (useTierSize)
 * แทนที่ inline `<div className="bg-card p-4 rounded-xl border">…</div>` ทุกฟอร์ม
 */
export const FormSection: React.FC<FormSectionProps> = ({
  icon: Icon,
  iconClass = 'text-sky-500',
  title,
  headerRight,
  children,
  className,
  stack,
}) => {
  const { section } = useTierSize();
  const hasHeader = Boolean(title || headerRight || Icon);

  return (
    <div
      className={cn(
        'bg-card rounded-xl border border-border',
        section.pad,
        stack ?? section.stack,
        className
      )}
    >
      {hasHeader && (
        <div className="flex items-center gap-2 text-foreground font-bold">
          {Icon && <Icon className={cn('w-5 h-5 shrink-0', iconClass)} />}
          {title && <h2 className="min-w-0">{title}</h2>}
          {headerRight && (
            <div className="ml-auto shrink-0 font-normal">{headerRight}</div>
          )}
        </div>
      )}
      {children}
    </div>
  );
};
