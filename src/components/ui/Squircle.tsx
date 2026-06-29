// src/components/ui/Squircle.tsx
//
// Cross-browser squircle (continuous-curvature superellipse corner) — works on every engine
// incl. iOS Safari / Firefox, unlike native CSS `corner-shape` (Chromium-only as of 2026-06).
//
// The shape is an inline SVG <path> drawn BEHIND the content (figma-squircle for the corner math).
// fill = surface · stroke = outline — both as Tailwind classes on the <path> (theme-/state-driven),
// so the old CSS `border` (which an SVG corner can't follow) moves into the SVG stroke.
//
// Corner SIZE follows the element's computed `border-radius` (keep a `rounded-*` class for the size
// source → stays theme-token-aware across all themes); SHAPE = the superellipse. Button-scoped for
// now (the StyleSection rollout); polymorphic/card variants can come later.

import React, { useLayoutEffect, useRef, useState } from 'react';
import { getSvgPath } from 'figma-squircle';
import { cn } from '@/lib/utils';

interface SquircleProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** corner size px — defaults to the element's computed border-radius (theme-driven) */
  radius?: number;
  /** figma corner smoothing 0..1 (higher = flatter sides / more "Apple") */
  smoothing?: number;
  /** outline width in px (0 = fill only) */
  strokeWidth?: number;
  /** tailwind fill/stroke on the squircle <path> (+ group-hover/group-focus-visible variants) */
  pathClassName?: string;
}

export const Squircle: React.FC<SquircleProps> = ({
  radius,
  smoothing = 0.6,
  strokeWidth = 1.5,
  pathClassName,
  className,
  children,
  type = 'button',
  ...rest
}) => {
  const ref = useRef<HTMLButtonElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [autoRadius, setAutoRadius] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      setSize({ w: rect.width, h: rect.height });
      if (radius == null) {
        const br = parseFloat(getComputedStyle(el).borderTopLeftRadius);
        setAutoRadius(Number.isFinite(br) ? br : 0);
      }
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    // theme switch swaps the themed --radius token → recompute corner size
    const mo = new MutationObserver(measure);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => {
      ro.disconnect();
      mo.disconnect();
    };
  }, [radius]);

  // inset the path by half the stroke so the outline sits fully inside the box (not clipped)
  const r = radius ?? autoRadius;
  const inset = strokeWidth / 2;
  const w = Math.max(size.w - strokeWidth, 0);
  const h = Math.max(size.h - strokeWidth, 0);
  const path =
    w > 0 && h > 0
      ? getSvgPath({
          width: w,
          height: h,
          cornerRadius: Math.max(r - inset, 0),
          cornerSmoothing: smoothing,
        })
      : '';

  return (
    <button ref={ref} type={type} className={cn('group relative isolate', className)} {...rest}>
      {path && (
        <svg
          className="pointer-events-none absolute inset-0 -z-10 h-full w-full overflow-visible"
          viewBox={`0 0 ${size.w} ${size.h}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <g transform={`translate(${inset} ${inset})`}>
            {/* fill="none" = fallback; pathClassName (CSS) overrides the presentation attribute */}
            <path
              d={path}
              fill="none"
              vectorEffect="non-scaling-stroke"
              strokeWidth={strokeWidth}
              className={pathClassName}
            />
          </g>
        </svg>
      )}
      {children}
    </button>
  );
};
