import React from 'react';
import { CurtainItemInput } from '@/types';
import { Input } from '@/components/ui/Input';
import { FormSection } from '@/components/ui/FormSection';
import { Ruler, Scissors, RefreshCw } from 'lucide-react';
import { useTierSize } from '@/hooks/useExperienceMode';
import { fabricWidthAdvice } from '@/lib/fabric-width';
import { toNum } from '@/utils/formatters';
import { cn } from '@/lib/utils';

interface DimensionSectionProps {
  data: CurtainItemInput;
  onChange: (field: keyof CurtainItemInput, val: string) => void;
  errors: Partial<Record<keyof CurtainItemInput, string>>;
}

export const DimensionSection: React.FC<DimensionSectionProps> = ({ data, onChange, errors }) => {
  // หน้างาน = ช่องขนาดใหญ่ขึ้น (hero, กดด้วยนิ้วโป้งง่าย); ละเอียด = ปกติ
  const { control } = useTierSize();

  // คำแนะนำหน้าผ้าตามความสูง (กติกาเจ้าของร้าน: หน้า 2.8/3.2/3.4 − เผื่อเย็บ 30 ซม.)
  // เกินหน้ากว้างสุด → ต้องหมุนผ้า 90° เย็บต่อด้านข้าง — เตือนตั้งแต่ตอนวัด กันสั่งผ้าผิดหน้า
  // (>6 ม. = กำลังพิมพ์เป็น ซม. ก่อน blur-normalize เช่น "250" — ยังไม่ตีความ กันเตือนผิดแว้บ ๆ)
  const heightM = toNum(data.height_m);
  const advice = fabricWidthAdvice(heightM > 6 ? 0 : heightM);

  return (
    <FormSection icon={Ruler} title="ขนาดพื้นที่ (ม.)">
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="กว้าง (W)"
          placeholder="0.00"
          value={data.width_m}
          onChange={(e) => onChange('width_m', e.target.value)}
          isDimension
          autoFocus
          size={control}          error={errors.width_m}
        />
        <Input
          label="สูง (H)"
          placeholder="0.00"
          value={data.height_m}
          onChange={(e) => onChange('height_m', e.target.value)}
          isDimension
          size={control}          error={errors.height_m}
        />
      </div>

      {advice.kind !== 'none' && (
        <div
          className={cn(
            'mt-2 flex items-start gap-1.5 text-sm leading-snug',
            advice.kind === 'rotate'
              ? 'text-amber-700 dark:text-amber-400 eeert:text-amber-900'
              : 'text-muted-foreground'
          )}
        >
          {advice.kind === 'rotate' ? (
            <RefreshCw className="w-3.5 h-3.5 mt-0.5 shrink-0" strokeWidth={1.5} />
          ) : (
            <Scissors className="w-3.5 h-3.5 mt-0.5 shrink-0" strokeWidth={1.5} />
          )}
          <span>{advice.message}</span>
        </div>
      )}
    </FormSection>
  );
};
