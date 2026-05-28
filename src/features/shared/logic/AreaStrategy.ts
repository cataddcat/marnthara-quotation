// src/features/shared/logic/AreaStrategy.ts

import { AreaItemInput } from '@/types';
import { toNum } from '@/utils/formatters';
import { PricingStrategy, PriceResult, PricingContext } from '@/lib/pricing/types';
import { FORMULAS } from '@/config/formulas';

interface AreaStrategyConfig {
  name: string; // ชื่อประเภทสินค้า (สำหรับ Debug)
  // ❌ ลบ minAreaSqyd ออกจาก config เพราะจะไปดึงจาก Store แทน
}

/**
 * Factory Function: สร้าง Strategy สำหรับสินค้าที่คิดเงินตามพื้นที่
 * รองรับ: มู่ลี่ไม้, ม่านม้วน, ม่านปรับแสง, ฉากกั้นห้อง, มุ้งจีบ
 */
export const createAreaStrategy = (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _config: AreaStrategyConfig
): PricingStrategy<AreaItemInput> => {
  
  return {
    /**
     * 1. Calculate: พื้นที่ (ตร.ม.) -> ตร.ล. -> ราคา
     */
    calculate: (item, context?: PricingContext): PriceResult => {
      // Priority 1: ราคาเหมา (Override Logic)
      if (item.enable_set_price && toNum(item.set_price_override) > 0) {
        return { total: toNum(item.set_price_override) };
      }

      const width = toNum(item.width_m);
      const height = toNum(item.height_m);
      const priceSqyd = toNum(item.price_sqyd);

      // Safety Check
      if (width <= 0 || height <= 0) {
        return { total: 0, breakdown: {} };
      }

      // Use injected formulas (test/worker) or compile-time FORMULAS
      const formulas = context?.formulas ?? FORMULAS;
      const formulaConfig = formulas.area;

      // 1. คำนวณพื้นที่จริง (ตร.ม.)
      const areaSqm = width * height;

      // 2. แปลงเป็น ตร.ล.
      let areaSqyd = areaSqm * formulaConfig.sqm_to_sqyd;

      // 3. ปัดขั้นต่ำ (Minimum Yield) — ป้องกัน micro-orders
      if (areaSqyd < formulaConfig.min_yield) {
        areaSqyd = formulaConfig.min_yield;
      }

      // 4. คำนวณราคารวม
      let total = areaSqyd * priceSqyd;

      // 5. ปัดเศษ 2 ตำแหน่ง (Standard Rounding)
      total = Math.round(total * 100) / 100;

      return {
        total,
        breakdown: {
          areaSqm,
          areaSqyd, // ส่งค่า ตร.ล. ที่ใช้คำนวณเงินกลับไปแสดงผล
          pricePerUnit: priceSqyd,
        },
      };
    },

    /**
     * 2. Validate
     */
    validate: (item): string[] => {
      const errors: string[] = [];
      if (toNum(item.width_m) <= 0) errors.push('ระบุความกว้าง');
      if (toNum(item.height_m) <= 0) errors.push('ระบุความสูง');

      // ถ้าไม่ได้เหมาจ่าย ต้องมีราคาต่อหน่วย
      if (!item.enable_set_price && toNum(item.price_sqyd) <= 0) {
        errors.push('ระบุราคาต่อ ตร.ล.');
      }

      return errors;
    },

    /**
     * 3. Get Specs
     */
    getSpecs: (item): string[] => {
      const specs = [`ขนาด: ${item.width_m} x ${item.height_m} ม.`];
      if (item.code) specs.push(`รหัส: ${item.code}`);
      
      // Spec เฉพาะทาง
      if (item.fabric_variant) specs.push(`รุ่น/สี: ${item.fabric_variant}`);
      if (item.adjustment_side) specs.push(`ปรับ: ${item.adjustment_side}`);
      
      return specs;
    },
  };
};