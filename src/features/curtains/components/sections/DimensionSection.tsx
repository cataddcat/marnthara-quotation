import React from 'react';
import { CurtainItemInput } from '@/types';
import { Input } from '@/components/ui/Input';
import { Ruler } from 'lucide-react';

interface DimensionSectionProps {
  data: CurtainItemInput;
  onChange: (field: keyof CurtainItemInput, val: string) => void;
  errors: Partial<Record<keyof CurtainItemInput, string>>;
}

export const DimensionSection: React.FC<DimensionSectionProps> = ({ data, onChange, errors }) => {
  return (
    <div className="bg-card p-4 rounded-2xl border border-border shadow-sm space-y-4">
      <div className="flex items-center gap-2 text-foreground font-bold">
        <Ruler className="w-5 h-5 text-sky-500" />
        <h2>ขนาดพื้นที่ (ม.)</h2>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="กว้าง (W)"
          placeholder="0.00"
          value={data.width_m}
          onChange={(e) => onChange('width_m', e.target.value)}
          isDimension
          autoFocus
          className="text-lg font-bold text-sky-600 dark:text-sky-400 bg-sky-500/10"
          error={errors.width_m}
        />
        <Input
          label="สูง (H)"
          placeholder="0.00"
          value={data.height_m}
          onChange={(e) => onChange('height_m', e.target.value)}
          isDimension
          className="text-lg font-bold text-sky-600 dark:text-sky-400 bg-sky-500/10"
          error={errors.height_m}
        />
      </div>
    </div>
  );
};
