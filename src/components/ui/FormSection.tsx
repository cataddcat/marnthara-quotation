import React from 'react';
import { cn } from '@/lib/utils';
import { useTierSize } from '@/hooks/useExperienceMode';
import { useThemeStore } from '@/store/standalone/useThemeStore';
import { useNestedSurface } from './nestedSurface';
import { useSquircleClip } from './useSquircleClip';

interface FormSectionProps {
  /** ไอคอนหัวข้อ section */
  icon?: React.ElementType;
  /** สีไอคอน — default = โทนมิติ (ทะเบียน §2.1, section ขนาดคือผู้ใช้หลัก); ส่วนรหัส/ราคาใช้สี brand (theme.icon) */
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
  iconClass = 'text-blue-600 dark:text-blue-400',
  title,
  headerRight,
  children,
  className,
  stack,
}) => {
  const { section } = useTierSize();
  const hasHeader = Boolean(title || headerRight || Icon);

  // กฎข้อ 4 (anti card-in-card): อยู่ในการ์ดแม่ (CollapsibleSection) + ธีม EEERT → ไม่วาดกรอบ/พื้น/pad
  // ของตัวเองซ้ำ (พ่อให้ padding แล้ว) เหลือแค่หัวข้อ+เนื้อหา. ธีมอื่น/ไม่ nested = การ์ดเดิม.
  const isEeert = useThemeStore((s) => s.theme === 'eeert');
  const flat = useNestedSurface() && isEeert;
  // squircle the card surface (skip in flat/nested mode where there's no card chrome)
  const clipRef = useSquircleClip<HTMLDivElement>({ enabled: !flat });

  return (
    <div
      ref={clipRef}
      className={cn(
        !flat && cn('bg-card rounded-xl border border-border', section.pad),
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
