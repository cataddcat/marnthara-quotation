// src/features/curtains/logic/CurtainStrategy.ts

import { CurtainItemInput } from '@/types';
import { toNum, nonNeg } from '@/utils/formatters';
import { PricingStrategy, PriceResult, PricingContext } from '@/lib/pricing/types';
import { LAYER_MODES } from '@/config/enums';
import { STYLES_WITHOUT_OPENING } from '@/config/constants';
import { FORMULAS, type FormulaConfig } from '@/config/formulas';

// ----------------------------------------------------------------------
// 🧠 HELPER: คำนวณปริมาณผ้าที่ต้องสั่ง (Production Usage)
// Logic: (กว้าง x ตัวคูณ) + 0.30 Safe Standard -> แปลงหลา -> ปัดเศษ
// * ใช้สำหรับคำนวณ 'ต้นทุน' (Cost) เท่านั้น ไม่เกี่ยวกับราคาขายหน้าบิล
// ----------------------------------------------------------------------
export const calculateFabricYardage = (
  width_m: number,
  style: string,
  _opening_style?: string,
  formulasOverride?: FormulaConfig,
  button_spacing?: string // ระยะกระดุมสำหรับม่านลอน
): number => {
  if (width_m <= 0) return 0;

  // Use injected formulas (for testing/worker) or fall back to compile-time FORMULAS
  const formulas = formulasOverride ?? FORMULAS;
  const config = formulas.curtain;

  // 1. เลือกตัวคูณ (Multiplier) ตาม style
  let multiplier = config.multiplier_pleated;
  if (style === 'ลอน') {
    // ลอน: lookup catalog ใน wave_spacings (configurable via src/config/formulas.ts)
    const waveEntry = config.wave_spacings.find((w) => w.spacing === button_spacing);
    multiplier = waveEntry?.multiplier ?? config.multiplier_wave;
  } else if (style === 'จีบ') {
    multiplier = config.multiplier_pleated;
  } else if (style === 'ตาไก่') {
    multiplier = config.multiplier_eyelet;
  } else if (style === 'พับ') {
    // ม่านพับ Roman: สูตรบวกเพิ่ม (Additive)
    multiplier = config.multiplier_roman;
    const meters = width_m * multiplier + config.roman_blind_offset;
    return Math.ceil((meters / config.yard_conversion) * 100) / 100;
  }

  // 2. สูตรมาตรฐาน: (กว้าง × ตัวคูณ) + เผื่อชาย
  const totalMeters = width_m * multiplier + config.hem_offset;

  // 3. แปลงเป็นหลา (÷ yard_conversion เพื่อ buffer shrinkage)
  const fabricYardsRaw = totalMeters / config.yard_conversion;

  // 4. ปัดเศษขึ้น 2 ตำแหน่ง (Round Up for Order)
  return Math.ceil(fabricYardsRaw * 100) / 100;
};

