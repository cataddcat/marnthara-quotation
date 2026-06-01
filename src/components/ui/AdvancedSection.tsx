import React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { CollapsibleSection } from './CollapsibleSection';

interface AdvancedSectionProps {
  /**
   * ส่ง isFull เข้ามา —
   * true (Full): แสดง children ตรงๆ ไม่มี chrome ครอบ (เหมือนเดิมก่อน refactor)
   * false (Lite): ห่อด้วย CollapsibleSection ที่ยุบอยู่ แต่ "กางได้เสมอ" = escape hatch ในตัว
   */
  expanded: boolean;
  /** หัวข้อกลุ่มตัวเลือก */
  title?: string;
  /** ข้อความใบ้ตอนยุบ */
  hint?: string;
  children: React.ReactNode;
}

/**
 * โมเดล disclosure เดียวของ Two-Tier — tier เป็นแค่ "ค่าเริ่มต้น" ไม่ใช่ "กรง"
 * แทนที่ pattern เดิมที่ปนกันระหว่าง `{isFull && ...}` (ซ่อนสนิท) กับปุ่ม toggle เฉพาะผ้าม่าน
 *
 * @example <AdvancedSection expanded={isFull}>{installationControls}</AdvancedSection>
 */
export const AdvancedSection: React.FC<AdvancedSectionProps> = ({
  expanded,
  title = 'ตัวเลือกการติดตั้ง',
  hint = 'ฝั่งดึง · การเปิด — ใส่ทีหลังได้',
  children,
}) => {
  if (expanded) return <>{children}</>;

  return (
    <CollapsibleSection
      title={
        <span className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-muted-foreground shrink-0" />
          {title}
        </span>
      }
      defaultOpen={false}
      hint={hint}
    >
      {children}
    </CollapsibleSection>
  );
};
