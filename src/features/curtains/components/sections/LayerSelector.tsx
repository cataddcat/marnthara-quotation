import React from 'react';
import { LAYER_MODES } from '@/config/enums';
import { cn } from '@/lib/utils';
import { Layers, Sun, Moon } from 'lucide-react';
import { useHaptic } from '@/hooks/useHaptic';

interface LayerSelectorProps {
  value: string;
  onChange: (val: string) => void;
  /** โหมดที่เลือกได้ (default = ทั้ง 3) — ม่านแป๊บทำ 2 ชั้นไม่ได้ จึงตัด DOUBLE ออก */
  allowedModes?: string[];
}

export const LayerSelector: React.FC<LayerSelectorProps> = ({ value, onChange, allowedModes }) => {
  const { trigger } = useHaptic();

  const handleSelect = (mode: string) => {
    trigger('selection');
    onChange(mode);
  };

  const allOptions = [
    {
      id: LAYER_MODES.MAIN,
      label: 'ผ้าทึบ',
      icon: Moon,
      desc: 'Single Layer'
    },
    {
      id: LAYER_MODES.DOUBLE,
      label: 'ทึบ + โปร่ง',
      icon: Layers,
      desc: 'Double Layer'
    },
    {
      id: LAYER_MODES.SHEER,
      label: 'ผ้าโปร่ง',
      icon: Sun,
      desc: 'Sheer Only'
    },
  ];

  const options = allowedModes
    ? allOptions.filter((opt) => allowedModes.includes(opt.id))
    : allOptions;

  return (
    <div
      className={cn(
        'grid gap-2 p-1 bg-muted/40 rounded-xl border border-border/50',
        options.length === 2 ? 'grid-cols-2' : 'grid-cols-3'
      )}
    >
      {options.map((opt) => {
        const isSelected = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => handleSelect(opt.id)}
            className={cn(
              "relative flex flex-col items-center justify-center py-3 rounded-lg transition-all duration-200",
              isSelected 
                ? "bg-white dark:bg-slate-800 shadow-sm text-primary border border-border/50" 
                : "text-muted-foreground hover:bg-white/50 dark:hover:bg-slate-700/50"
            )}
          >
            <opt.icon className={cn("w-5 h-5 mb-1.5", isSelected && "animate-pulse-once")} />
            <span className="text-xs font-bold leading-none">{opt.label}</span>
            {/* Active Indicator Dot */}
            {isSelected && (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-primary rounded-full" />
            )}
          </button>
        );
      })}
    </div>
  );
};