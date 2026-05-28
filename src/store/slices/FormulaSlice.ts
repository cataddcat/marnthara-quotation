import { StateCreator } from 'zustand';
import { AppState } from '../useAppStore';

// ⚙️ Configuration Interface
export interface FormulaConfig {
  // หมวดผ้าม่าน (Curtains)
  curtain: {
    multiplier_wave: number;     // ลอน (Standard: 2.70)
    multiplier_pleated: number;  // จีบ (Standard: 2.70)
    multiplier_eyelet: number;   // ตาไก่ (Standard: 2.70)
    multiplier_roman: number;    // พับ (Standard: 1.50 - ใช้กรณีคิดเป็นเท่า)
    
    // Roman Special Logic (Additive)
    roman_blind_offset: number;  // เผื่อเย็บม่านพับ (Standard: 0.45 ม.)
    
    // Common
    hem_offset: number;          // เผื่อริมผ้า
    yard_conversion: number;     // แปลงเมตรเป็นหลา + เผื่อเสีย (Standard: 1.11)
  };

  // หมวดวอลเปเปอร์ (Wallpaper)
  wallpaper: {
    roll_width: number;          // หน้ากว้าง (Standard: 0.53 ม.)
    roll_length: number;         // ความยาวม้วน (Standard: 10.0 ม.)
    waste_margin: number;        // เผื่อตัดหัวท้าย (Standard: 0.10 ม.)
  };

  // หมวดพื้นที่/มู่ลี่ (Area/Blinds)
  area: {
    sqm_to_sqyd: number;         // แปลง ตร.ม. -> ตร.ล. (Standard: 1.20)
    min_yield: number;           // ขั้นต่ำ (Standard: 1.00 ตร.ล.)
  };
}

export interface FormulaSlice {
  formulas: FormulaConfig;
  updateFormula: <K extends keyof FormulaConfig>(
    category: K, 
    data: Partial<FormulaConfig[K]>
  ) => void;
  resetFormulas: () => void;
}

// 🛡️ Default Values (Safe Mode)
const DEFAULT_FORMULAS: FormulaConfig = {
  curtain: {
    multiplier_wave: 2.70,
    multiplier_pleated: 2.70,
    multiplier_eyelet: 2.70,
    multiplier_roman: 1.50,
    roman_blind_offset: 0.45,
    
    // [CHANGE] ปรับจาก 0.10 เป็น 0.30 (Safe Standard)
    // เหตุผล: เพื่อให้ครอบคลุมริมผ้า 4 ด้าน (กรณีแยกกลาง) + ระยะซ้อนกลาง
    hem_offset: 0.30,
    
    yard_conversion: 1.11,
  },
  wallpaper: {
    roll_width: 0.53,
    roll_length: 10.0,
    waste_margin: 0.10,
  },
  area: {
    sqm_to_sqyd: 1.20,
    min_yield: 1.00,
  },
};

export const createFormulaSlice: StateCreator<
  AppState,
  [['zustand/persist', unknown], ['temporal', unknown]],
  [],
  FormulaSlice
> = (set) => ({
  formulas: DEFAULT_FORMULAS,

  updateFormula: (category, data) =>
    set((state) => ({
      formulas: {
        ...state.formulas,
        [category]: { ...state.formulas[category], ...data },
      },
    })),

  resetFormulas: () =>
    set(() => ({
      formulas: DEFAULT_FORMULAS,
    })),
});