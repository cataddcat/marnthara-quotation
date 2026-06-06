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
  serviceCosts: Record<string, number>;   // ค่าติดตั้ง/เดินทาง/รื้อถอน (flat rate)
  accessoryCosts: Record<string, number>; // อุปกรณ์ฮาร์ดแวร์ล้วน (ราง/ห่วง/เทป/ขาจับ) — legacy, retire Phase B
  hardwareCosts: Record<string, number>;  // ราง/ฮาร์ดแวร์ catalog SKU → ทุน/หน่วย (Phase A+)
  fabricCosts: Record<string, number>;
  wallpaperCosts: Record<string, number>; // code → cost per roll
  areaCosts: Record<string, number>;      // code or type → cost per sqm

  // ค่าตั้งต้นของฉัน (owner baseline) — snapshot ค่าเย็บ+บริการ ของเจ้าของ; null = ยังไม่เคยบันทึก
  userCostDefaults: { laborCosts: Record<string, LaborCost>; serviceCosts: Record<string, number>; savedAt: number } | null;

  updateLaborCost: (key: string, data: Partial<LaborCost>) => void;
  removeLaborCost: (key: string) => void;
  updateServiceCost: (key: string, price: number) => void;
  removeServiceCost: (key: string) => void;
  updateAccessoryCost: (key: string, price: number) => void;
  removeAccessoryCost: (key: string) => void;
  updateHardwareCost: (code: string, cost: number) => void;
  removeHardwareCost: (code: string) => void;

  updateFabricCost: (code: string, cost: number) => void;
  removeFabricCost: (code: string) => void;
  batchUpdateFabricCosts: (costs: Record<string, number>) => void;

  updateWallpaperCost: (code: string, cost: number) => void;
  updateAreaCost: (key: string, cost: number) => void;

  updateUnifiedCost: (code: string, newCost: number) => void;
  loadDefaultCosts: () => void;
  resetProductionCosts: () => void;

  // owner baseline actions
  saveCostDefaults: () => void;   // snapshot ค่าเย็บ+บริการ ปัจจุบัน → userCostDefaults
  loadCostDefaults: () => void;   // คืนค่าจาก userCostDefaults (ไม่มี → fallback DEFAULT ในโค้ด)
  clearCostDefaults: () => void;  // ล้าง baseline → null

  exportSecrets: () => string;
  importSecrets: (jsonString: string) => boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// ค่าแรงมาตรฐานตลาดไทย 2025
