// src/features/curtains/logic/CurtainStrategy.ts

import { CurtainItemInput } from '@/types';
import { toNum } from '@/utils/formatters';
import { PricingStrategy, PriceResult, PricingContext } from '@/lib/pricing/types';
import { useAppStore } from '@/store/useAppStore'; 
import { LAYER_MODES } from '@/config/enums';
import { FormulaConfig } from '@/store/slices/FormulaSlice';

// ----------------------------------------------------------------------
// 🌊 ม่านลอน — Wave depth (ระยะกระดุมบนเทปลอน) → multiplier
// 14.5 ซม. = ลอนมาตรฐาน (ตื้นกว่า), 16 ซม. = ลอนลึก (ใช้ผ้ามากขึ้น)
// ----------------------------------------------------------------------
const WAVE_MULTIPLIER_BY_SPACING: Record<string, number> = {
  '14.5': 2.7, // ลอนมาตรฐาน
  '16': 2.8,   // ลอนลึก — ลอนใหญ่ขึ้น ใช้ผ้าเพิ่ม
};

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

  // Use injected formulas or fallback to store
  const formulas = formulasOverride || useAppStore.getState().formulas;
  const config = formulas.curtain;

  // 1. เลือกตัวคูณ (Multiplier)
  let multiplier = 2.50;
  if (style === 'ลอน') {
    // ลอน: ใช้ multiplier ตาม "ระยะกระดุม" (ความลึกลอน)
    // หากไม่ระบุ ใช้ 14.5 ซม. (ลอนมาตรฐาน) เป็นค่ากลาง
    const waveKey = button_spacing && WAVE_MULTIPLIER_BY_SPACING[button_spacing] ? button_spacing : '14.5';
    multiplier = WAVE_MULTIPLIER_BY_SPACING[waveKey] ?? config.multiplier_wave ?? 2.7;
  } else if (style === 'จีบ') {
    multiplier = config.multiplier_pleated ?? 2.7;
  } else if (style === 'ตาไก่') {
    multiplier = config.multiplier_eyelet ?? 2.7;
  } else if (style === 'พับ') {
      // ม่านพับ: ใช้สูตรบวกเพิ่ม (Additive)
      const offset = config.roman_blind_offset ?? 0.45;
      const meters = (width_m * multiplier) + offset;
      // แปลงหลาและปัดเศษเลย
      return Math.ceil((meters / 0.90) * 100) / 100;
  }

  // 2. สูตรมาตรฐาน (Smart Hybrid):
  // (กว้าง x ตัวคูณ) + Safe Standard (0.30)
  // ✅ UPDATE: เปลี่ยน fallback จาก 0.10 เป็น 0.30 เผื่อกรณี config โหลดไม่ทัน
  // 0.30 ม. มาจาก (ริมซ้ายขวา 4 ด้าน x 0.05) + (ซ้อนกลาง 0.10)
  const totalMeters = (width_m * multiplier) + (config.hem_offset ?? 0.30);

  // 3. แปลงเป็นหลา (หาร 0.9)
  const fabricYardsRaw = totalMeters / 0.90;

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
      const pricePerUnit = toNum(item.price_per_m_raw);
      fabricPrice = width * pricePerUnit; // กว้าง x ราคาขาย
    }

    // 🛡️ 2. กู้คืน: ผ้าโปร่ง (Sheer)
    if (hasSheer) {
      const sheerPricePerUnit = toNum(item.sheer_price_per_m);
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
    const railPrice = 0; // เผื่ออนาคต
    const accessoryPrice = 0; // เผื่ออนาคต
    
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
    if (item.opening_style) parts.push(`(${item.opening_style})`);
    if (item.layer_mode === LAYER_MODES.DOUBLE) parts.push('ผ้าทึบ+โปร่ง');
    return parts;
  }
};