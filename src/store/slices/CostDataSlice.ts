import { StateCreator } from 'zustand';
import { AppState } from '../useAppStore';

export interface LaborCost {
  style: string;
  rate: number;
  // meter = ต่อเมตรความกว้างหน้าต่าง
  // yard  = ต่อหลาผ้าที่ใช้จริง (fabricYards จาก CurtainStrategy)
  // sqm   = ต่อตารางเมตร (width × height)
  // set   = ต่อชุด (flat rate)
  unit: 'meter' | 'yard' | 'sqm' | 'set';
  min_price: number;
}

export interface CostDataSlice {
  laborCosts: Record<string, LaborCost>;
  accessoryCosts: Record<string, number>;
  fabricCosts: Record<string, number>;
  wallpaperCosts: Record<string, number>; // code → cost per roll
  areaCosts: Record<string, number>;      // code or type → cost per sqm

  updateLaborCost: (key: string, data: Partial<LaborCost>) => void;
  removeLaborCost: (key: string) => void;
  updateAccessoryCost: (key: string, price: number) => void;
  removeAccessoryCost: (key: string) => void;

  updateFabricCost: (code: string, cost: number) => void;
  removeFabricCost: (code: string) => void;
  batchUpdateFabricCosts: (costs: Record<string, number>) => void;

  updateWallpaperCost: (code: string, cost: number) => void;
  updateAreaCost: (key: string, cost: number) => void;

  updateUnifiedCost: (code: string, newCost: number) => void;
  loadDefaultCosts: () => void;
  resetProductionCosts: () => void;

