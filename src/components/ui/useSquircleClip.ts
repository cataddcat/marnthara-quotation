// src/components/ui/useSquircleClip.ts
//
// Clips an element's surface (bg + children: divide-y rows, images, fill-to-corner) to a squircle via
// `clip-path: path()` — cross-browser, no wrapper DOM, no divide-y conflict. For cards/surfaces.
// Keep the element's existing `rounded-*` (size source) + `border`/`bg`. Note: clip-path also clips
// box-shadow/ring, so don't use it on elevated/focus-ringed elements (those keep the <Squircle> path).

import { useLayoutEffect, useRef, type RefObject } from 'react';
import { getSvgPath } from 'figma-squircle';
import { useThemeStore } from '@/store/standalone/useThemeStore';

const DEFAULT_SMOOTHING = 0.6;

interface SquircleClipOptions {
  /** corner size px — defaults to the element's computed border-radius (theme-driven) */
  radius?: number;
  smoothing?: number;
  /** turn the clip off (e.g. flat/nested mode) without unmounting the hook */
  enabled?: boolean;
}

export function useSquircleClip<T extends HTMLElement = HTMLElement>({
  radius,
  smoothing = DEFAULT_SMOOTHING,
  enabled = true,
}: SquircleClipOptions = {}): RefObject<T | null> {
  const ref = useRef<T | null>(null);
  const theme = useThemeStore((s) => s.theme);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!enabled) {
      el.style.clipPath = '';
      return;
    }
    const apply = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const r = radius ?? (parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0);
      el.style.clipPath = `path('${getSvgPath({
        width: rect.width,
        height: rect.height,
        cornerRadius: r,
        cornerSmoothing: smoothing,
      })}')`;
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, [radius, smoothing, enabled, theme]);

  return ref;
}
