// src/config/railProducts.test.ts
// แมปสี → รหัสสินค้าราง (THONG DECOR) + ตัวสร้างชื่อสินค้า color-aware

import { describe, it, expect } from 'vitest';
import { RAIL_COLORS, RAIL_COLOR_CODE, railProductName } from './railProducts';

describe('RAIL_COLORS / RAIL_COLOR_CODE', () => {
  it('มี 6 สี เรียงตามรหัส 01–06', () => {
    expect(RAIL_COLORS.map((c) => c.value)).toEqual([
      'ขาว',
      'ดำ',
      'ไม้สัก',
      'เมเปิ้ล',
      'ไม้แดง',
      'เงินเทา',
    ]);
  });

  it('ทุกสีมีรหัส 2 หลัก 01–06 ไม่ซ้ำ', () => {
    const codes = RAIL_COLORS.map((c) => RAIL_COLOR_CODE[c.value]);
    expect(codes).toEqual(['01', '02', '03', '04', '05', '06']);
    expect(new Set(codes).size).toBe(6);
  });
});

describe('railProductName — wave (เทปลอน → TES)', () => {
  it('ไม้สัก → TES103 ( TW14.5 )...สีไม้สัก', () => {
    expect(railProductName('rail_wave', 'ไม้สัก')).toBe(
      'TES103 ( TW14.5 )รางเทปลอน เทป14.5 สีไม้สัก'
    );
  });

  it('ขาว → TES101 / เงินเทา → TES106', () => {
    expect(railProductName('rail_wave', 'ขาว')).toBe(
      'TES101 ( TW14.5 )รางเทปลอน เทป14.5 สีขาว'
    );
    expect(railProductName('rail_wave', 'เงินเทา')).toBe(
      'TES106 ( TW14.5 )รางเทปลอน เทป14.5 สีเงินเทา'
    );
  });
});

describe('railProductName — pleated (จีบ → LTL)', () => {
  it('ไม้สัก → LTL103 ราง M ประกอบชุด สีไม้สัก', () => {
    expect(railProductName('rail_pleated', 'ไม้สัก')).toBe('LTL103 ราง M ประกอบชุด สีไม้สัก');
  });
});

describe('railProductName — fallback', () => {
  it('roman → ชื่อคงที่ U-2 (ไม่ขึ้นกับสี)', () => {
    expect(railProductName('rail_roman', undefined)).toBe('U-2 รางม่านพับ U-2');
    expect(railProductName('rail_roman', 'ไม้สัก')).toBe('U-2 รางม่านพับ U-2');
  });

  it('สีว่าง → null (ให้ผู้เรียก fallback ป้ายทั่วไป)', () => {
    expect(railProductName('rail_wave', undefined)).toBeNull();
    expect(railProductName('rail_pleated', '  ')).toBeNull();
  });

  it('สี custom (ไม่อยู่ในแมป) → ระบุชื่อตระกูล + สี (ไม่มีรหัส)', () => {
    expect(railProductName('rail_wave', 'ทอง')).toBe('รางเทปลอน ( TW14.5 ) สีทอง');
    expect(railProductName('rail_pleated', 'ทอง')).toBe('ราง M ประกอบชุด สีทอง');
  });

  it('ชนิดรางอื่น (eyelet/rod/louis) → null', () => {
    expect(railProductName('rail_eyelet', 'ขาว')).toBeNull();
    expect(railProductName('rail_rod', 'ดำ')).toBeNull();
  });
});
