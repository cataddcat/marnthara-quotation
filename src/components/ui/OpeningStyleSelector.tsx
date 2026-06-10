import React from 'react';
import { Minus, SplitSquareHorizontal, ArrowRightToLine, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { openingBucket, OPENING_CENTER, OPENING_SIDE } from '@/lib/opening-style';

/**
 * ตัวเลือก "ทิศทางการเปิด" มาตรฐาน — 3 ปุ่ม ยังไม่เลือก / แยกกลาง / เก็บข้างเดียว
 * (default = ยังไม่เลือก, ผู้ใช้ต้องกดเลือกเอง — ItemCard จะเตือนถ้ายังไม่เลือก)
 *
 * ใช้ร่วมหลายสินค้า (ผ้าม่าน, ม่านปรับแสง, …). `active` ตัดสินด้วย `openingBucket`
 * จึงรองรับค่า legacy ทุกแบบ (เก็บซ้าย/เก็บขวา/side/center) โดยกดเลือกแล้ว normalize เป็นค่า canonical
 */
const OPTIONS = [
  { bucket: 'none' as const, value: '', label: 'ยังไม่เลือก', icon: Minus },
  { bucket: 'center' as const, value: OPENING_CENTER, label: 'แยกกลาง', icon: SplitSquareHorizontal },
  { bucket: 'side' as const, value: OPENING_SIDE, label: 'เก็บข้างเดียว', icon: ArrowRightToLine },
];

interface OpeningStyleSelectorProps {
  value: string | undefined;
  onChange: (value: string) => void;
  /** หัวข้อกำกับ (เช่น "ทิศทางการเปิด" สำหรับผ้าม่าน, "เก็บใบ" สำหรับม่านปรับแสง) */
  label?: string;
}

export const OpeningStyleSelector: React.FC<OpeningStyleSelectorProps> = ({
  value,
  onChange,
  label = 'ทิศทางการเปิด',
}) => {
  const activeBucket = openingBucket(value);

  return (
    <div className="space-y-2 pt-2">
      <label className="text-sm font-medium text-muted-foreground ml-1">{label}</label>
      <div className="grid grid-cols-3 gap-3">
        {OPTIONS.map((opt) => {
          const isSelected = activeBucket === opt.bucket;
          return (
            <button
              key={opt.label}
              type="button"
              onClick={() => onChange(opt.value)}
              className={cn(
                'relative flex flex-col items-center justify-center h-20 rounded-xl border-2 transition-all active:scale-95',
                isSelected
                  ? 'border-foreground bg-accent text-foreground'
                  : 'border-border bg-card text-muted-foreground hover:bg-muted/30 hover:border-foreground/40'
              )}
            >
              <opt.icon
                className={cn(
                  'w-8 h-8 mb-1',
                  // token แทน palette ตรง (DESIGN.md: monochrome chrome) — เดิม text-slate-400
                  isSelected ? 'text-foreground' : 'text-muted-foreground/70',
                  isSelected && 'animate-bounce-short'
                )}
                strokeWidth={1.5}
              />
              {/* ป้ายปุ่ม = เนื้อหาหลักของ control → Body ≥14px (text-xs 12px สงวนให้ Meta) */}
              <span className="text-sm font-medium">{opt.label}</span>
              {isSelected && (
                <div className="absolute top-1 right-1 bg-foreground text-background rounded-full p-0.5">
                  <Check className="w-2 h-2" strokeWidth={1.5} />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
