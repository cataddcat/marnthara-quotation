import React, { useId, useRef, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { X, AlertCircle, AlertTriangle, RotateCcw } from 'lucide-react';
import { parseDimension, toNum } from '@/utils/formatters';

/** ช่วงขนาดสมเหตุสมผล (ม.) — นอกช่วงนี้เตือน (ไม่บล็อก) */
const DIM_MIN_M = 0.1;
const DIM_MAX_M = 15;

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
  onFocus,
  type = 'text',
  inputMode,
  error,
  warning,
  size = 'md',
  ...props
}: InputProps & { ref?: React.Ref<HTMLInputElement> }) => {
  const generatedId = useId();
  const id = providedId || generatedId;
  const internalRef = useRef<HTMLInputElement>(null);

  // ป้ายแปลง ซม.→ม. (โปร่งใส + ย้อนได้) และสถานะ focus (กันเตือนกระพริบระหว่างพิมพ์)
  const [conversion, setConversion] = useState<{ from: string; to: string; undoTo: string } | null>(
    null
  );
  const [focused, setFocused] = useState(false);
  const conversionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (conversionTimer.current) clearTimeout(conversionTimer.current);
  }, []);

  // Smart numeric keyboard: ช่องตัวเลข (ขนาด/number) เด้ง numpad บนมือถือเองโดยไม่ต้องระบุซ้ำ
  // — caller ยัง override ได้ (เช่นอยากได้ 'numeric' แบบไม่มีจุดทศนิยม)
  const resolvedInputMode =
    inputMode ?? (isDimension || type === 'number' ? 'decimal' : undefined);

  const refToUse = (externalRef || internalRef) as React.MutableRefObject<HTMLInputElement | null>;

  // ยิง onChange ด้วยค่าใหม่ (synthetic event ขั้นต่ำ — caller อ่าน e.target.value)
  const emitValue = (val: string) =>
    onChange?.({ target: { value: val } } as React.ChangeEvent<HTMLInputElement>);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setFocused(true);
    onFocus?.(e);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (conversion) setConversion(null); // ผู้ใช้เริ่มแก้ → ซ่อนป้าย
    onChange?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setFocused(false);
    if (isDimension && onChange) {
      const raw = e.target.value;
      const { value: smart, convertedFromCm, rawMeters } = parseDimension(raw);
      if (smart !== raw && smart !== '') {
        onChange({
          ...e,
          target: { ...e.target, value: smart },
        } as React.ChangeEvent<HTMLInputElement>);

        if (convertedFromCm) {
          if (conversionTimer.current) clearTimeout(conversionTimer.current);
          setConversion({ from: raw.trim(), to: smart, undoTo: rawMeters });
          conversionTimer.current = setTimeout(() => setConversion(null), 5000);
        } else {
          setConversion(null);
        }
      }
    }
    onBlur?.(e);
  };

  const handleUndo = () => {
    if (!conversion) return;
    emitValue(conversion.undoTo);
    setConversion(null);
  };

  const handleClear = () => {
    if (onClear) {
      onClear();
      requestAnimationFrame(() => refToUse.current?.focus());
    }
  };

  // เตือนค่าขนาดผิดปกติ (soft, ไม่บล็อก) — เฉพาะตอนไม่ได้ focus เพื่อไม่กระพริบระหว่างพิมพ์
  const numericValue =
    typeof value === 'number' || typeof value === 'string' ? value : undefined;
  const dimWarning =
    isDimension && !focused && toNum(numericValue) > 0 &&
    (toNum(numericValue) < DIM_MIN_M || toNum(numericValue) > DIM_MAX_M)
      ? 'ตรวจสอบขนาด (ม.)'
      : undefined;
  const effectiveWarning = warning ?? dimWarning;

  // Determine status color
  const statusClasses = error
    ? 'border-destructive focus:ring-destructive text-destructive'
    : effectiveWarning
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
          inputMode={resolvedInputMode}
          value={value}
          onChange={handleChange}
          onFocus={handleFocus}
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
      ) : conversion ? (
        <div className="flex items-center justify-between gap-2 px-1 animate-fade-in">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
            <RotateCcw className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">
              ป้อน {conversion.from} → <span className="font-semibold text-foreground">{conversion.to} ม.</span>
            </span>
          </span>
          <button
            type="button"
            onClick={handleUndo}
            className="text-xs font-semibold text-primary hover:underline shrink-0"
          >
            ใช้ {conversion.from} ม.
          </button>
        </div>
      ) : effectiveWarning ? (
        <div className="flex items-center gap-1.5 px-1 animate-fade-in" role="alert">
          <AlertTriangle className="w-3.5 h-3.5 text-warning" />
          <span className="text-xs font-medium text-warning-foreground">{effectiveWarning}</span>
        </div>
      ) : null}
    </div>
  );
};