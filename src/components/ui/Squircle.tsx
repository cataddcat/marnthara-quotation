// src/components/ui/Squircle.tsx
//
// Cross-browser squircle (continuous-curvature superellipse corner) — works on every engine
// incl. iOS Safari / Firefox, unlike native CSS `corner-shape` (Chromium-only as of 2026-06).
// figma-squircle generates the corner path math. Corner SIZE follows the element's computed
// `border-radius` (keep a `rounded-*` class as the size source → theme-token aware); SHAPE = superellipse.
//
// Two tools:
//   • <Squircle> — a control (button/div) whose surface is an SVG <path> drawn BEHIND content:
//     fill = surface, stroke = outline (Tailwind `fill-*`/`stroke-*` on the path, state-driven) +
//     optional drop-shadow (box-shadow can't trace a squircle). Use for buttons/inputs.
//   • useSquircleClip() (separate file) — a hook that applies `clip-path: path()` to an existing element,
//     clipping its bg + children (divide-y rows, images) to the squircle. Use for cards/surfaces.

import React, { forwardRef, useLayoutEffect, useRef, useState, type ElementType } from 'react';
import { getSvgPath } from 'figma-squircle';
import { cn } from '@/lib/utils';
import { useThemeStore } from '@/store/standalone/useThemeStore';

const DEFAULT_SMOOTHING = 0.6;

// ── <Squircle> control (behind mode) ─────────────────────────────────────────
interface SquircleProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** element to render (button default; div for non-interactive surfaces like Alert) */
  as?: 'button' | 'div';
  /** corner size px — defaults to the element's computed border-radius (theme-driven) */
  radius?: number;
  /** figma corner smoothing 0..1 (higher = flatter sides / more "Apple") */
  smoothing?: number;
  /** outline width px (0 = fill only / no border) */
  strokeWidth?: number;
  /** tailwind fill/stroke on the squircle path (+ group-hover/group-focus-within variants) */
  pathClassName?: string;
  /** drop-shadow utility so elevation follows the squircle (e.g. 'drop-shadow-sm') */
  shadowClassName?: string;
}

export const Squircle = forwardRef<HTMLButtonElement, SquircleProps>(function Squircle(
  {
    as = 'button',
    radius,
    smoothing = DEFAULT_SMOOTHING,
    strokeWidth = 1.5,
    pathClassName,
    shadowClassName,
    className,
    children,
    type,
    ...rest
  },
  forwardedRef
) {
  const innerRef = useRef<HTMLElement | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [autoRadius, setAutoRadius] = useState(0);
  // single store subscription (not a per-instance MutationObserver) → scales to many instances
  const theme = useThemeStore((s) => s.theme);

  const setRefs = (node: HTMLElement | null) => {
    innerRef.current = node;
    if (typeof forwardedRef === 'function') forwardedRef(node as HTMLButtonElement);
    else if (forwardedRef) forwardedRef.current = node as HTMLButtonElement;
  };

  useLayoutEffect(() => {
    const el = innerRef.current;
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
    return () => ro.disconnect();
    // `theme` → recompute the themed corner radius on theme switch
  }, [radius, theme]);

  const r = radius ?? autoRadius;
  const inset = strokeWidth / 2;
  // inset the path by half the stroke so the outline sits fully inside the box (not clipped)
  const path =
    size.w > 0 && size.h > 0
      ? getSvgPath({
          width: Math.max(size.w - strokeWidth, 0),
          height: Math.max(size.h - strokeWidth, 0),
          cornerRadius: Math.max(r - inset, 0),
          cornerSmoothing: smoothing,
        })
      : '';

  const Tag = as as ElementType;

  return (
    <Tag
      ref={setRefs}
      {...(as === 'button' ? { type: type ?? 'button' } : {})}
      className={cn('group relative isolate', className)}
      {...rest}
    >
      {path && (
        <svg
          className={cn(
            'pointer-events-none absolute inset-0 -z-10 h-full w-full overflow-visible transition-[filter]',
            shadowClassName
          )}
          viewBox={`0 0 ${size.w} ${size.h}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <g transform={`translate(${inset} ${inset})`}>
            {/* fill="none" fallback; pathClassName (CSS) overrides the presentation attribute */}
            <path
              d={path}
              fill="none"
              vectorEffect="non-scaling-stroke"
              strokeWidth={strokeWidth}
              className={cn('transition-[fill,stroke]', pathClassName)}
            />
          </g>
        </svg>
      )}
      {children}
    </Tag>
  );
});
