import React from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: React.ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md';
}

/**
 * EmptyState — utilitarian placeholder per the Marnthara Design System.
 * Text-led + monochrome (no decorative grey icon "bubble" — that reads as bloat and
 * off-brand): a subtle muted icon, a 16–18px Title, a 12–14px Meta description, and an
 * optional action. Borders over shadows. Mirrors the DS empty pattern (clean centered text).
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  className,
  size = 'md',
}) => {
  const compact = size === 'sm';
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'py-8 px-4' : 'py-12 px-6',
        className
      )}
    >
      {Icon && (
        <Icon
          className={cn('text-muted-foreground/50', compact ? 'w-6 h-6 mb-2.5' : 'w-7 h-7 mb-3')}
          strokeWidth={1.5}
        />
      )}
      <p
        className={cn(
          'font-semibold text-foreground tracking-tight',
          compact ? 'text-base' : 'text-lg'
        )}
      >
        {title}
      </p>
      {description && (
        <p
          className={cn(
            'text-muted-foreground leading-relaxed',
            compact ? 'text-xs mt-1' : 'text-sm mt-1.5 max-w-xs'
          )}
        >
          {description}
        </p>
      )}
      {action && <div className={compact ? 'mt-4' : 'mt-5'}>{action}</div>}
    </div>
  );
};