// ----------------------------------------------------------------------
// 🚀 MAIN STRATEGY
// ----------------------------------------------------------------------
export const CurtainStrategy: PricingStrategy<CurtainItemInput> = {
  calculate: (item, context?: PricingContext): PriceResult => {
    // Priority 1: ราคาเหมา (Override Logic)
    if (item.enable_set_price && toNum(item.set_price_override) > 0) {
      return { total: toNum(item.set_price_override) };
    }

    const width = toNum(item.width_m);
    const height = toNum(item.height_m);
    
    // Safety Check
    if (width <= 0 || height <= 0) return { total: 0 };

    // --- ตรวจสอบ Layer Mode (ทึบ / โปร่ง / ทึบ+โปร่ง) ---
    const layerMode = item.layer_mode || LAYER_MODES.MAIN;
    const hasMain = layerMode === LAYER_MODES.MAIN || layerMode === LAYER_MODES.DOUBLE;
    const hasSheer = layerMode === LAYER_MODES.SHEER || layerMode === LAYER_MODES.DOUBLE;

    // ==========================================
    // 💰 PART A: ราคาขาย (Selling Price) - คิดตามราง
    // ==========================================
    
    let fabricPrice = 0;
    let sheerPrice = 0;

    // 1. ผ้าทึบ
    if (hasMain) {
      const pricePerUnit = nonNeg(toNum(item.price_per_m_raw));
      fabricPrice = width * pricePerUnit; // กว้าง x ราคาขาย
    }

    // 🛡️ 2. กู้คืน: ผ้าโปร่ง (Sheer)
    if (hasSheer) {
      const sheerPricePerUnit = nonNeg(toNum(item.sheer_price_per_m));
      sheerPrice = width * sheerPricePerUnit; // กว้าง x ราคาขาย
    }

    // ==========================================
    // 🏭 PART B: ปริมาณการผลิต (Production Usage)
    // ==========================================
    
    let fabricYards = 0;
    let sheerYards = 0;

    // 🛡️ 1. กู้คืน: ผ้าทึบ Usage (เผื่ออนาคตต้องใช้คำนวณต้นทุนแฝงในราคาขาย)
    if (hasMain) {
      fabricYards = calculateFabricYardage(
        width,
        item.style,
        item.opening_style,
        context?.formulas,
        item.button_spacing
      );
    }

    // 🛡️ 2. กู้คืน: ผ้าโปร่ง Usage (คิดสูตรเดียวกับผ้าทึบ หรือปรับได้)
    if (hasSheer) {
      // ผ้าโปร่งมักใช้สูตรเดียวกับผ้าทึบ (ลอน/จีบ/ตาไก่)
      sheerYards = calculateFabricYardage(
        width,
        item.style,
        item.opening_style,
        context?.formulas,
        item.button_spacing
      );
    }

    // --- รวมยอด ---
    // ✅ ยืนยันจากเจ้าของร้าน (มิ.ย. 2026): "ราคาผ้า/เมตร รวมรางแล้ว" — ฝั่งขายไม่บวกราง/อุปกรณ์แยก
    // ส่วนฝั่งทุน (CostEngine) คิดค่ารางแยกตามจริง → margin ที่โชว์จะต่ำกว่า "กำไรผ้าล้วน" by design
    const railPrice = 0;
    const accessoryPrice = 0;
    
    const total = fabricPrice + sheerPrice + railPrice + accessoryPrice;

    return {
      total: Math.round(total * 100) / 100,
      breakdown: {
        fabricPrice,
        sheerPrice,
        
        // ✅ ข้อมูลสำหรับ CostEngine (หลังบ้าน)
        fabricYards, // จำนวนหลาผ้าทึบที่ต้องเบิก
        sheerYards,  // จำนวนหลาผ้าโปร่งที่ต้องเบิก
        
        // ข้อมูลเดิมสำหรับแสดงผล (ถ้าจำเป็น)
        fabricMeters: width, 
        sheerMeters: hasSheer ? width : 0,
      }
    };
  },

  validate: (item) => {
    const errors: string[] = [];
    if (toNum(item.width_m) <= 0) errors.push('ระบุความกว้าง');
    if (toNum(item.height_m) <= 0) errors.push('ระบุความสูง');
    if (!item.style) errors.push('เลือกรูปแบบม่าน');
    return errors;
  },

  getSpecs: (item) => {
    const parts = [`กว้าง ${item.width_m} x สูง ${item.height_m} ม.`, item.style];
    if (item.style === 'ลอน' && item.button_spacing) {
      parts.push(`ลอน ${item.button_spacing} ซม.`);
    }
    if (item.opening_style && !STYLES_WITHOUT_OPENING.includes(item.style))
      parts.push(`(${item.opening_style})`);
    if (item.layer_mode === LAYER_MODES.DOUBLE) parts.push('ผ้าทึบ+โปร่ง');
    return parts;
  }
};