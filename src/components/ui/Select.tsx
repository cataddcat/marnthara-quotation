import React, { useId } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

interface SelectProps extends Omit<React.ComponentProps<'select'>, 'size'> {
  label?: string;
  /** `color` (hex) — เมื่อ option นั้นถูกเลือก จะโชว์แถบสีด้านซ้ายเพื่อสื่อค่าที่เลือก */
  options: { label: string; value: string | number; color?: string }[];
  size?: 'sm' | 'md' | 'lg';
}

export const Select = ({
  className,
  label,
  options,
  id: providedId,
  ref,
  size = 'md',
  value,
  ...props
}: SelectProps & { ref?: React.Ref<HTMLSelectElement> }) => {
  const generatedId = useId();
  const id = providedId || generatedId;

  // แถบสีของค่าที่เลือก (ถ้า option นั้นกำหนด color ไว้)
  const selectedColor = options.find((o) => String(o.value) === String(value ?? ''))?.color;

  const sizeClasses = {
    sm: { select: 'h-9 px-3 text-sm rounded-lg', label: 'text-sm' },
    md: { select: 'h-12 px-4 text-[16px] rounded-xl', label: 'text-[15px]' },
    lg: { select: 'h-14 px-4 text-lg rounded-xl', label: 'text-base' },
  }[size];

  return (
    <div className="space-y-1.5 w-full">
      {label && (
        <label htmlFor={id} className={cn(sizeClasses.label, "font-medium text-foreground ml-1")}>
          {label}
        </label>
      )}
      <div className="relative">
        {selectedColor && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-2 left-2 w-1.5 rounded-full border border-black/10 shadow-sm z-10"
            style={{ backgroundColor: selectedColor }}
          />
        )}
        <select
          ref={ref}
          id={id}
          value={value}
          className={cn(
            'flex w-full appearance-none border border-input bg-background py-2 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50 transition-all shadow-sm',
            sizeClasses.select,
            selectedColor && 'pl-7',
            className
          )}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Custom Arrow Icon */}
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
          <ChevronDown className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
};
