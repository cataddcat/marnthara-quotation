import { describe, it, expect } from 'vitest';
import { parseDimension, normalizeDimension, bahttext, localDateISO } from './formatters';

describe('localDateISO — วันที่ท้องถิ่น (ไม่ใช่ UTC)', () => {
  it('รูปแบบ yyyy-mm-dd + pad ศูนย์', () => {
    expect(localDateISO(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(localDateISO(new Date(2026, 11, 31))).toBe('2026-12-31');
  });

  it('หลังเที่ยงคืนตามเวลาเครื่อง → ยังเป็นวันนี้ (toISOString ในไทยจะถอยเป็นเมื่อวาน)', () => {
    expect(localDateISO(new Date(2026, 5, 12, 1, 30))).toBe('2026-06-12');
  });

  it('ไม่ส่ง argument → คืนรูปแบบถูกต้อง', () => {
    expect(localDateISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

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

describe('bahttext — อ่านจำนวนเงินเป็นภาษาไทย', () => {
  it('เลขพื้นฐาน + เอ็ด/ยี่', () => {
    expect(bahttext(0)).toBe('ศูนย์บาทถ้วน');
    expect(bahttext(11)).toBe('สิบเอ็ดบาทถ้วน');
    expect(bahttext(21)).toBe('ยี่สิบเอ็ดบาทถ้วน');
    expect(bahttext(101)).toBe('หนึ่งร้อยเอ็ดบาทถ้วน');
    expect(bahttext(999999)).toBe('เก้าแสนเก้าหมื่นเก้าพันเก้าร้อยเก้าสิบเก้าบาทถ้วน');
  });

  it('สตางค์', () => {
    expect(bahttext(1.5)).toBe('หนึ่งบาทห้าสิบสตางค์');
    expect(bahttext(0.25)).toBe('ยี่สิบห้าสตางค์');
  });

  it('หลักล้าน', () => {
    expect(bahttext(1_000_000)).toBe('หนึ่งล้านบาทถ้วน');
    expect(bahttext(1_000_001)).toBe('หนึ่งล้านหนึ่งบาทถ้วน');
    expect(bahttext(2_500_000)).toBe('สองล้านห้าแสนบาทถ้วน');
  });

  it('≥ 10 ล้าน — เดิมพ่น "undefined" ในเอกสาร (recursive ล้าน)', () => {
    expect(bahttext(10_000_000)).toBe('สิบล้านบาทถ้วน');
    expect(bahttext(12_345_678)).toBe(
      'สิบสองล้านสามแสนสี่หมื่นห้าพันหกร้อยเจ็ดสิบแปดบาทถ้วน'
    );
    expect(bahttext(100_000_000)).toBe('หนึ่งร้อยล้านบาทถ้วน');
    expect(bahttext(1_000_000_000_000)).toBe('หนึ่งล้านล้านบาทถ้วน');
    expect(bahttext(25_000_000)).not.toContain('undefined');
  });
});
