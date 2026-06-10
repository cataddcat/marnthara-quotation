import { describe, it, expect } from 'vitest';
import { openingBucket, openingStyleLabel, OPENING_CENTER, OPENING_SIDE } from './opening-style';

describe('openingBucket — จัดทุก convention เข้า 3 ถัง', () => {
  it('ว่าง/undefined → none', () => {
    expect(openingBucket('')).toBe('none');
    expect(openingBucket(undefined)).toBe('none');
  });

  it('center: ไทย + โค้ด → center', () => {
    expect(openingBucket('center')).toBe('center');
    expect(openingBucket(OPENING_CENTER)).toBe('center'); // 'แยกกลาง'
  });

  it.each(['side', OPENING_SIDE, 'เก็บซ้าย', 'เก็บขวา'])('side/legacy "%s" → side', (v) => {
    expect(openingBucket(v)).toBe('side');
  });
});

describe('openingStyleLabel — ป้ายไทยเสมอ (แก้เคสโชว์ side/center อังกฤษ)', () => {
  it('โค้ด/legacy → ป้ายไทย canonical', () => {
    expect(openingStyleLabel('side')).toBe(OPENING_SIDE);
    expect(openingStyleLabel('center')).toBe(OPENING_CENTER);
    expect(openingStyleLabel('เก็บซ้าย')).toBe(OPENING_SIDE);
    expect(openingStyleLabel('เก็บขวา')).toBe(OPENING_SIDE);
  });

  it('ว่าง → คืน "" ', () => {
    expect(openingStyleLabel('')).toBe('');
    expect(openingStyleLabel(undefined)).toBe('');
  });
});
