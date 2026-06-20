import React from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'secondary' | 'outline' | 'destructive' | 'success';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'default', size = 'md', className }) => {
  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-xs',
    lg: 'px-3 py-1 text-sm',
  };

  const variants = {
    // [THEME CHANGE] bg-slate-900 -> bg-primary
    default: 'bg-primary text-primary-foreground border-transparent',
    // [THEME CHANGE] bg-slate-100 -> bg-secondary | text-slate-900 -> text-secondary-foreground
    secondary: 'bg-secondary text-secondary-foreground border-transparent hover:bg-secondary/80',
    // [THEME CHANGE] text-slate-900 -> text-foreground | border-slate-200 -> border-border
    outline: 'text-foreground border-border hover:bg-accent hover:text-accent-foreground',
    // [THEME CHANGE] bg-red-100 -> bg-destructive/10 | text-red-600 -> text-destructive
    destructive: 'bg-destructive/10 text-destructive border-transparent hover:bg-destructive/20',
    // [THEME CHANGE] bg-green-100 -> bg-emerald-500/10 | text-green-700 -> text-emerald-600
    success: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 eeert:text-emerald-800 border-transparent',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        sizes[size],
        variants[variant],
        className
      )}
    >
      {children}
    </div>
  );
};
