import * as React from 'react';
import { cn } from '@/lib/utils';
import { useHaptic } from '@/hooks/useHaptic';

export interface ButtonProps extends React.ComponentProps<'button'> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  disableHaptic?: boolean;
}

export const Button = ({
  className,
  variant = 'primary',
  size = 'md',
  disableHaptic = false,
  onClick,
  ref,
  // ดึง type ออกมาตั้ง default ชัดเจน (กัน footgun: hardcode ก่อน {...props} ทำให้ลำดับ prop สำคัญ)
  // — ปุ่มในฟอร์มที่ส่ง type="submit" ยังทำงานปกติ; ที่ไม่ส่งจะเป็น "button" เช่นเดิม
  type = 'button',
  ...props
}: ButtonProps & { ref?: React.Ref<HTMLButtonElement> }) => {
  const { trigger } = useHaptic();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disableHaptic) {
      trigger(variant === 'destructive' ? 'warning' : 'light');
    }
    onClick?.(e);
  };

  // Borders + soft, DIFFERENTIAL elevation (DESIGN.md §2): ghost stays flat so hierarchy reads;
  // secondary/outline get a visible edge + faint lift; filled CTAs lift more and press down on :active.
  const variants = {
    primary:
      'bg-primary text-primary-foreground border border-transparent shadow-sm hover:bg-primary/90 hover:shadow-md active:scale-[0.98] active:shadow-sm',
    secondary:
      'bg-secondary text-secondary-foreground border border-border shadow-xs hover:bg-secondary/80 hover:shadow-sm active:scale-[0.98] active:shadow-none',
    outline:
      'border border-border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground hover:shadow-sm active:scale-[0.98] active:shadow-none',
    ghost:
      'hover:bg-accent hover:text-accent-foreground border border-transparent active:scale-[0.98]',
    destructive:
      'bg-destructive text-destructive-foreground border border-transparent shadow-sm hover:bg-destructive/90 hover:shadow-md active:scale-[0.98] active:shadow-sm',
  };

  const sizes = {
    sm: 'h-9 px-3 text-xs rounded-lg',
    // [STANDARD 2025] 48px height, 16px font
    md: 'h-12 px-5 py-2 rounded-xl text-base font-medium',
    lg: 'h-14 px-8 rounded-xl text-lg font-bold',
    icon: 'h-12 w-12 p-0 rounded-xl flex items-center justify-center', // Square-ish for icons
  };

  return (
    <button
      ref={ref}
      type={type}
      onClick={handleClick}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 select-none',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
};
