import { describe, it, expect } from 'vitest';
import { parseDimension, normalizeDimension } from './formatters';

describe('parseDimension — กฎ: ทศนิยม=เมตร · จำนวนเต็ม<10=เมตร · จำนวนเต็ม≥10=ซม.', () => {
  it('จำนวนเต็ม ≥10 = เซนติเมตร → หาร 100', () => {
    expect(parseDimension('236')).toEqual({
      value: '2.36',
      convertedFromCm: true,
      rawMeters: '236.00',
    });
    expect(parseDimension('50').value).toBe('0.50');
    expect(parseDimension('50').convertedFromCm).toBe(true);
  });

  it('จำนวนเต็ม <10 = เมตร (ไม่หาร)', () => {
    expect(parseDimension('6')).toEqual({
      value: '6.00',
      convertedFromCm: false,
      rawMeters: '6.00',
    });
    expect(parseDimension('9').value).toBe('9.00');
  });

  it('มีจุดทศนิยม = เมตรเสมอ แม้ค่า ≥10 (กันบั๊ก 12.5 → 0.13)', () => {
    expect(parseDimension('12.5')).toEqual({
      value: '12.50',
      convertedFromCm: false,
      rawMeters: '12.50',
    });
    expect(parseDimension('2.36').value).toBe('2.36');
    expect(parseDimension('2.36').convertedFromCm).toBe(false);
    expect(parseDimension('0.5').value).toBe('0.50');
  });

  it('rawMeters = ค่าที่พิมพ์ตีความเป็นเมตร (สำหรับปุ่มย้อนกลับ)', () => {
    // ป้อน 12 → แปลงเป็น 0.12 แต่ undo กลับเป็น 12.00 ม.
    expect(parseDimension('12')).toEqual({
      value: '0.12',
      convertedFromCm: true,
      rawMeters: '12.00',
    });
  });

  it('ล้างคอมม่า (หลักพัน) ก่อนคำนวณ', () => {
    expect(parseDimension('1,200').value).toBe('12.00'); // 1200 ซม. → 12 ม.
  });

  it('ค่าว่าง / จุดเดี่ยว → ว่าง', () => {
    expect(parseDimension('')).toEqual({ value: '', convertedFromCm: false, rawMeters: '' });
    expect(parseDimension('   ').value).toBe('');
    expect(parseDimension('.').value).toBe('');
  });

  it('ไม่ใช่ตัวเลข → คืนค่าเดิม ไม่แปลง', () => {
    expect(parseDimension('abc')).toEqual({
      value: 'abc',
      convertedFromCm: false,
      rawMeters: 'abc',
    });
  });
});

describe('normalizeDimension — wrapper คืนเฉพาะค่าเมตร', () => {
  it('เทียบเท่า parseDimension(...).value', () => {
    expect(normalizeDimension('236')).toBe('2.36');
    expect(normalizeDimension('12.5')).toBe('12.50');
    expect(normalizeDimension('6')).toBe('6.00');
    expect(normalizeDimension('')).toBe('');
  });
});
