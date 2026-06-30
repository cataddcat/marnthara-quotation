import * as React from 'react';
import { cn } from '@/lib/utils';
import { useHaptic } from '@/hooks/useHaptic';
import { Squircle } from '@/components/ui/Squircle';

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

  // Squircle surface: the variant's bg/border move onto the SVG <path> (fill = surface, stroke = edge);
  // elevation = drop-shadow so it follows the squircle (box-shadow would trace a rounded-rect).
  // Differential elevation (DESIGN.md §2): ghost flat · secondary/outline edge-only · CTAs lift.
  const variantPath: Record<NonNullable<ButtonProps['variant']>, string> = {
    primary: 'fill-primary group-hover:fill-primary/90',
    secondary: 'fill-secondary stroke-border group-hover:fill-secondary/80',
    outline: 'fill-background stroke-border group-hover:fill-accent',
    ghost: 'fill-transparent group-hover:fill-accent',
    destructive: 'fill-destructive group-hover:fill-destructive/90',
  };
  const variantText: Record<NonNullable<ButtonProps['variant']>, string> = {
    primary: 'text-primary-foreground',
    secondary: 'text-secondary-foreground',
    outline: 'text-foreground hover:text-accent-foreground',
    ghost: 'text-foreground hover:text-accent-foreground',
    destructive: 'text-destructive-foreground',
  };
  const variantShadow: Record<NonNullable<ButtonProps['variant']>, string> = {
    primary: 'drop-shadow-sm group-hover:drop-shadow-md',
    secondary: '',
    outline: '',
    ghost: '',
    destructive: 'drop-shadow-sm group-hover:drop-shadow-md',
  };
  // only edged variants draw a stroke; filled/ghost have no visible border
  const hasStroke = variant === 'secondary' || variant === 'outline';

  const sizes = {
    sm: 'h-9 px-3 text-xs rounded-lg',
    // [STANDARD 2025] 48px height, 16px font
    md: 'h-12 px-5 py-2 rounded-xl text-base font-medium',
    lg: 'h-14 px-8 rounded-xl text-lg font-bold',
    icon: 'h-12 w-12 p-0 rounded-xl flex items-center justify-center', // Square-ish for icons
  };

  return (
    <Squircle
      ref={ref}
      type={type}
      onClick={handleClick}
      strokeWidth={hasStroke ? 1.5 : 0}
      pathClassName={variantPath[variant]}
      shadowClassName={variantShadow[variant]}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 select-none active:scale-[0.98]',
        variantText[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
};