  exportSecrets: () => string;
  importSecrets: (jsonString: string) => boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// ค่าแรงมาตรฐานตลาดไทย 2025
// อ้างอิง: ราคากลางร้านผ้าม่านทั่วกรุงเทพฯ และปริมณฑล
// ─────────────────────────────────────────────────────────────────────────────
export const DEFAULT_LABOR_COSTS: Record<string, LaborCost> = {
  'ลอน': {
    style: 'ลอน',
    rate: 110,   // บาท/เมตร (ค่าเย็บ + ติดตั้ง)
    unit: 'meter',
    min_price: 400,
  },
  'จีบ': {
    style: 'จีบ',
    rate: 110,
    unit: 'meter',
    min_price: 400,
  },
  'ตาไก่': {
    style: 'ตาไก่',
    rate: 90,
    unit: 'meter',
    min_price: 300,
  },
  'พับ': {
    style: 'พับ',
    rate: 220,   // บาท/ตร.ม. (ม่านพับคิดเป็นพื้นที่)
    unit: 'sqm',
    min_price: 600,
  },
  'หลุยส์': {
    style: 'หลุยส์',
    rate: 160,
    unit: 'meter',
    min_price: 500,
  },
  'แป๊บ': {
    style: 'แป๊บ',
    rate: 60,
    unit: 'meter',
    min_price: 200,
  },

  // ค่าแรงเย็บผ้าโปร่ง — ใช้เมื่อ layer_mode = DOUBLE (ทึบ+โปร่ง)
  // คำนวณแยกต่างหากจากค่าแรงผ้าทึบ
  'ผ้าโปร่ง': {
    style: 'ผ้าโปร่ง',
    rate: 70,    // บาท/เมตร (ผ้าโปร่งเย็บง่ายกว่าผ้าทึบ)
    unit: 'meter',
    min_price: 200,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// ราคาวัสดุ/อุปกรณ์มาตรฐาน 2025
// ─────────────────────────────────────────────────────────────────────────────
export const DEFAULT_ACCESSORY_COSTS: Record<string, number> = {
  // ── รางผ้าม่าน ─────────────────────────────────────────────────────────
  rail_wave:    160,   // รางม่านลอน (ระบบโซ่ไข่ปลา) บาท/เมตร
  rail_pleated: 100,   // รางม่านจีบ (ราง M) บาท/เมตร
  rail_eyelet:  190,   // รางม่านตาไก่ (รางโชว์) บาท/เมตร
  rail_roman:   450,   // ชุดรางม่านพับ (Roman System พร้อมเกียร์) บาท/ชุด
  rail_rod:      70,   // ราวม่านแป๊บ (ราวสอด อลูมิเนียม) บาท/เมตร
  rail_louis:   650,   // ราง/กล่อง ม่านหลุยส์ บาท/เมตร

  // ── อุปกรณ์เสริม ───────────────────────────────────────────────────────
  eyelet_ring:    5,   // ห่วงตาไก่ (ต่อชิ้น)
  tape_wave:     10,   // เทปหัวม่าน/โซ่ (ต่อเมตร)
  rod_bracket:   35,   // ขาจับราง ม่านแป๊บ/สอดราง (ต่อขา) — แป๊บใช้ 4 ขา/ชุด

  // ── ค่าติดตั้ง ─────────────────────────────────────────────────────────
  install_point: 350,  // ค่าติดตั้ง (ต่อจุด/ต่อช่องหน้าต่าง)
  install_min:   600,  // ค่าติดตั้งขั้นต่ำต่อเที่ยว

  // ── ค่าเดินทาง/ขนส่ง ───────────────────────────────────────────────────
  transport_base:       400,   // ค่าเดินทาง กทม. และปริมณฑล (ต่อเที่ยว)
  transport_upcountry: 1200,   // ค่าเดินทางต่างจังหวัด (ต่อเที่ยว)
  fuel_diesel_liter:     32,   // ราคาน้ำมันดีเซล B7 อ้างอิง (บาท/ลิตร)
};

export const createCostDataSlice: StateCreator<
  AppState,
  [['zustand/persist', unknown], ['temporal', unknown]],
  [],
  CostDataSlice
> = (set, get) => ({
  laborCosts: DEFAULT_LABOR_COSTS,
  accessoryCosts: DEFAULT_ACCESSORY_COSTS,
  fabricCosts: {},
  wallpaperCosts: {},
  areaCosts: {},

  updateLaborCost: (key, data) =>
    set((state) => ({
      laborCosts: {
        ...state.laborCosts,
        [key]: { ...(state.laborCosts[key] || { style: key, rate: 0, unit: 'meter', min_price: 0 }), ...data } as LaborCost,
      },
    })),

  removeLaborCost: (key) =>
    set((state) => {
      const newCosts = { ...state.laborCosts };
      delete newCosts[key];
      return { laborCosts: newCosts };
    }),

  updateAccessoryCost: (key, price) =>
    set((state) => ({
      accessoryCosts: { ...state.accessoryCosts, [key]: price },
    })),

  removeAccessoryCost: (key) =>
    set((state) => {
      const newCosts = { ...state.accessoryCosts };
      delete newCosts[key];
      return { accessoryCosts: newCosts };
    }),

  updateFabricCost: (code, cost) =>
    set((state) => ({
      fabricCosts: { ...state.fabricCosts, [code]: cost },
    })),

  removeFabricCost: (code) =>
    set((state) => {
      const newCosts = { ...state.fabricCosts };
      delete newCosts[code];
      return { fabricCosts: newCosts };
    }),

  updateWallpaperCost: (code, cost) =>
    set((state) => ({
      wallpaperCosts: { ...state.wallpaperCosts, [code]: cost },
    })),

  updateAreaCost: (key, cost) =>
    set((state) => ({
      areaCosts: { ...state.areaCosts, [key]: cost },
    })),

  updateUnifiedCost: (code, newCost) => {
    get().updateFabricCost(code, newCost);
  },

  batchUpdateFabricCosts: (costs) =>
    set((state) => ({
      fabricCosts: { ...state.fabricCosts, ...costs },
    })),

  // โหลดเฉพาะค่าแรง + อุปกรณ์ ไม่แตะ fabricCosts (ข้อมูลผ้าเป็นของส่วนตัวร้าน)
  loadDefaultCosts: () =>
    set(() => ({
      laborCosts: DEFAULT_LABOR_COSTS,
      accessoryCosts: DEFAULT_ACCESSORY_COSTS,
    })),

  resetProductionCosts: () =>
    set(() => ({
      laborCosts: DEFAULT_LABOR_COSTS,
      accessoryCosts: DEFAULT_ACCESSORY_COSTS,
      fabricCosts: {},
      wallpaperCosts: {},
      areaCosts: {},
    })),

  exportSecrets: () => {
    const { laborCosts, accessoryCosts, fabricCosts, wallpaperCosts, areaCosts } = get();
    return JSON.stringify({ laborCosts, accessoryCosts, fabricCosts, wallpaperCosts, areaCosts }, null, 2);
  },

  importSecrets: (inputString) => {
    try {
      const data = JSON.parse(inputString);
      if (!data.laborCosts && !data.accessoryCosts && !data.fabricCosts) return false;
      set((state) => ({
        laborCosts: data.laborCosts ? { ...state.laborCosts, ...data.laborCosts } : state.laborCosts,
        accessoryCosts: data.accessoryCosts ? { ...state.accessoryCosts, ...data.accessoryCosts } : state.accessoryCosts,
        fabricCosts: data.fabricCosts ? { ...state.fabricCosts, ...data.fabricCosts } : state.fabricCosts,
        wallpaperCosts: data.wallpaperCosts ? { ...state.wallpaperCosts, ...data.wallpaperCosts } : state.wallpaperCosts,
        areaCosts: data.areaCosts ? { ...state.areaCosts, ...data.areaCosts } : state.areaCosts,
      }));
      return true;
    } catch (e) {
      console.error('Import failed', e);
      return false;
    }
  },
});
