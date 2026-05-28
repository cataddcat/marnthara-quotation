import * as React from 'react';
import { cn } from '@/lib/utils';

interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'size'> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  size?: 'sm' | 'md';
}

export const Switch = ({
  className,
  checked,
  onCheckedChange,
  disabled,
  size = 'md',
  ref,
  ...props
}: SwitchProps & { ref?: React.Ref<HTMLInputElement> }) => {
  const sizeClasses = {
    sm: { track: 'w-[40px] h-[24px]', thumb: 'w-[20px] h-[20px]', translate: 'translate-x-[16px]' },
    md: { track: 'w-[51px] h-[31px]', thumb: 'w-[27px] h-[27px]', translate: 'translate-x-[20px]' },
  }[size];

  return (
    <label
      className={cn(
        'group inline-flex items-center relative cursor-pointer tap-highlight-transparent',
        disabled && 'cursor-not-allowed opacity-50',
        className
      )}
    >
      <input
        ref={ref}
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={(e) => onCheckedChange(e.target.checked)}
        disabled={disabled}
        {...props}
      />
      {/* Track */}
      <div
        className={cn(
          sizeClasses.track,
          'rounded-full transition-colors duration-300 ease-in-out border',
          checked
            ? 'bg-primary border-primary'
            : 'bg-input border-border'
        )}
      />
      {/* Thumb */}
      <div
        className={cn(
          'absolute left-[2px] top-[2px] bg-background rounded-full shadow-sm transition-transform duration-300 ease-in-out',
          sizeClasses.thumb,
          checked ? sizeClasses.translate : 'translate-x-0'
        )}
      />
    </label>
  );
};
