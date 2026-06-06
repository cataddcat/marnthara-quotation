import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CollapsibleSectionProps {
  title: React.ReactNode;
  defaultOpen?: boolean;
  /** ของแสดงท้ายหัวข้อ เช่น chip ราคาสด */
  badge?: React.ReactNode;
  /** ข้อความใบ้ตอนยุบ (เช่น "ใส่ทีหลังได้") */
  hint?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Disclosure ใช้ซ้ำได้ — หัวข้อแตะเปิด/ปิด (tap target ≥48px)
 * ใช้ใน Lite สำหรับกลุ่ม "รายละเอียด" และ escape hatch "ตัวเลือกทั้งหมด"
 */
export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  defaultOpen = false,
  badge,
  hint,
  children,
  className,
}) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className={cn(
        'bg-card rounded-xl border border-border overflow-hidden',
        className
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-2 px-4 py-3 min-h-[48px] text-left transition-colors active:bg-muted/30"
      >
        <span className="font-bold text-foreground flex-1 min-w-0">{title}</span>
        {badge}
        <ChevronDown
          className={cn(
            'w-5 h-5 text-muted-foreground shrink-0 transition-transform duration-200',
            open && 'rotate-180'
          )}
          strokeWidth={1.5}
        />
      </button>

      {!open && hint && (
        <div className="px-4 pb-3 -mt-1 text-xs text-muted-foreground">{hint}</div>
      )}

      {open && (
        <div className="px-4 pb-4 pt-1 space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
          {children}
        </div>
      )}
    </div>
  );
};
