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

  const variants = {
    primary:
      'bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20 border border-transparent active:scale-[0.98]',
    secondary:
      'bg-secondary text-secondary-foreground border border-transparent hover:bg-secondary/80 active:scale-[0.98]',
    outline:
      'border border-input bg-background hover:bg-accent hover:text-accent-foreground active:scale-[0.98]',
    ghost:
      'hover:bg-accent hover:text-accent-foreground border border-transparent active:scale-[0.98]',
    destructive:
      'bg-destructive text-destructive-foreground hover:bg-destructive/90 border border-transparent shadow-sm active:scale-[0.98]',
  };

  const sizes = {
    sm: 'h-9 px-3 text-xs rounded-lg',
    // [STANDARD 2025] 48px height, 16px font
    md: 'h-12 px-5 py-2 rounded-xl text-base font-medium',
    lg: 'h-14 px-8 rounded-2xl text-lg font-bold',
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
