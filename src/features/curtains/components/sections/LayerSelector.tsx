import React from 'react';
import { LAYER_MODES } from '@/config/enums';
import { cn } from '@/lib/utils';
import { Layers, Sun, Moon, Check } from 'lucide-react';
import { useHaptic } from '@/hooks/useHaptic';

interface LayerSelectorProps {
  value: string;
  onChange: (val: string) => void;
  /** โหมดที่เลือกได้ (default = ทั้ง 3) — ม่านแป๊บทำ 2 ชั้นไม่ได้ จึงตัด DOUBLE ออก */
  allowedModes?: string[];
  /** 'track' = segmented เดิม (ราง bg-muted) · 'tiles' = ไทล์ขอบรายตัว (เข้าชุด OpeningStyleSelector) */
  variant?: 'track' | 'tiles';
}

export const LayerSelector: React.FC<LayerSelectorProps> = ({
  value,
  onChange,
  allowedModes,
  variant = 'track',
}) => {
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

  const isTiles = variant === 'tiles';
  const cols = options.length === 2 ? 'grid-cols-2' : 'grid-cols-3';

  return (
    <div
      className={cn(
        'grid gap-2',
        cols,
        // track = ราง segmented เดิม; tiles = ไม่มีราง (ขอบอยู่ที่ไทล์)
        !isTiles && 'p-1 bg-muted/40 rounded-xl border border-border/50'
      )}
    >
      {options.map((opt) => {
        const isSelected = value === opt.id;

        // tiles — เข้าชุด OpeningStyleSelector (ขอบรายตัว · active = พื้น accent + ✓)
        if (isTiles) {
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleSelect(opt.id)}
              className={cn(
                'relative flex flex-col items-center justify-center h-16 rounded-xl border-2 transition-all active:scale-95',
                isSelected
                  ? 'border-foreground bg-accent text-foreground'
                  : 'border-border bg-card text-muted-foreground hover:bg-muted/30 hover:border-foreground/40'
              )}
            >
              <opt.icon
                className={cn(
                  'w-7 h-7 mb-1',
                  isSelected ? 'text-foreground animate-bounce-short' : 'text-muted-foreground/70'
                )}
                strokeWidth={1.5}
              />
              <span className="text-sm font-medium">{opt.label}</span>
              {isSelected && (
                <div className="absolute top-1 right-1 bg-foreground text-background rounded-full p-0.5">
                  <Check className="w-2 h-2" strokeWidth={1.5} />
                </div>
              )}
            </button>
          );
        }

        // track — segmented เดิม (ปุ่มที่เลือก "ยกขึ้น" ขาว+เงา)
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => handleSelect(opt.id)}
            className={cn(
              "relative flex flex-col items-center justify-center py-3 rounded-lg transition-all duration-200",
              isSelected
                ? "bg-white dark:bg-slate-800 shadow-sm text-foreground border border-border/50"
                : "text-muted-foreground hover:bg-white/50 dark:hover:bg-slate-700/50"
            )}
          >
            <opt.icon className={cn("w-5 h-5 mb-1.5", isSelected && "animate-pulse-once")} strokeWidth={1.5} />
            <span className="text-xs font-bold">{opt.label}</span>
            {/* Active Indicator Dot */}
            {isSelected && (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-foreground rounded-full" />
            )}
          </button>
        );
      })}
    </div>
  );
};
