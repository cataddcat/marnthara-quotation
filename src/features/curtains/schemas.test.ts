// src/features/curtains/schemas.test.ts
// CurtainSchema — happy paths + edge cases (layer-mode rules, type coercion, rail rule)

import { describe, it, expect } from 'vitest';
import { CurtainSchema } from './schemas';
import { LAYER_MODES } from '@/config/enums';
import { makeCurtain, makeSheerCurtain, makeDoubleCurtain } from '@/test/factories';

/** helper: รวม path ของ issue ทั้งหมดเป็น array เพื่อ assert ได้ง่าย */
const issuePaths = (result: ReturnType<typeof CurtainSchema.safeParse>): string[] =>
  result.success ? [] : result.error.issues.map((i) => i.path.join('.'));

describe('CurtainSchema', () => {
  describe('happy paths', () => {
    it('ผ้าทึบ (MAIN) ครบ field → valid', () => {
      const result = CurtainSchema.safeParse(makeCurtain());
      expect(result.success).toBe(true);
    });

    it('ผ้าโปร่ง (SHEER) ครบ field → valid', () => {
      const result = CurtainSchema.safeParse(makeSheerCurtain());
      expect(result.success).toBe(true);
    });

    it('สองชั้น (DOUBLE) ครบทั้งทึบ+โปร่ง → valid', () => {
      const result = CurtainSchema.safeParse(makeDoubleCurtain());
      expect(result.success).toBe(true);
    });

    it('ใส่ default type/enable_set_price เมื่อไม่ระบุ', () => {
      const { type, enable_set_price, ...rest } = makeCurtain();
      void type;
      void enable_set_price;
      const result = CurtainSchema.safeParse(rest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('curtain');
        expect(result.data.enable_set_price).toBe(false);
        expect(result.data.set_price_override).toBe(0);
      }
    });
  });

  describe('dimension validation (numericString)', () => {
    it('width_m = "0" → invalid (ต้อง > 0)', () => {
      const result = CurtainSchema.safeParse(makeCurtain({ width_m: '0' }));
      expect(issuePaths(result)).toContain('width_m');
    });

    it('width_m = "abc" → invalid', () => {
      const result = CurtainSchema.safeParse(makeCurtain({ width_m: 'abc' }));
      expect(issuePaths(result)).toContain('width_m');
    });

    it('width_m = "" → invalid', () => {
      const result = CurtainSchema.safeParse(makeCurtain({ width_m: '' }));
      expect(issuePaths(result)).toContain('width_m');
    });

    it('width_m ที่มี comma "1,250" → coerce ผ่าน', () => {
      const result = CurtainSchema.safeParse(makeCurtain({ width_m: '1,250' }));
      expect(result.success).toBe(true);
    });

    it('height_m ขาด → invalid', () => {
      const { height_m, ...rest } = makeCurtain();
      void height_m;
      const result = CurtainSchema.safeParse(rest);
      expect(issuePaths(result)).toContain('height_m');
    });
  });

  describe('layer-mode rules (superRefine)', () => {
    it('MAIN แต่ไม่มี code → error ที่ code', () => {
      const result = CurtainSchema.safeParse(makeCurtain({ code: undefined }));
      expect(issuePaths(result)).toContain('code');
    });

    it('MAIN แต่ไม่มีราคาผ้า → error ที่ price_per_m_raw', () => {
      const result = CurtainSchema.safeParse(makeCurtain({ price_per_m_raw: 0 }));
      expect(issuePaths(result)).toContain('price_per_m_raw');
    });

    it('SHEER แต่ไม่มี sheer_code → error ที่ sheer_code', () => {
      const result = CurtainSchema.safeParse(makeSheerCurtain({ sheer_code: undefined }));
      expect(issuePaths(result)).toContain('sheer_code');
    });

    it('SHEER แต่ไม่มี sheer_price_per_m → error', () => {
      const result = CurtainSchema.safeParse(makeSheerCurtain({ sheer_price_per_m: 0 }));
      expect(issuePaths(result)).toContain('sheer_price_per_m');
    });

    it('DOUBLE ขาดราคาโปร่ง → error เฉพาะ sheer (ทึบยังครบ)', () => {
      const result = CurtainSchema.safeParse(makeDoubleCurtain({ sheer_price_per_m: 0 }));
      const paths = issuePaths(result);
      expect(paths).toContain('sheer_price_per_m');
      expect(paths).not.toContain('price_per_m_raw');
    });

    it('enable_set_price = true → ข้ามการเช็คราคาผ้า (ยังต้องมี code)', () => {
      const result = CurtainSchema.safeParse(
        makeCurtain({ enable_set_price: true, price_per_m_raw: 0 })
      );
      expect(result.success).toBe(true);
    });

    it('enable_set_price = true แต่ยังขาด code → ยัง error ที่ code', () => {
      const result = CurtainSchema.safeParse(
        makeCurtain({ enable_set_price: true, code: undefined, price_per_m_raw: 0 })
      );
      expect(issuePaths(result)).toContain('code');
    });
  });

  describe('rail rule (CURTAIN_STYLE_FEATURES)', () => {
    it('สไตล์ "จีบ" (hasRail) แต่ไม่เลือก rail_color → error', () => {
      const result = CurtainSchema.safeParse(makeCurtain({ rail_color: undefined }));
      expect(issuePaths(result)).toContain('rail_color');
    });

    it('สไตล์ "แป๊บ" (ไม่มีราง) ไม่ต้องใส่ rail_color → valid', () => {
      const result = CurtainSchema.safeParse(
        makeCurtain({ style: 'แป๊บ', rail_color: undefined })
      );
      expect(result.success).toBe(true);
    });
  });

  describe('enum / optional fields', () => {
    it('layer_mode นอก enum → invalid', () => {
      const result = CurtainSchema.safeParse(makeCurtain({ layer_mode: 'triple' }));
      expect(issuePaths(result)).toContain('layer_mode');
    });

    it('hook_type นอก enum → invalid', () => {
      const result = CurtainSchema.safeParse(makeCurtain({ hook_type: 'medium' }));
      expect(issuePaths(result)).toContain('hook_type');
    });

    it('รับ price_per_m_raw เป็น number ได้ (union string|number)', () => {
      const result = CurtainSchema.safeParse(makeCurtain({ price_per_m_raw: 420 }));
      expect(result.success).toBe(true);
    });

    it('button_spacing / eyelet_color เป็น optional → omit ได้', () => {
      const result = CurtainSchema.safeParse(
        makeCurtain({ layer_mode: LAYER_MODES.MAIN })
      );
      expect(result.success).toBe(true);
    });
  });
});
