// src/components/ui/ColorSelect.tsx
//
// Reusable colour picker — `Select` over the shared RAIL_COLORS swatches + a "กำหนดเอง" custom entry
// that reveals a free-text Input. Extracted from the curtains HardwareSection "สีราง/อุปกรณ์" picker so
// other forms (e.g. pleated-screen "สีเฟรม") can reuse it without duplicating the colour list/logic.
// Stores a plain Thai colour string (preset value or custom text).

import React, { useState } from 'react';
import { Palette } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Select } from './Select';
import { Input } from './Input';
import { RAIL_COLORS } from '@/config/railProducts';

const CUSTOM = '__custom__';
const PRESETS = RAIL_COLORS.map((c) => c.value);
const OPTIONS = [
  { label: 'เลือกสี...', value: '' },
  ...RAIL_COLORS.map((c) => ({ label: c.label, value: c.value, color: c.hex })),
  { label: 'กำหนดเอง', value: CUSTOM },
];

interface ColorSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  warning?: string;
}

export const ColorSelect: React.FC<ColorSelectProps> = ({ label, value, onChange, error, warning }) => {
  // ค่าปัจจุบันไม่ใช่พรีเซ็ตและไม่ว่าง → ถือว่าเป็น "กำหนดเอง"
  const [custom, setCustom] = useState(() => value !== '' && !PRESETS.includes(value));

  const handleSelect = (val: string) => {
    if (val === CUSTOM) {
      setCustom(true);
      if (PRESETS.includes(value)) onChange(''); // สลับพรีเซ็ต→กำหนดเอง: เคลียร์ให้พิมพ์ใหม่
    } else {
      setCustom(false);
      onChange(val);
    }
  };

  return (
    <div className="space-y-2 animate-fade-in">
      <label className="text-sm font-medium text-muted-foreground ml-1 flex items-center gap-1.5">
        <Palette className="w-3.5 h-3.5" /> {label}
      </label>
      <Select
        options={OPTIONS}
        value={custom ? CUSTOM : value}
        onChange={(e) => handleSelect(e.target.value)}
        className={cn(error && 'border-destructive focus-visible:ring-destructive')}
      />
      {custom && (
        <Input
          prefix={<Palette className="w-4 h-4 text-muted-foreground" />}
          placeholder="ระบุสีเอง..."
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          error={error}
          warning={warning}
        />
      )}
      {!custom && (error || warning) && (
        <p className={cn('text-xs px-1', error ? 'text-destructive' : 'text-warning-foreground')}>
          {error || warning}
        </p>
      )}
    </div>
  );
};
