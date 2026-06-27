import React, { useState } from 'react';
import { CurtainItemInput } from '@/types';
import { CURTAIN_STYLES, STYLES_WITHOUT_OPENING } from '@/config/constants';
import { LAYER_MODES } from '@/config/enums';
import { OptionSheet } from '@/components/ui/OptionSheet';
import { FormSection } from '@/components/ui/FormSection';
import { Settings2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OpeningStyleSelector } from '@/components/ui/OpeningStyleSelector';
import { LayerSelector } from './LayerSelector';
import { useThemeStore } from '@/store/standalone/useThemeStore';

interface StyleSectionProps {
  data: CurtainItemInput;
  onChange: (field: keyof CurtainItemInput, val: string | number | boolean) => void;
  errors?: Partial<Record<keyof CurtainItemInput, string>>;
}

export const StyleSection: React.FC<StyleSectionProps> = ({ data, onChange, errors }) => {
  const [activeSheet, setActiveSheet] = useState<'style' | null>(null);
  // EEERT-minimal: ยุบหัวข้อ section ที่ซ้ำกับ label ภายใน (de-dup header); ธีมอื่นคงเดิม
  const isEeert = useThemeStore((s) => s.theme === 'eeert');

  // EEERT: ย้าย "ประเภทม่าน" (LayerSelector) ขึ้นมารวมในกรอบนี้ (เดิมอยู่ FabricSection)
  const layerMode = data.layer_mode || LAYER_MODES.MAIN;
  const allowedLayerModes =
    data.style === 'แป๊บ'
      ? [LAYER_MODES.MAIN, LAYER_MODES.SHEER] // แป๊บ (สอดราง) ทำ 2 ชั้นไม่ได้
      : [LAYER_MODES.MAIN, LAYER_MODES.SHEER, LAYER_MODES.DOUBLE];

  const getStyleLabel = () =>
    CURTAIN_STYLES.find((s) => s.value === data.style)?.label || 'เลือกรูปแบบ...';

  return (
    <div className="space-y-4">
      {/* 1. Style Selection Card */}
      <FormSection
        icon={isEeert ? undefined : Settings2}
        iconClass="text-foreground"
        title={isEeert ? undefined : 'รูปแบบม่าน & การเก็บ'}
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

        {/* ประเภทม่าน (ชั้นผ้า) — EEERT: ย้ายขึ้นมาในกรอบเดียวกับรูปแบบ/ทิศทาง (เดิมอยู่ FabricSection) */}
        {isEeert && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground ml-1">ประเภทม่าน</label>
            <LayerSelector
              value={layerMode}
              onChange={(v) => onChange('layer_mode', v)}
              allowedModes={allowedLayerModes}
              variant="tiles"
            />
          </div>
        )}

        {/* ทิศทางการเปิด — ม่านพับ (ยกขึ้นแนวตั้ง) / แป๊บ (สอดราว) ไม่มีทิศซ้าย/กลาง/ขวา
            แสดงทุกโหมด: บังคับเลือกก่อนออกเอกสาร — เก็บคำตอบได้ตั้งแต่หน้างาน */}
        {!STYLES_WITHOUT_OPENING.includes(data.style) && (
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