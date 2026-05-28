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
        compact ? 'py-6 px-3' : 'py-12 px-4',
        className
      )}
    >
      {Icon && (
        <div
          className={cn(
            'rounded-full bg-muted flex items-center justify-center mb-3',
            compact ? 'w-10 h-10' : 'w-16 h-16'
          )}
        >
          <Icon className={cn('text-muted-foreground', compact ? 'w-5 h-5' : 'w-8 h-8')} />
        </div>
      )}
      <p className={cn('font-semibold text-foreground', compact ? 'text-sm' : 'text-lg')}>
        {title}
      </p>
      {description && (
        <p className={cn('text-muted-foreground mt-1', compact ? 'text-xs' : 'text-sm max-w-xs')}>
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
};
