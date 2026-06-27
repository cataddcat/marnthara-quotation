import React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { CollapsibleSection } from './CollapsibleSection';

interface AdvancedSectionProps {
  /**
   * ส่ง isDetail เข้ามา —
   * true (Detail/ละเอียด): แสดง children ตรงๆ ไม่มี chrome ครอบ
   * false (Field/หน้างาน): ห่อด้วย CollapsibleSection ที่ยุบอยู่ แต่ "กางได้เสมอ" = escape hatch ในตัว
   */
  expanded: boolean;
  /** หัวข้อกลุ่มตัวเลือก */
  title?: string;
  /** ข้อความใบ้ตอนยุบ */
  hint?: string;
  children: React.ReactNode;
}

/**
 * โมเดล disclosure เดียวของ Two-Mode (หน้างาน/ละเอียด) — โหมดเป็นแค่ "ค่าเริ่มต้น" ไม่ใช่ "กรง"
 * แทนที่ pattern เดิมที่ปนกันระหว่าง `{isDetail && ...}` (ซ่อนสนิท) กับปุ่ม toggle เฉพาะผ้าม่าน
 *
 * @example <AdvancedSection expanded={isDetail}>{installationControls}</AdvancedSection>
 */
export const AdvancedSection: React.FC<AdvancedSectionProps> = ({
  expanded,
  title = 'ตัวเลือกเพิ่มเติม',
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
