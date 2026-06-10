// src/features/wallpapers/logic/WallpaperStrategy.test.ts
// strip method (rolls) + height_exceeds_roll warning + install cost + override
// FORMULAS.wallpaper: roll_width=0.53, roll_length=10, waste_margin=0.10

import { describe, it, expect } from 'vitest';
import { WallpaperStrategy } from './WallpaperStrategy';
import type { WallpaperItemInput } from '@/types';

const asWp = (o: Record<string, unknown>): WallpaperItemInput =>
  o as unknown as WallpaperItemInput;

describe('WallpaperStrategy.calculate', () => {
  it('1 ผนัง 2.0×2.5 → 2 ม้วน × 1000 = 2000', () => {
    // cut=2.6, strips/roll=floor(10/2.6)=3, need=ceil(2/0.53)=4, rolls=ceil(4/3)=2
    const r = WallpaperStrategy.calculate(
      asWp({ widths: ['2.0'], height_m: 2.5, price_per_roll: 1000 })
    );
    expect(r.total).toBe(2000);
    expect(r.breakdown?.rolls).toBe(2);
    expect(r.breakdown?.totalWidth).toBe(2.0);
    expect(r.warning).toBeUndefined();
  });

  it('หลายผนัง: width รวม 4.0 → 3 ม้วน', () => {
    // need=ceil(4/0.53)=8, rolls=ceil(8/3)=3 → 3000
    const r = WallpaperStrategy.calculate(
      asWp({ widths: ['2.0', '2.0'], height_m: 2.5, price_per_roll: 1000 })
    );
    expect(r.breakdown?.rolls).toBe(3);
    expect(r.total).toBe(3000);
  });

  it('install_cost_per_roll บวกค่าติดตั้งต่อม้วน', () => {
    // rolls 2 → material 2000 + labor 2×100 = 2200
    const r = WallpaperStrategy.calculate(
      asWp({ widths: ['2.0'], height_m: 2.5, price_per_roll: 1000, install_cost_per_roll: 100 })
    );
    expect(r.breakdown?.materialPrice).toBe(2000);
    expect(r.breakdown?.laborPrice).toBe(200);
    expect(r.total).toBe(2200);
  });

  it('ผนังสูงเกินม้วน (height 11) → warning + rolls 0 + total 0', () => {
    const r = WallpaperStrategy.calculate(
      asWp({ widths: ['2.0'], height_m: 11, price_per_roll: 1000 })
    );
    expect(r.warning).toBe('height_exceeds_roll');
    expect(r.breakdown?.rolls).toBe(0);
    expect(r.total).toBe(0);
  });

  it('ราคาเหมา override', () => {
    const r = WallpaperStrategy.calculate(
      asWp({
        widths: ['2.0'],
        height_m: 2.5,
        price_per_roll: 1000,
        enable_set_price: true,
        set_price_override: 1234,
      })
    );
    expect(r.total).toBe(1234);
  });

  it('ราคาเหมา override ใช้ได้แม้ยังไม่ใส่ขนาด (พฤติกรรมเดียวกับ curtain/area)', () => {
    const r = WallpaperStrategy.calculate(
      asWp({ widths: [], height_m: 0, enable_set_price: true, set_price_override: 999 })
    );
    expect(r.total).toBe(999);
  });

  it('width รวม 0 → total 0', () => {
    const r = WallpaperStrategy.calculate(asWp({ widths: ['0'], height_m: 2.5, price_per_roll: 1000 }));
    expect(r.total).toBe(0);
  });
});

describe('WallpaperStrategy.validate / getSpecs', () => {
  it('validate คืน error เมื่อ width/height/code ขาด', () => {
    const errors = WallpaperStrategy.validate(asWp({ widths: ['0'], height_m: 0, wallpaper_code: '' }));
    expect(errors).toHaveLength(3);
  });

  it('getSpecs มีจำนวนม้วนโดยประมาณ + รหัส', () => {
    const specs = WallpaperStrategy.getSpecs(
      asWp({ widths: ['2.0'], height_m: 2.5, wallpaper_code: 'WP01' })
    );
    expect(specs.join(' ')).toContain('WP01');
    expect(specs.join(' ')).toContain('ม้วน');
  });
});
