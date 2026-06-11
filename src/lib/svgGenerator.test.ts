// src/lib/svgGenerator.test.ts
// Semantic drawing output — style, opening direction, cord side, dimension labels.

import { describe, it, expect } from 'vitest';
import { generateItemVisualSvg } from './svgGenerator';
import { ITEM_TYPES } from '@/config/enums';
import { asItemData, makeCurtain, makeAreaItem, makeWallpaper, makeRemoval } from '@/test/factories';

/** x of the first accent-filled circle (= cord/chain top bead). accent = blue-700 (ทะเบียน §2.1) */
const cordX = (svg: string): number | null => {
  const m = svg.match(/<circle cx="([\d.]+)"[^>]*fill="#1d4ed8"/);
  return m ? parseFloat(m[1]) : null;
};

describe('generateItemVisualSvg — semantic drawings', () => {
  it('returns an <svg> with W×H dimension labels', () => {
    const s = generateItemVisualSvg(asItemData(makeCurtain({ width_m: '2.5', height_m: '2.8' })));
    expect(s.startsWith('<svg')).toBe(true);
    expect(s).toContain('2.50 ม.');
    expect(s).toContain('2.80 ม.');
  });

  it('curtain opening (Thai values): แยกกลาง → outward arrows; เก็บซ้าย/เก็บขวา → single arrow', () => {
    const center = generateItemVisualSvg(
      asItemData(makeCurtain({ style: 'จีบ', opening_style: 'แยกกลาง' }))
    );
    const left = generateItemVisualSvg(
      asItemData(makeCurtain({ style: 'จีบ', opening_style: 'เก็บซ้าย' }))
    );
    const right = generateItemVisualSvg(
      asItemData(makeCurtain({ style: 'จีบ', opening_style: 'เก็บขวา' }))
    );
    expect(center).toContain('data-open="center"');
    expect(left).toContain('data-open="side-left"');
    expect(right).toContain('data-open="side-right"');
  });

  it('curtain style decor: ตาไก่ → grommets, ลอน → ripplefold path', () => {
    const eyelet = generateItemVisualSvg(
      asItemData(makeCurtain({ style: 'ตาไก่', opening_style: 'center' }))
    );
    const wave = generateItemVisualSvg(
      asItemData(makeCurtain({ style: 'ลอน', opening_style: 'center' }))
    );
    expect(eyelet).toContain('<circle');
    expect(wave).toContain('q 5,-4 10,0');
  });

  it('พับ (roman): no opening indicator, chain cord on chain_position side', () => {
    const left = generateItemVisualSvg(
      asItemData(makeCurtain({ style: 'พับ', chain_position: 'left' }))
    );
    const right = generateItemVisualSvg(
      asItemData(makeCurtain({ style: 'พับ', chain_position: 'right' }))
    );
    expect(left).not.toContain('data-open');
    const lx = cordX(left);
    const rx = cordX(right);
    expect(lx).not.toBeNull();
    expect(rx).not.toBeNull();
    expect(lx as number).toBeLessThan(rx as number);
  });

  it('wooden blind: cord side from adjustment_side (ซ้าย left, ขวา right)', () => {
    const left = generateItemVisualSvg(
      asItemData(makeAreaItem(ITEM_TYPES.WOODEN_BLIND, { adjustment_side: 'ซ้าย' }))
    );
    const right = generateItemVisualSvg(
      asItemData(makeAreaItem(ITEM_TYPES.WOODEN_BLIND, { adjustment_side: 'ขวา' }))
    );
    const lx = cordX(left);
    const rx = cordX(right);
    expect(lx).not.toBeNull();
    expect(rx).not.toBeNull();
    expect(lx as number).toBeLessThan(rx as number);
  });

  it('wallpaper: width label uses the sum of wall widths', () => {
    const s = generateItemVisualSvg(
      asItemData(makeWallpaper({ widths: ['3.0', '2.5'], height_m: '2.8' }))
    );
    expect(s).toContain('5.50 ม.'); // 3.0 + 2.5
  });

  it('removal → neutral fallback (no dimension labels)', () => {
    const s = generateItemVisualSvg(asItemData(makeRemoval()));
    expect(s).toContain('<svg');
    expect(s).not.toContain('ม.');
  });

  it('missing size → "ไม่มีขนาด"', () => {
    const s = generateItemVisualSvg(asItemData(makeCurtain({ width_m: '0', height_m: '0' })));
    expect(s).toContain('ไม่มีขนาด');
  });
});
