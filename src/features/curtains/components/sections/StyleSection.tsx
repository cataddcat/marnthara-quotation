import React, { useState } from 'react';
import { CurtainItemInput } from '@/types';
import { CURTAIN_STYLES, STYLES_WITHOUT_OPENING } from '@/config/constants';
import { OptionSheet } from '@/components/ui/OptionSheet';
import { FormSection } from '@/components/ui/FormSection';
import { Settings2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OpeningStyleSelector } from '@/components/ui/OpeningStyleSelector';

interface StyleSectionProps {
  data: CurtainItemInput;
  onChange: (field: keyof CurtainItemInput, val: string | number | boolean) => void;
  errors?: Partial<Record<keyof CurtainItemInput, string>>;
  /** แสดงตัวเลือก "ทิศทางการเปิด" (ซ่อนในโหมดหน้างาน — กางได้จาก "ตัวเลือกขั้นสูง") */
  showOpening?: boolean;
}

export const StyleSection: React.FC<StyleSectionProps> = ({
  data,
  onChange,
  errors,
  showOpening = true,
}) => {
  const [activeSheet, setActiveSheet] = useState<'style' | null>(null);

  const getStyleLabel = () =>
    CURTAIN_STYLES.find((s) => s.value === data.style)?.label || 'เลือกรูปแบบ...';

  return (
    <div className="space-y-4">
      {/* 1. Style Selection Card */}
      <FormSection
        icon={Settings2}
        iconClass="text-foreground"
        title="รูปแบบม่าน & การเก็บ"
        headerRight={
          errors?.style && (
            <span className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {errors.style}
            </span>
          )
        }
      >
        {/* Style Selection Button */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground ml-1">รูปแบบม่าน</label>
          <button
            type="button"
            onClick={() => setActiveSheet('style')}
            className={cn(
              "w-full flex items-center justify-between p-4 rounded-xl border bg-background transition-all hover:bg-muted/30",
              errors?.style 
                ? "border-destructive/50 ring-1 ring-destructive/20" 
                : "border-input hover:border-primary/50"
            )}
          >
            <span className="text-base font-medium">{getStyleLabel()}</span>
            <span className="text-sm text-muted-foreground font-bold">เปลี่ยน {'>'}</span>
          </button>
        </div>

        {/* ทิศทางการเปิด — ม่านพับ (ยกขึ้นแนวตั้ง) / แป๊บ (สอดราว) ไม่มีทิศซ้าย/กลาง/ขวา */}
        {showOpening && !STYLES_WITHOUT_OPENING.includes(data.style) && (
          <OpeningStyleSelector
            value={data.opening_style}
            onChange={(v) => onChange('opening_style', v)}
          />
        )}
      </FormSection>

      {/* Option Sheet for Style Selection */}
      <OptionSheet
        isOpen={activeSheet === 'style'}
        onClose={() => setActiveSheet(null)}
        title="เลือกรูปแบบม่าน"
        options={CURTAIN_STYLES}
        value={data.style}
        onSelect={(val) => onChange('style', val)}
      />
    </div>
  );
};