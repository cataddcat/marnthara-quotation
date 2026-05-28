// src/lib/pricing/PricingEngine.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { PricingEngine } from './PricingEngine';
import { useAppStore } from '@/store/useAppStore';
import { ITEM_TYPES, LAYER_MODES } from '@/config/enums';

// 🛠️ Helper: Reset Store before each test
const resetStore = () => {
  useAppStore.setState({
    formulas: {
      curtain: {
        multiplier_wave: 2.50, // 🧪 Mock: ตั้งค่าตัวคูณเป็น 2.5 เพื่อคำนวณง่ายๆ (ปกติ 2.7)
        multiplier_pleated: 2.50,
        multiplier_eyelet: 2.50,
        multiplier_roman: 1.50, // Not used in addictive logic but kept for struct
        roman_blind_offset: 0.20, // 🧪 Mock: เผื่อเย็บม่านพับ 20 cm
        hem_offset: 0.10,
        yard_conversion: 1.10, // 🧪 Mock: แปลงหลา 1.10 (ไม่ใช่ 0.90 เพื่อ Test logic)
      },
      wallpaper: {
        roll_width: 0.50, // 🧪 Mock: หน้ากว้าง 0.5 ม.
        roll_length: 10.0, // ยาว 10 ม.
        waste_margin: 0.0, // ไม่เผื่อเสีย (เพื่อเทสการหารลงตัว)
      },
      area: {
        sqm_to_sqyd: 1.2,
        min_yield: 1.0,
      },
    },
    // Mock Costs (Vault)
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
      // Setup
      // กว้าง 2.00 ม. x สูง 2.50 ม.
      // ตัวคูณ (Mock) = 2.5
      // สูตร: (2.00 * 2.5) = 5.00 เมตร (ผ้าที่ใช้)
      // ราคา: 5.00 เมตร * 100 บาท = 500 บาท
      const input: any = {
        type: ITEM_TYPES.CURTAIN,
        width_m: 2.0,
        height_m: 2.5,
        style: 'ลอน',
        layer_mode: LAYER_MODES.MAIN,
        price_per_m_raw: 100, // ราคาขาย 100 บาท/เมตร
        fabric_variant: 'ทึบ',
        id: 'test-curtain-1',
      };

      const result = PricingEngine.calculateDetailedPrice(input);

      expect(result.breakdown?.fabricMeters).toBeCloseTo(5.00, 2); // เช็คปริมาณผ้า
      expect(result.breakdown?.fabricPrice).toBe(500); // เช็คราคาผ้า
      expect(result.total).toBe(500); // เช็คราคารวม
    });

    it('Scenario: ม่านพับ (Roman) - ควรใช้สูตรบวกเพิ่ม (Additive) ไม่ใช่ตัวคูณ', () => {
      // Setup
      // กว้าง 1.00 ม.
      // เผื่อเย็บ (Mock) = 0.20 ม.
      // ผ้าที่ใช้ = 1.00 + 0.20 = 1.20 เมตร
      // ราคา = 1.20 * 500 = 600 บาท
      const input: any = {
        type: ITEM_TYPES.CURTAIN,
        width_m: 1.0,
        height_m: 2.0,
        style: 'พับ',
        layer_mode: LAYER_MODES.MAIN,
        price_per_m_raw: 500,
        id: 'test-curtain-roman',
      };

      const result = PricingEngine.calculateDetailedPrice(input);

      expect(result.breakdown?.fabricMeters).toBeCloseTo(1.20, 2);
      expect(result.total).toBe(600);
    });

    it('Scenario: ราคาเหมา (Set Price) - ต้อง Override ราคาทุกอย่าง', () => {
      const input: any = {
        type: ITEM_TYPES.CURTAIN,
        width_m: 2.0,
        height_m: 2.5,
        style: 'ลอน',
        price_per_m_raw: 1000, // ถ้าระบบปกติจะเป็น 5000+
        enable_set_price: true,
        set_price_override: 999, // บังคับราคา
        id: 'test-override',
      };

      const total = PricingEngine.calculatePrice(input);
      expect(total).toBe(999);
    });
  });

  // ----------------------------------------------------------------
  // 📜 TEST SUITE 2: WALLPAPERS (วอลเปเปอร์)
  // ----------------------------------------------------------------
  describe('Feature: Wallpaper Calculation', () => {
    
    it('Scenario: คำนวณจำนวนม้วนถูกต้อง (กรณีลงตัว)', () => {
      // Setup
      // ผนังสูง 2.5 ม. (Mock ไม่เผื่อเสีย)
      // ม้วนยาว 10 ม. -> 1 ม้วนตัดได้ 4 แผ่น (10 / 2.5)
      // ผนังกว้าง 2.0 ม. (หน้ากว้างวอลล์ 0.5) -> ต้องใช้ 4 แผ่น
      // สรุป: ใช้ 4 แผ่น / (4 แผ่นต่อม้วน) = 1 ม้วนพอดี
      const input: any = {
        type: ITEM_TYPES.WALLPAPER,
        widths: ['2.0'], // กว้างรวม 2.0
        height_m: 2.5,
        price_per_roll: 1000,
        wallpaper_code: 'W001',
        id: 'test-wall-1',
      };

      const result = PricingEngine.calculateDetailedPrice(input);
      // เช็คใน breakdown (คุณอาจต้องแก้ WallpaperStrategy ให้ return 'rolls' ใน breakdown ด้วยถ้ายังไม่ได้ทำ)
      // แต่เราเช็ค Total ได้: 1 ม้วน * 1000 = 1000
      expect(result.total).toBe(1000); 
    });

    it('Scenario: คำนวณจำนวนม้วนถูกต้อง (กรณีมีเศษต้องขึ้นม้วนใหม่)', () => {
      // Setup เหมือนข้อบน แต่กว้าง 2.1 ม.
      // หน้ากว้าง 0.5 -> ต้องใช้ 4.2 แผ่น -> ปัดเป็น 5 แผ่น
      // 1 ม้วนตัดได้ 4 แผ่น -> ต้องใช้ 2 ม้วน
      // ราคา = 2 * 1000 = 2000
      const input: any = {
        type: ITEM_TYPES.WALLPAPER,
        widths: ['2.1'],
        height_m: 2.5,
        price_per_roll: 1000,
        wallpaper_code: 'W002',
        id: 'test-wall-2',
      };

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
       const input: any = {
         type: ITEM_TYPES.WOODEN_BLIND,
         width_m: 0.5,
         height_m: 0.5,
         price_sqyd: 500,
         id: 'test-blind-min',
       };

       const total = PricingEngine.calculatePrice(input);
       expect(total).toBe(500);
    });

    it('Scenario: คำนวณตามพื้นที่จริง (มากกว่าขั้นต่ำ)', () => {
        // กว้าง 2.0 x สูง 2.0 = 4.0 ตร.ม.
        // * 1.2 = 4.8 ตร.ล.
        // ราคา 1000 -> 4800
        const input: any = {
            type: ITEM_TYPES.WOODEN_BLIND,
            width_m: 2.0,
            height_m: 2.0,
            price_sqyd: 1000,
            id: 'test-blind-real',
          };
   
          const total = PricingEngine.calculatePrice(input);
          expect(total).toBe(4800);
    });
  });

});