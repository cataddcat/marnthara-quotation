// src/features/curtains/logic/CurtainStrategy.test.ts
// calculateFabricYardage (multiplier catalog + roman additive) + CurtainStrategy.calculate
// ค่าคาดหวังคำนวณจาก FORMULAS จริง: hem_offset=0.30, yard_conversion=0.90, roman_offset=0.45

import { describe, it, expect } from 'vitest';
import { CurtainStrategy, calculateFabricYardage } from './CurtainStrategy';
import { LAYER_MODES } from '@/config/enums';
import type { CurtainItemInput } from '@/types';

const asCurtain = (o: Record<string, unknown>): CurtainItemInput =>
  o as unknown as CurtainItemInput;

describe('calculateFabricYardage', () => {
  it('จีบ: width 1.0 → 3.34 หลา (1×2.7+0.3 = 3.0 /0.9)', () => {
    expect(calculateFabricYardage(1.0, 'จีบ')).toBeCloseTo(3.34, 2);
  });

  it('ตาไก่: multiplier_eyelet 2.7 → เท่าจีบ', () => {
    expect(calculateFabricYardage(1.0, 'ตาไก่')).toBeCloseTo(3.34, 2);
  });

  it('ลอน + button_spacing "14.5" → multiplier 2.7 (catalog hit)', () => {
    expect(calculateFabricYardage(2.0, 'ลอน', undefined, undefined, '14.5')).toBeCloseTo(6.34, 2);
  });

  it('ลอน + button_spacing "16" → multiplier 2.8 (catalog ลอนลึก)', () => {
    // 2×2.8+0.3 = 5.9 /0.9 = 6.555 → 6.56
    expect(calculateFabricYardage(2.0, 'ลอน', undefined, undefined, '16')).toBeCloseTo(6.56, 2);
  });

  it('ลอน + spacing ที่ไม่มีใน catalog → fallback multiplier_wave 2.7', () => {
    expect(calculateFabricYardage(2.0, 'ลอน', undefined, undefined, '99')).toBeCloseTo(6.34, 2);
  });

  it('พับ (Roman): สูตร additive 1×1.5+0.45 = 1.95 /0.9 → 2.17', () => {
    expect(calculateFabricYardage(1.0, 'พับ')).toBeCloseTo(2.17, 2);
  });

  it('width <= 0 → 0', () => {
    expect(calculateFabricYardage(0, 'จีบ')).toBe(0);
    expect(calculateFabricYardage(-5, 'จีบ')).toBe(0);
  });

  it('รับ formulasOverride แทนค่า compile-time', () => {
    const override = {
      curtain: {
        multiplier_pleated: 2.0,
        multiplier_eyelet: 2.0,
        multiplier_roman: 1.5,
        multiplier_wave: 2.0,
        roman_blind_offset: 0.45,
        hem_offset: 0,
        yard_conversion: 1.0,
        wave_spacings: [],
      },
    } as unknown as Parameters<typeof calculateFabricYardage>[3];
    // จีบ: 2×2.0+0 = 4.0 /1.0 = 4.00
    expect(calculateFabricYardage(2.0, 'จีบ', undefined, override)).toBeCloseTo(4.0, 2);
  });
});

describe('CurtainStrategy.calculate', () => {
  it('MAIN: total = width × price_per_m_raw + fabricYards ใน breakdown', () => {
    const r = CurtainStrategy.calculate(
      asCurtain({
        width_m: 2.0,
        height_m: 2.5,
        style: 'จีบ',
        layer_mode: LAYER_MODES.MAIN,
        price_per_m_raw: 100,
      })
    );
    expect(r.total).toBe(200);
    expect(r.breakdown?.fabricPrice).toBe(200);
    expect(r.breakdown?.sheerPrice).toBe(0);
    expect(r.breakdown?.fabricYards).toBeCloseTo(6.34, 2);
    expect(r.breakdown?.sheerYards).toBe(0);
  });

  it('SHEER: คิดเฉพาะผ้าโปร่ง (fabricPrice = 0)', () => {
    const r = CurtainStrategy.calculate(
      asCurtain({
        width_m: 2.0,
        height_m: 2.5,
        style: 'จีบ',
        layer_mode: LAYER_MODES.SHEER,
        sheer_price_per_m: 150,
      })
    );
    expect(r.total).toBe(300);
    expect(r.breakdown?.fabricPrice).toBe(0);
    expect(r.breakdown?.sheerPrice).toBe(300);
    expect(r.breakdown?.fabricYards).toBe(0);
    expect(r.breakdown?.sheerYards).toBeCloseTo(6.34, 2);
  });

  it('DOUBLE: รวมทึบ + โปร่ง + ทั้งสอง yards > 0', () => {
    const r = CurtainStrategy.calculate(
      asCurtain({
        width_m: 2.0,
        height_m: 2.5,
        style: 'จีบ',
        layer_mode: LAYER_MODES.DOUBLE,
        price_per_m_raw: 100,
        sheer_price_per_m: 150,
      })
    );
    expect(r.total).toBe(500);
    expect(r.breakdown?.fabricYards).toBeGreaterThan(0);
    expect(r.breakdown?.sheerYards).toBeGreaterThan(0);
  });

  it('ราคาเหมา (enable_set_price) override ทุกอย่าง', () => {
    const r = CurtainStrategy.calculate(
      asCurtain({
        width_m: 2.0,
        height_m: 2.5,
        style: 'ลอน',
        price_per_m_raw: 9999,
        enable_set_price: true,
        set_price_override: 888,
      })
    );
    expect(r.total).toBe(888);
  });

  it('set_price = 0 → ไม่ override (คำนวณปกติ)', () => {
    const r = CurtainStrategy.calculate(
      asCurtain({
        width_m: 2.0,
        height_m: 2.5,
        style: 'จีบ',
        layer_mode: LAYER_MODES.MAIN,
        price_per_m_raw: 100,
        enable_set_price: true,
        set_price_override: 0,
      })
    );
    expect(r.total).toBe(200);
  });

  it('width <= 0 → total 0', () => {
    const r = CurtainStrategy.calculate(
      asCurtain({ width_m: 0, height_m: 2.5, style: 'จีบ', price_per_m_raw: 100 })
    );
    expect(r.total).toBe(0);
  });
});

describe('CurtainStrategy.validate / getSpecs', () => {
  it('validate คืน error เมื่อ width/height/style ขาด', () => {
    const errors = CurtainStrategy.validate(asCurtain({ width_m: 0, height_m: 0, style: '' }));
    expect(errors).toHaveLength(3);
  });

  it('validate ผ่าน → []', () => {
    const errors = CurtainStrategy.validate(
      asCurtain({ width_m: 2, height_m: 2, style: 'จีบ' })
    );
    expect(errors).toEqual([]);
  });

  it('getSpecs ลอน → มีระยะลอน, DOUBLE → มี "ผ้าทึบ+โปร่ง"', () => {
    const specs = CurtainStrategy.getSpecs(
      asCurtain({
        width_m: 2,
        height_m: 2,
        style: 'ลอน',
        button_spacing: '14.5',
        layer_mode: LAYER_MODES.DOUBLE,
      })
    );
    expect(specs.join(' ')).toContain('ลอน 14.5');
    expect(specs).toContain('ผ้าทึบ+โปร่ง');
  });
});
