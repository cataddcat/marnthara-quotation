// src/features/shared/schemas.test.ts
// buildAreaItemSchema + reusable validators — ครอบ logic ที่ 5 features (blinds/partition/screen) ใช้ร่วมกัน

import { describe, it, expect } from 'vitest';
import {
  buildAreaItemSchema,
  positiveNumeric,
  optionalNumeric,
  requiredString,
} from './schemas';
import { ITEM_TYPES } from '@/config/enums';
import { makeAreaItem } from '@/test/factories';

const WoodenSchema = buildAreaItemSchema(ITEM_TYPES.WOODEN_BLIND);

const issuePaths = (result: ReturnType<typeof WoodenSchema.safeParse>): string[] =>
  result.success ? [] : result.error.issues.map((i) => i.path.join('.'));

describe('reusable validators', () => {
  describe('positiveNumeric', () => {
    it.each([['5'], [5], ['1,000'], [0.5]])('ค่า > 0 (%s) → valid', (val) => {
      expect(positiveNumeric.safeParse(val).success).toBe(true);
    });

    it.each([['0'], [0], ['-3'], ['abc'], ['']])('ค่า <= 0 / ไม่ใช่ตัวเลข (%s) → invalid', (val) => {
      expect(positiveNumeric.safeParse(val).success).toBe(false);
    });
  });

  describe('optionalNumeric', () => {
    it('undefined → valid', () => {
      expect(optionalNumeric.safeParse(undefined).success).toBe(true);
    });
    it('string/number → valid (ไม่ refine)', () => {
      expect(optionalNumeric.safeParse('0').success).toBe(true);
      expect(optionalNumeric.safeParse(-5).success).toBe(true);
    });
  });

  describe('requiredString', () => {
    it('ข้อความ trim แล้วไม่ว่าง → valid', () => {
      expect(requiredString.safeParse('  hi  ').success).toBe(true);
    });
    it('ช่องว่างล้วน → invalid', () => {
      expect(requiredString.safeParse('   ').success).toBe(false);
    });
  });
});

describe('buildAreaItemSchema', () => {
  it('happy path → valid + defaults', () => {
    const result = WoodenSchema.safeParse(makeAreaItem(ITEM_TYPES.WOODEN_BLIND));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe(ITEM_TYPES.WOODEN_BLIND);
      expect(result.data.enable_set_price).toBe(false);
      expect(result.data.set_price_override).toBe(0);
    }
  });

  it('width_m = "0" → invalid', () => {
    const result = WoodenSchema.safeParse(makeAreaItem(ITEM_TYPES.WOODEN_BLIND, { width_m: '0' }));
    expect(issuePaths(result)).toContain('width_m');
  });

  it('height_m ขาด → invalid', () => {
    const { height_m, ...rest } = makeAreaItem(ITEM_TYPES.WOODEN_BLIND);
    void height_m;
    const result = WoodenSchema.safeParse(rest);
    expect(issuePaths(result)).toContain('height_m');
  });

  it('ไม่ override ราคา + price_sqyd <= 0 → error ที่ price_sqyd', () => {
    const result = WoodenSchema.safeParse(
      makeAreaItem(ITEM_TYPES.WOODEN_BLIND, { price_sqyd: '0', enable_set_price: false })
    );
    expect(issuePaths(result)).toContain('price_sqyd');
  });

  it('enable_set_price = true → ข้ามการเช็ค price_sqyd', () => {
    const result = WoodenSchema.safeParse(
      makeAreaItem(ITEM_TYPES.WOODEN_BLIND, { price_sqyd: '0', enable_set_price: true })
    );
    expect(result.success).toBe(true);
  });

  it('price_sqyd default เป็น "" เมื่อ omit (แล้ว fail เพราะ <= 0)', () => {
    const { price_sqyd, ...rest } = makeAreaItem(ITEM_TYPES.WOODEN_BLIND);
    void price_sqyd;
    const result = WoodenSchema.safeParse(rest);
    expect(issuePaths(result)).toContain('price_sqyd');
  });

  it('type literal บังคับตรงกับ schema (partition ใส่ใน wooden schema → invalid)', () => {
    const result = WoodenSchema.safeParse(makeAreaItem(ITEM_TYPES.PARTITION));
    expect(issuePaths(result)).toContain('type');
  });
});
