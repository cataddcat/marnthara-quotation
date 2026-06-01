import React from 'react';
import { CurtainItemInput } from '@/types';
import { Input } from '@/components/ui/Input';
import { FormSection } from '@/components/ui/FormSection';
import { Ruler } from 'lucide-react';
import { useTierSize } from '@/hooks/useExperienceMode';

interface DimensionSectionProps {
  data: CurtainItemInput;
  onChange: (field: keyof CurtainItemInput, val: string) => void;
  errors: Partial<Record<keyof CurtainItemInput, string>>;
}

export const DimensionSection: React.FC<DimensionSectionProps> = ({ data, onChange, errors }) => {
  // Lite = ช่องขนาดใหญ่ขึ้น (hero, กดด้วยนิ้วโป้งง่าย); Full = ปกติ
  const { control } = useTierSize();
  return (
    <FormSection icon={Ruler} title="ขนาดพื้นที่ (ม.)">
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="กว้าง (W)"
          placeholder="0.00"
          value={data.width_m}
          onChange={(e) => onChange('width_m', e.target.value)}
          isDimension
          autoFocus
          size={control}
          className="text-lg font-bold text-sky-600 dark:text-sky-400 bg-sky-500/10"
          error={errors.width_m}
        />
        <Input
          label="สูง (H)"
          placeholder="0.00"
          value={data.height_m}
          onChange={(e) => onChange('height_m', e.target.value)}
          isDimension
          size={control}
          className="text-lg font-bold text-sky-600 dark:text-sky-400 bg-sky-500/10"
          error={errors.height_m}
        />
      </div>
    </FormSection>
  );
};