// อ้างอิง: ราคากลางร้านผ้าม่านทั่วกรุงเทพฯ และปริมณฑล
// ─────────────────────────────────────────────────────────────────────────────
// ค่าเย็บต่อเมตรความกว้างหน้าต่าง (min_price = 0 → คิดตามเมตรล้วน, เจ้าของปรับขั้นต่ำเองได้)
export const DEFAULT_LABOR_COSTS: Record<string, LaborCost> = {
  'ลอน': {
    style: 'ลอน',
    rate: 130,   // บาท/เมตร (ค่าเย็บ)
    unit: 'meter',
    min_price: 0,
  },
  'จีบ': {
    style: 'จีบ',
    rate: 130,
    unit: 'meter',
    min_price: 0,
  },
  'ตาไก่': {
    style: 'ตาไก่',
    rate: 130,
    unit: 'meter',
    min_price: 0,
  },
  'พับ': {
    style: 'พับ',
    rate: 300,   // บาท/เมตร (ม่านพับคิดต่อเมตรราง)
    unit: 'meter',
    min_price: 0,
  },
  'หลุยส์': {
    style: 'หลุยส์',
    rate: 500,
    unit: 'meter',
    min_price: 0,
  },
  'แป๊บ': {
    style: 'แป๊บ',
    rate: 130,
    unit: 'meter',
    min_price: 0,
  },

  // ค่าแรงเย็บผ้าโปร่ง — ใช้เมื่อ layer_mode = DOUBLE (ทึบ+โปร่ง)
  // คิดแยกต่างหาก (เท่าค่าเย็บผ้าทึบต่อเมตร) → DOUBLE = ค่าเย็บทึบ + โปร่ง รวมกัน
  'ผ้าโปร่ง': {
    style: 'ผ้าโปร่ง',
    rate: 130,   // บาท/เมตร (เท่าค่าเย็บผ้าทึบ)
    unit: 'meter',
    min_price: 0,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// ราคารางมาตรฐาน 2025 — legacy fallback (ใช้เมื่อม่านไม่ได้เลือก SKU รางจากคลังวัสดุ)
// ราคา = ชุดประกอบเสร็จ/หน่วย (รวมลูกล้อ/ขาจับ/เทป) → ไม่คิด component แยก
// แก้ทุนรางจริงผ่าน "คลังวัสดุ" (hardwareCosts SKU)
// ─────────────────────────────────────────────────────────────────────────────
export const DEFAULT_ACCESSORY_COSTS: Record<string, number> = {
  rail_wave:    130,   // รางม่านลอน TES เทปลอน TW14.5 (THONG DECOR) บาท/เมตร
  rail_pleated: 100,   // รางม่านจีบ LTL (ราง M) บาท/เมตร
  rail_eyelet:  190,   // รางม่านตาไก่ (รางโชว์) บาท/เมตร
  rail_roman:   450,   // ชุดรางม่านพับ (Roman System พร้อมเกียร์) บาท/เมตร
  rail_rod:      70,   // ราวม่านแป๊บ (ราวสอด อลูมิเนียม) บาท/เมตร
  rail_louis:   650,   // ราง/กล่อง ม่านหลุยส์ บาท/เมตร
};

// ─────────────────────────────────────────────────────────────────────────────
// ค่าบริการมาตรฐาน — flat rate ต่อจุด (ติดตั้ง / รื้อถอน)
// removal_per_point ผูกเข้า CostEngine (item รื้อถอน = rate × จำนวนจุด); install_point เป็น reference
// ─────────────────────────────────────────────────────────────────────────────
export const DEFAULT_SERVICE_COSTS: Record<string, number> = {
  install_point:     300,  // ค่าติดตั้ง (ต่อจุด/ต่อช่องหน้าต่าง)
  removal_per_point: 300,  // ทุนค่ารื้อถอน (ต่อจุด)
};

export const createCostDataSlice: StateCreator<
  AppState,
  [['zustand/persist', unknown], ['temporal', unknown]],
  [],
  CostDataSlice
> = (set, get) => ({
  laborCosts: DEFAULT_LABOR_COSTS,
  serviceCosts: DEFAULT_SERVICE_COSTS,
  accessoryCosts: DEFAULT_ACCESSORY_COSTS,
  hardwareCosts: {},
  fabricCosts: {},
  wallpaperCosts: {},
  areaCosts: {},
  userCostDefaults: null,

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

  updateServiceCost: (key, price) =>
    set((state) => ({
      serviceCosts: { ...state.serviceCosts, [key]: price },
    })),

  removeServiceCost: (key) =>
    set((state) => {
      const newCosts = { ...state.serviceCosts };
      delete newCosts[key];
      return { serviceCosts: newCosts };
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

  updateHardwareCost: (code, cost) =>
    set((state) => ({
      hardwareCosts: { ...state.hardwareCosts, [code]: cost },
    })),

  removeHardwareCost: (code) =>
    set((state) => {
      const newCosts = { ...state.hardwareCosts };
      delete newCosts[code];
      return { hardwareCosts: newCosts };
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

  // โหลดเฉพาะค่าแรง + บริการ + อุปกรณ์ ไม่แตะ fabricCosts (ข้อมูลผ้าเป็นของส่วนตัวร้าน)
  loadDefaultCosts: () =>
    set(() => ({
      laborCosts: DEFAULT_LABOR_COSTS,
      serviceCosts: DEFAULT_SERVICE_COSTS,
      accessoryCosts: DEFAULT_ACCESSORY_COSTS,
    })),

  resetProductionCosts: () =>
    set(() => ({
      laborCosts: DEFAULT_LABOR_COSTS,
      serviceCosts: DEFAULT_SERVICE_COSTS,
      accessoryCosts: DEFAULT_ACCESSORY_COSTS,
      hardwareCosts: {},
      fabricCosts: {},
      wallpaperCosts: {},
      areaCosts: {},
      userCostDefaults: null, // factory reset = ล้าง baseline ของเจ้าของด้วย
    })),

  // ── ค่าตั้งต้นของฉัน (owner baseline) ──────────────────────────────────────
  // snapshot ค่าเย็บ+บริการ ปัจจุบันเป็น "จุดรีเซ็ตของเจ้าของ" — เก็บถาวรใน persist
  // ไม่ต้องพึ่ง dev: เจ้าของกดบันทึก/คืนค่าได้เอง (ต่างจาก loadDefaultCosts = ค่ามาตรฐานในโค้ด)
  saveCostDefaults: () =>
    set((state) => ({
      userCostDefaults: {
        laborCosts: { ...state.laborCosts },
        serviceCosts: { ...state.serviceCosts },
        savedAt: Date.now(),
      },
    })),

  loadCostDefaults: () =>
    set((state) => {
      const snap = state.userCostDefaults;
      return snap
        ? { laborCosts: { ...snap.laborCosts }, serviceCosts: { ...snap.serviceCosts } }
        : { laborCosts: DEFAULT_LABOR_COSTS, serviceCosts: DEFAULT_SERVICE_COSTS };
    }),

  clearCostDefaults: () => set(() => ({ userCostDefaults: null })),

  exportSecrets: () => {
    const { laborCosts, serviceCosts, accessoryCosts, hardwareCosts, fabricCosts, wallpaperCosts, areaCosts } =
      get();
    return JSON.stringify(
      { laborCosts, serviceCosts, accessoryCosts, hardwareCosts, fabricCosts, wallpaperCosts, areaCosts },
      null,
      2
    );
  },

  importSecrets: (inputString) => {
    try {
      const data = JSON.parse(inputString);
      if (!data.laborCosts && !data.serviceCosts && !data.accessoryCosts && !data.fabricCosts)
        return false;
      set((state) => ({
        laborCosts: data.laborCosts ? { ...state.laborCosts, ...data.laborCosts } : state.laborCosts,
        serviceCosts: data.serviceCosts ? { ...state.serviceCosts, ...data.serviceCosts } : state.serviceCosts,
        accessoryCosts: data.accessoryCosts ? { ...state.accessoryCosts, ...data.accessoryCosts } : state.accessoryCosts,
        hardwareCosts: data.hardwareCosts ? { ...state.hardwareCosts, ...data.hardwareCosts } : state.hardwareCosts,
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
