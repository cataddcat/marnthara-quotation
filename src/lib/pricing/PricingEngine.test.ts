// src/lib/pricing/PricingEngine.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { PricingEngine } from './PricingEngine';
import { useAppStore } from '@/store/useAppStore';
import { ITEM_TYPES, LAYER_MODES } from '@/config/enums';
import { makeItem } from './__test-helpers';

// 🛠️ Helper: Reset Store before each test
// formulas เป็น compile-time const ใน src/config/formulas.ts → expected values
// คำนวณจากค่าจริง (ไม่ mock อีก)
const resetStore = () => {
  useAppStore.setState({
    fabricCosts: {},
  });
};

describe('💰 Pricing Engine Core Tests', () => {
  
  beforeEach(() => {
    resetStore();
  });

  // ----------------------------------------------------------------
  // 🧵 TEST SUITE 1: CURTAINS (ผ้าม่าน)
  // ----------------------------------------------------------------
  describe('Feature: Curtain Calculation', () => {
    
    it('Scenario: ม่านลอน (Wave) - ควรใช้ตัวคูณคำนวณผ้าถูกต้อง', () => {
      // FORMULAS.curtain: hem_offset=0.30, yard_conversion=0.90
      // wave_spacings[0] = { spacing: '14.5', multiplier: 2.7 } (default)
      // กว้าง 2.00 ม., style='ลอน' → multiplier 2.7
      // totalMeters = 2.0 × 2.7 + 0.30 = 5.70
      // fabricYards = ceil(5.70/0.90 × 100)/100 = 6.34
      // ราคาขาย (semantic): width × pricePerUnit = 2.0 × 100 = 200
      const input = makeItem({
        type: ITEM_TYPES.CURTAIN,
        width_m: 2.0,
        height_m: 2.5,
        style: 'ลอน',
        layer_mode: LAYER_MODES.MAIN,
        price_per_m_raw: 100,
        fabric_variant: 'ทึบ',
        id: 'test-curtain-1',
      });

      const result = PricingEngine.calculateDetailedPrice(input);

      expect(result.breakdown?.fabricYards).toBeCloseTo(6.34, 2);
      expect(result.breakdown?.fabricMeters).toBe(2.0); // = width (semantic)
      expect(result.breakdown?.fabricPrice).toBe(200); // = width × price
      expect(result.total).toBe(200);
    });

    it('Scenario: ม่านพับ (Roman) - ควรใช้สูตรบวกเพิ่ม (Additive) ไม่ใช่ตัวคูณ', () => {
      // FORMULAS.curtain: multiplier_roman=1.5, roman_blind_offset=0.45, yard_conversion=0.90
      // กว้าง 1.00 ม., style='พับ' → ใช้สูตร additive
      // meters = 1.0 × 1.5 + 0.45 = 1.95
      // fabricYards = ceil(1.95/0.90 × 100)/100 = 2.17
      const input = makeItem({
        type: ITEM_TYPES.CURTAIN,
        width_m: 1.0,
        height_m: 2.0,
        style: 'พับ',
        layer_mode: LAYER_MODES.MAIN,
        price_per_m_raw: 500,
        id: 'test-curtain-roman',
      });

      const result = PricingEngine.calculateDetailedPrice(input);

      expect(result.breakdown?.fabricYards).toBeCloseTo(2.17, 2);
      expect(result.total).toBe(500); // = width × price (semantic)
    });

    it('Scenario: ราคาเหมา (Set Price) - ต้อง Override ราคาทุกอย่าง', () => {
      const input = makeItem({
        type: ITEM_TYPES.CURTAIN,
        width_m: 2.0,
        height_m: 2.5,
        style: 'ลอน',
        price_per_m_raw: 1000, // ถ้าระบบปกติจะเป็น 5000+
        enable_set_price: true,
        set_price_override: 999, // บังคับราคา
        id: 'test-override',
      });

      const total = PricingEngine.calculatePrice(input);
      expect(total).toBe(999);
    });
  });

  // ----------------------------------------------------------------
  // 📜 TEST SUITE 2: WALLPAPERS (วอลเปเปอร์)
  // ----------------------------------------------------------------
  describe('Feature: Wallpaper Calculation', () => {
    
    it('Scenario: คำนวณจำนวนม้วน (ใช้ FORMULAS จริง)', () => {
      // FORMULAS.wallpaper: roll_width=0.53, roll_length=10, waste_margin=0.10
      // input: widths=['2.0'], height=2.5
      //   cutLength = 2.5 + 0.10 = 2.60
      //   stripsPerRoll = floor(10/2.60) = 3
      //   totalStripsNeeded = ceil(2.0/0.53) = 4
      //   rolls = ceil(4/3) = 2
      //   total = 2 × 1000 = 2000
      const input = makeItem({
        type: ITEM_TYPES.WALLPAPER,
        widths: ['2.0'],
        height_m: 2.5,
        price_per_roll: 1000,
        wallpaper_code: 'W001',
        id: 'test-wall-1',
      });

      const result = PricingEngine.calculateDetailedPrice(input);
      expect(result.total).toBe(2000);
    });

    it('Scenario: คำนวณจำนวนม้วนถูกต้อง (กรณีมีเศษต้องขึ้นม้วนใหม่)', () => {
      // Setup เหมือนข้อบน แต่กว้าง 2.1 ม.
      // หน้ากว้าง 0.5 -> ต้องใช้ 4.2 แผ่น -> ปัดเป็น 5 แผ่น
      // 1 ม้วนตัดได้ 4 แผ่น -> ต้องใช้ 2 ม้วน
      // ราคา = 2 * 1000 = 2000
      const input = makeItem({
        type: ITEM_TYPES.WALLPAPER,
        widths: ['2.1'],
        height_m: 2.5,
        price_per_roll: 1000,
        wallpaper_code: 'W002',
        id: 'test-wall-2',
      });

      const result = PricingEngine.calculateDetailedPrice(input);
      expect(result.total).toBe(2000);
    });
  });

  // ----------------------------------------------------------------
  // 📐 TEST SUITE 3: AREA & BLINDS (มู่ลี่/พื้นที่)
  // ----------------------------------------------------------------
  describe('Feature: Blinds/Area Calculation', () => {
    
    it('Scenario: คำนวณตามพื้นที่ตารางหลา (Minimum Yield)', () => {
       // Setup: Minimum Yield = 1.00 ตร.ล.
       // กว้าง 0.5 x สูง 0.5 = 0.25 ตร.ม. 
       // แปลงเป็น ตร.ล. (Mock * 1.2) = 0.3 ตร.ล.
       // ต่ำกว่าขั้นต่ำ -> ต้องคิด 1.00 ตร.ล.
       // ราคา 500 บาท/ตร.ล. -> Total 500
       const input = makeItem({
         type: ITEM_TYPES.WOODEN_BLIND,
         width_m: 0.5,
         height_m: 0.5,
         price_sqyd: 500,
         id: 'test-blind-min',
       });

       const total = PricingEngine.calculatePrice(input);
       expect(total).toBe(500);
    });

    it('Scenario: คำนวณตามพื้นที่จริง (มากกว่าขั้นต่ำ)', () => {
        // กว้าง 2.0 x สูง 2.0 = 4.0 ตร.ม.
        // * 1.2 = 4.8 ตร.ล.
        // ราคา 1000 -> 4800
        const input = makeItem({
            type: ITEM_TYPES.WOODEN_BLIND,
            width_m: 2.0,
            height_m: 2.0,
            price_sqyd: 1000,
            id: 'test-blind-real',
          });
   
          const total = PricingEngine.calculatePrice(input);
          expect(total).toBe(4800);
    });
  });

});