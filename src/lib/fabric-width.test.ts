// src/lib/fabric-width.test.ts
// กติกาหน้าผ้า: 2.8/3.2/3.4 ม. − เผื่อเย็บ 0.30 = ความสูงตัดเย็บสูงสุด; เกิน 3.10 → หมุนผ้า 90°

import { describe, it, expect } from 'vitest';
import { fabricWidthAdvice, maxCutHeight } from './fabric-width';

describe('maxCutHeight — หน้าผ้า − เผื่อเย็บ 30 ซม.', () => {
  it('ตัวเลขตามที่เจ้าของร้านยืนยัน', () => {
    expect(maxCutHeight(2.8)).toBe(2.5); // หน้า 2.8 → สูงสุด ~2.50
    expect(maxCutHeight(3.4)).toBe(3.1); // หน้า 3.4 → สูงสุด ~3.10
  });
});

describe('fabricWidthAdvice', () => {
  it('ยังไม่ใส่ความสูง → none', () => {
    expect(fabricWidthAdvice(0).kind).toBe('none');
    expect(fabricWidthAdvice(-1).kind).toBe('none');
  });

  it('สูง 2.40 → หน้า 2.8 พอ', () => {
    const a = fabricWidthAdvice(2.4);
    expect(a.kind).toBe('ok');
    expect(a.recommendedWidth).toBe(2.8);
  });

  it('สูง 2.50 พอดีขอบ → หน้า 2.8 ยังตัดได้', () => {
    expect(fabricWidthAdvice(2.5).recommendedWidth).toBe(2.8);
  });

  it('สูง 2.60 → ข้ามไปหน้า 3.2', () => {
    expect(fabricWidthAdvice(2.6).recommendedWidth).toBe(3.2);
  });

  it('สูง 3.00 → หน้า 3.4', () => {
    expect(fabricWidthAdvice(3.0).recommendedWidth).toBe(3.4);
  });

  it('สูง 3.20 เกินทุกหน้า → rotate (หมุนผ้า 90° ต่อด้านข้าง)', () => {
    const a = fabricWidthAdvice(3.2);
    expect(a.kind).toBe('rotate');
    expect(a.message).toContain('หมุนผ้า 90°');
  });
});
