import React, { useId, useRef } from 'react';
import { cn } from '@/lib/utils';
import { X, AlertCircle, AlertTriangle } from 'lucide-react';
import { normalizeDimension } from '@/utils/formatters';

interface InputProps extends Omit<React.ComponentProps<'input'>, 'prefix' | 'size'> {
  label?: string;
  suffix?: string;
  prefix?: React.ReactNode;
  isDimension?: boolean;
  onClear?: () => void;
  error?: string;
  warning?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Input = ({
  className,
  label,
  suffix,
  prefix,
  isDimension = false,
  id: providedId,
  ref: externalRef,
  value,
  onChange,
  onClear,
  onBlur,
  type = 'text',
  error,
  warning,
  size = 'md',
  ...props
}: InputProps & { ref?: React.Ref<HTMLInputElement> }) => {
  const generatedId = useId();
  const id = providedId || generatedId;
  const internalRef = useRef<HTMLInputElement>(null);
  
  const refToUse = (externalRef || internalRef) as React.MutableRefObject<HTMLInputElement | null>;

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (isDimension && onChange) {
      const currentValue = e.target.value;
      const smartValue = normalizeDimension(currentValue);
      if (smartValue !== currentValue && smartValue !== '') {
        const syntheticEvent = {
          ...e,
          target: { ...e.target, value: smartValue },
        } as React.ChangeEvent<HTMLInputElement>;
        onChange(syntheticEvent);
      }
    }
    onBlur?.(e);
  };

  const handleClear = () => {
    if (onClear) {
      onClear();
      requestAnimationFrame(() => refToUse.current?.focus());
    }
  };

  // Determine status color
  const statusClasses = error
    ? 'border-destructive focus:ring-destructive text-destructive'
    : warning
    ? 'border-warning focus:ring-warning text-warning-foreground'
    : 'border-input focus:ring-primary';

  const showClear = onClear && value && String(value).length > 0;

  const sizeClasses = {
    sm: { input: 'h-9 px-3 text-sm rounded-lg', label: 'text-sm' },
    md: { input: 'h-12 px-4 text-base rounded-xl', label: 'text-[15px]' },
    lg: { input: 'h-14 px-4 text-lg rounded-2xl', label: 'text-base' },
  }[size];

  return (
    <div className="space-y-1.5 w-full group">
      {label && (
        <label
          htmlFor={id}
          className={cn(
            sizeClasses.label,
            "font-medium ml-1 transition-colors",
            error ? "text-destructive" : "text-foreground"
          )}
        >
          {label}
        </label>
      )}
      <div className="relative">
        {prefix && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
            {prefix}
          </div>
        )}

        <input
          ref={refToUse}
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          onBlur={handleBlur}
          className={cn(
            'flex w-full border bg-background py-2 shadow-sm transition-all',
            sizeClasses.input,
            'file:border-0 file:bg-transparent file:text-sm file:font-medium',
            'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent',
            'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted/50',
            statusClasses,
            suffix ? 'pr-12' : showClear ? 'pr-10' : '',
            prefix ? 'pl-10' : '',
            className
          )}
          {...props}
        />

        {suffix && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium pointer-events-none">
            {suffix}
          </div>
        )}

        {showClear && !suffix && (
          <button
            type="button"
            onClick={handleClear}
            tabIndex={-1}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring active:scale-90"
            aria-label="Clear input"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {error ? (
        <div className="flex items-center gap-1.5 px-1 animate-fade-in" role="alert">
          <AlertCircle className="w-3.5 h-3.5 text-destructive" />
          <span className="text-xs font-medium text-destructive">{error}</span>
        </div>
      ) : warning ? (
        <div className="flex items-center gap-1.5 px-1 animate-fade-in" role="alert">
          <AlertTriangle className="w-3.5 h-3.5 text-warning" />
          <span className="text-xs font-medium text-warning-foreground">{warning}</span>
        </div>
      ) : null}
    </div>
  );
};