// src/features/wallpapers/schemas.test.ts
// WallpaperSchema — widths array, height numericString, code required

import { describe, it, expect } from 'vitest';
import { WallpaperSchema } from './schemas';
import { makeWallpaper } from '@/test/factories';

const issuePaths = (result: ReturnType<typeof WallpaperSchema.safeParse>): string[] =>
  result.success ? [] : result.error.issues.map((i) => i.path.join('.'));

describe('WallpaperSchema', () => {
  it('happy path → valid + default type', () => {
    const result = WallpaperSchema.safeParse(makeWallpaper());
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.type).toBe('wallpaper');
  });

  it('widths ว่าง (array ว่าง) → invalid', () => {
    const result = WallpaperSchema.safeParse(makeWallpaper({ widths: [] }));
    expect(issuePaths(result)).toContain('widths');
  });

  it('widths ขาด → invalid', () => {
    const { widths, ...rest } = makeWallpaper();
    void widths;
    const result = WallpaperSchema.safeParse(rest);
    expect(issuePaths(result)).toContain('widths');
  });

  it('หลายผนัง (widths หลายค่า) → valid', () => {
    const result = WallpaperSchema.safeParse(
      makeWallpaper({ widths: ['3.0', '2.5', '4.2'] })
    );
    expect(result.success).toBe(true);
  });

  it('height_m = "10.5" (string สูงเกิน roll) → schema ผ่าน (warning เป็นเรื่องของ strategy)', () => {
    const result = WallpaperSchema.safeParse(makeWallpaper({ height_m: '10.5' }));
    expect(result.success).toBe(true);
  });

  it('height_m = "0" → invalid', () => {
    const result = WallpaperSchema.safeParse(makeWallpaper({ height_m: '0' }));
    expect(issuePaths(result)).toContain('height_m');
  });

  it('wallpaper_code ว่าง → invalid', () => {
    const result = WallpaperSchema.safeParse(makeWallpaper({ wallpaper_code: '' }));
    expect(issuePaths(result)).toContain('wallpaper_code');
  });

  it('price_per_roll ต้องเป็น string (number → invalid)', () => {
    const result = WallpaperSchema.safeParse(makeWallpaper({ price_per_roll: 1200 }));
    expect(issuePaths(result)).toContain('price_per_roll');
  });

  it('install_cost_per_roll เป็น optional → omit ได้', () => {
    const { install_cost_per_roll, ...rest } = makeWallpaper();
    void install_cost_per_roll;
    const result = WallpaperSchema.safeParse(rest);
    expect(result.success).toBe(true);
  });

  it('is_suspended = true → valid', () => {
    const result = WallpaperSchema.safeParse(makeWallpaper({ is_suspended: true }));
    expect(result.success).toBe(true);
  });
});
