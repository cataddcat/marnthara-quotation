import React, { useId } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, AlertCircle } from 'lucide-react';

interface SelectButtonProps extends React.ComponentProps<'button'> {
  label?: string;
  valueLabel?: string;
  placeholder?: string;
  hasError?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const SelectButton = React.forwardRef<HTMLButtonElement, SelectButtonProps>(
  (
    { className, label, valueLabel, placeholder = 'เลือก...', hasError, size = 'md', id: providedId, ...props },
    ref
  ) => {
    const generatedId = useId();
    const id = providedId || generatedId;

    const sizeClasses = {
      sm: { button: 'h-9 px-3 text-sm rounded-lg', label: 'text-sm' },
      md: { button: 'h-12 px-4 text-base rounded-xl', label: 'text-[15px]' },
      lg: { button: 'h-14 px-4 text-lg rounded-2xl', label: 'text-base' },
    }[size];

    return (
      <div className="space-y-1.5 w-full">
        {label && (
          <label htmlFor={id} className={cn(sizeClasses.label, "font-medium ml-1", hasError ? "text-destructive" : "text-foreground")}>
            {label}
          </label>
        )}
        <button
          ref={ref}
          id={id}
          type="button"
          className={cn(
            'flex w-full items-center justify-between border bg-background py-2 transition-all shadow-sm',
            sizeClasses.button,
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent',
            hasError ? 'border-destructive text-destructive' : 'border-input text-foreground',
            !valueLabel && 'text-muted-foreground', // Placeholder color
            'active:scale-[0.99] active:bg-accent/50', // Subtle feedback
            className
          )}
          {...props}
        >
          <span className="truncate">{valueLabel || placeholder}</span>
          <ChevronDown className={cn("h-5 w-5 opacity-50 shrink-0", hasError && "text-destructive")} />
        </button>
        {hasError && (
          <div className="flex items-center gap-1.5 px-1 animate-fade-in">
             <AlertCircle className="w-3.5 h-3.5 text-destructive" />
             <span className="text-xs font-medium text-destructive">จำเป็นต้องเลือก</span>
          </div>
        )}
      </div>
    );
  }
);
SelectButton.displayName = 'SelectButton';