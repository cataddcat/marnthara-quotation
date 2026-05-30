import React, { useState } from 'react';
import { CurtainItemInput } from '@/types';
import { CURTAIN_STYLES } from '@/config/constants';
import { OptionSheet } from '@/components/ui/OptionSheet';
import {
  Settings2,
  ArrowLeftToLine,
  ArrowRightToLine,
  SplitSquareHorizontal,
  Check,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface StyleSectionProps {
  data: CurtainItemInput;
  onChange: (field: keyof CurtainItemInput, val: string | number | boolean) => void;
  errors?: Partial<Record<keyof CurtainItemInput, string>>;
  /** แสดงตัวเลือก "ทิศทางการเปิด" (ซ่อนในโหมด Lite) */
  showOpening?: boolean;
}

const OpeningButton = ({
  value,
  label,
  icon: Icon,
  currentValue,
  onChange,
}: {
  value: string;
  label: string;
  icon: React.ElementType;
  currentValue: string | undefined;
  onChange: (val: string) => void;
}) => {
  const isSelected = currentValue === value;
  return (
    <button
      type="button"
      onClick={() => onChange(value)}
      className={cn(
        'relative flex flex-col items-center justify-center h-20 rounded-xl border-2 transition-all active:scale-95',
        isSelected
          ? 'border-primary bg-primary/10 text-primary shadow-md'
          : 'border-border bg-card text-muted-foreground hover:bg-muted/30 hover:border-primary/50'
      )}
    >
      <Icon
        className={cn(
          'w-8 h-8 mb-1',
          isSelected ? 'text-primary' : 'text-slate-400',
          isSelected && 'animate-bounce-short'
        )}
        strokeWidth={1.5}
      />
      <span className="text-xs font-medium">{label}</span>
      {isSelected && (
        <div className="absolute top-1 right-1 bg-primary text-white rounded-full p-0.5">
          <Check className="w-2 h-2" />
        </div>
      )}
    </button>
  );
};

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
      <div className="bg-card p-4 rounded-2xl border border-border shadow-sm space-y-6">
        <div className="flex items-center justify-between text-foreground pb-2 border-b border-border/50">
          <div className="flex items-center gap-2 font-bold">
            <Settings2 className="w-5 h-5 text-primary" />
            <h2>รูปแบบม่าน & การเก็บ</h2>
          </div>
          {errors?.style && (
            <span className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {errors.style}
            </span>
          )}
        </div>

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
            <span className="text-sm text-primary font-bold">เปลี่ยน {'>'}</span>
          </button>
        </div>

        {/* Opening Style Grid */}
        {showOpening && (
        <div className="space-y-2 pt-2">
          <label className="text-sm font-medium text-muted-foreground ml-1">ทิศทางการเปิด</label>
          <div className="grid grid-cols-3 gap-3">
            <OpeningButton
              value="เก็บซ้าย"
              label="เก็บซ้าย"
              icon={ArrowLeftToLine}
              currentValue={data.opening_style}
              onChange={(v) => onChange('opening_style', v)}
            />
            <OpeningButton
              value="แยกกลาง"
              label="แยกกลาง"
              icon={SplitSquareHorizontal}
              currentValue={data.opening_style}
              onChange={(v) => onChange('opening_style', v)}
            />
            <OpeningButton
              value="เก็บขวา"
              label="เก็บขวา"
              icon={ArrowRightToLine}
              currentValue={data.opening_style}
              onChange={(v) => onChange('opening_style', v)}
            />
          </div>
        </div>
        )}
      </div>

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