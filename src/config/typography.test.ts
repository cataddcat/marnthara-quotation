// src/config/typography.test.ts
// กฎ type scale (DESIGN.md §1): floor 12px (เดิม) + CAP 18px (2026-06-11) —
// >18px = error, เน้นความสำคัญด้วยสี/พื้นหลัง/กรอบแทนขนาด

import { describe, it, expect } from 'vitest';
import {
  classifySizePx,
  CONTENT_MIN_PX,
  CONTENT_MAX_PX,
  BODY_MIN_PX,
  TYPOGRAPHY,
} from './typography';

describe('constants', () => {
  it('ขอบเขต scale: floor 12 · body 14 · cap 18', () => {
    expect(CONTENT_MIN_PX).toBe(12);
    expect(BODY_MIN_PX).toBe(14);
    expect(CONTENT_MAX_PX).toBe(18);
  });

  it('ทุก role อยู่ในกรอบ 12–18px และ Display = text-lg (18px)', () => {
    for (const spec of Object.values(TYPOGRAPHY)) {
      expect(spec.minPx).toBeGreaterThanOrEqual(CONTENT_MIN_PX);
      expect(spec.minPx).toBeLessThanOrEqual(CONTENT_MAX_PX);
    }
    expect(TYPOGRAPHY.display.className).toContain('text-lg');
    expect(TYPOGRAPHY.display.className).not.toMatch(/text-(xl|\dxl)/);
  });
});

describe('classifySizePx', () => {
  it('< 12px → error (ห้ามใช้กับเนื้อหา)', () => {
    expect(classifySizePx(9).status).toBe('error');
    expect(classifySizePx(10).status).toBe('error');
    expect(classifySizePx(11).status).toBe('error');
  });

  it('~12px → warn (Meta เท่านั้น)', () => {
    const v = classifySizePx(12);
    expect(v.status).toBe('warn');
    expect(v.roleHint).toBe('Meta');
  });

  it('13–15px → ok (Label / Body)', () => {
    expect(classifySizePx(13).status).toBe('ok');
    expect(classifySizePx(14).status).toBe('ok');
    expect(classifySizePx(15).status).toBe('ok');
  });

  it('16–18px → ok (Title / Body / Display)', () => {
    expect(classifySizePx(16).status).toBe('ok');
    expect(classifySizePx(17).status).toBe('ok');
    expect(classifySizePx(18).status).toBe('ok');
    // browser rounding headroom (e.g. 18.4 from rem→px)
    expect(classifySizePx(18.4).status).toBe('ok');
  });

  it('> 18px → error (เกินเพดาน — เน้นด้วยสี/พื้นหลัง/กรอบแทนขนาด)', () => {
    for (const px of [19, 20, 24, 30, 36]) {
      const v = classifySizePx(px);
      expect(v.status).toBe('error');
      expect(v.note).toContain('18px');
    }
  });

  it('ค่าอ่านไม่ได้ → warn', () => {
    expect(classifySizePx(NaN).status).toBe('warn');
    expect(classifySizePx(0).status).toBe('warn');
    expect(classifySizePx(-5).status).toBe('warn');
  });
});
