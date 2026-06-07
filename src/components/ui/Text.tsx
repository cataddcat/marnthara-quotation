import React from 'react';
import { cn } from '@/lib/utils';
import { TYPOGRAPHY, type TypographyRole } from '@/config/typography';

interface TextProps extends React.HTMLAttributes<HTMLElement> {
  /** semantic role from the design scale (DESIGN.md §2) — default 'body' (16px) */
  variant?: TypographyRole;
  /** render numbers/codes in the mono numeric layer (Geist Mono) */
  numeric?: boolean;
  /** secondary text — reserve for genuinely secondary content (label/meta), never primary */
  muted?: boolean;
  /** element to render (default: 'span') */
  as?: React.ElementType;
}

/**
 * Text — the sanctioned way to size text (DESIGN.md). Resolves a semantic role to the
 * standard scale so the floor (Body 14–16 · Meta-only 12 · no <12 content) is automatic.
 * Color defaults to `text-foreground`; pass a color via `className` to override (tailwind-merge wins).
 *
 * NOTE: adoption across existing call-sites is the Phase-2 readability pass — this primitive is
 * additive and changes no rendered UI on its own.
 */
export const Text = ({
  variant = 'body',
  numeric = false,
  muted = false,
  as,
  className,
  ...props
}: TextProps) => {
  const Comp = as ?? 'span';
  return (
    <Comp
      className={cn(
        TYPOGRAPHY[variant].className,
        numeric && 'font-mono tabular-nums',
        muted ? 'text-muted-foreground' : 'text-foreground',
        className
      )}
      {...props}
    />
  );
};
