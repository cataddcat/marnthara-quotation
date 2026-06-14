// src/store/slices/CostDataSlice.test.ts
// Cost Vault actions — labor / accessory / fabric / wallpaper / area + import/export

import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '@/store/useAppStore';
import { DEFAULT_LABOR_COSTS, DEFAULT_SERVICE_COSTS, DEFAULT_ACCESSORY_COSTS } from './CostDataSlice';

const store = () => useAppStore.getState();

beforeEach(() => {
  store().resetProductionCosts();
});

describe('CostDataSlice — labor', () => {
  it('updateLaborCost merge เข้ากับ key เดิม', () => {
    store().updateLaborCost('ลอน', { rate: 999 });
    expect(store().laborCosts['ลอน']).toMatchObject({ style: 'ลอน', rate: 999, unit: 'meter' });
  });

  it('updateLaborCost สร้าง key ใหม่พร้อม default ถ้ายังไม่มี', () => {
    store().updateLaborCost('สไตล์ใหม่', { rate: 50 });
    expect(store().laborCosts['สไตล์ใหม่']).toMatchObject({
      style: 'สไตล์ใหม่',
      rate: 50,
      unit: 'meter',
      min_price: 0,
    });
  });

  it('removeLaborCost ลบ key', () => {
    store().removeLaborCost('ลอน');
    expect(store().laborCosts).not.toHaveProperty('ลอน');
  });
});

describe('CostDataSlice — service', () => {
  it('updateServiceCost ตั้งราคา', () => {
    store().updateServiceCost('removal_per_point', 150);
    expect(store().serviceCosts.removal_per_point).toBe(150);
  });

  it('removeServiceCost ลบ key', () => {
    store().removeServiceCost('install_point');
    expect(store().serviceCosts).not.toHaveProperty('install_point');
  });

  it('updateHardwareCost / removeHardwareCost (catalog SKU → ทุน)', () => {
    store().updateHardwareCost('RW-1', 300);
    expect(store().hardwareCosts['RW-1']).toBe(300);
    store().removeHardwareCost('RW-1');
    expect(store().hardwareCosts).not.toHaveProperty('RW-1');
  });

  it('accessoryCosts ไม่ปนค่าบริการ (install/removal อยู่ใน serviceCosts)', () => {
    expect(store().accessoryCosts).not.toHaveProperty('install_point');
    expect(store().accessoryCosts).not.toHaveProperty('removal_per_point');
    expect(store().serviceCosts).toHaveProperty('install_point');
    expect(store().serviceCosts).toHaveProperty('removal_per_point');
  });
});

describe('CostDataSlice — accessory', () => {
  it('updateAccessoryCost ตั้งราคา', () => {
    store().updateAccessoryCost('rail_wave', 250);
    expect(store().accessoryCosts.rail_wave).toBe(250);
  });

  it('removeAccessoryCost ลบ key', () => {
    store().removeAccessoryCost('rail_wave');
    expect(store().accessoryCosts).not.toHaveProperty('rail_wave');
  });

  it('default = ราง legacy เท่านั้น (ไม่มี component ที่รวมในชุดราง)', () => {
    // beforeEach reset แล้ว → accessoryCosts = DEFAULT_ACCESSORY_COSTS
    expect(store().accessoryCosts).toHaveProperty('rail_wave');
    expect(store().accessoryCosts).not.toHaveProperty('rod_bracket');
    expect(store().accessoryCosts).not.toHaveProperty('eyelet_ring');
    expect(store().accessoryCosts).not.toHaveProperty('tape_wave');
  });
});

describe('CostDataSlice — fabric', () => {
  it('updateFabricCost เพิ่ม/แก้ราคาผ้า', () => {
    store().updateFabricCost('F001', 120);
    expect(store().fabricCosts.F001).toBe(120);
  });

  it('removeFabricCost ลบ code', () => {
    store().updateFabricCost('F001', 120);
    store().removeFabricCost('F001');
    expect(store().fabricCosts).not.toHaveProperty('F001');
  });

  it('batchUpdateFabricCosts merge หลาย code พร้อมกัน', () => {
    store().updateFabricCost('F001', 100);
    store().batchUpdateFabricCosts({ F002: 200, F003: 300 });
    expect(store().fabricCosts).toMatchObject({ F001: 100, F002: 200, F003: 300 });
  });

  it('updateUnifiedCost route ไปที่ fabricCosts', () => {
    store().updateUnifiedCost('F009', 444);
    expect(store().fabricCosts.F009).toBe(444);
  });
});

describe('CostDataSlice — wallpaper / area', () => {
  it('updateWallpaperCost', () => {
    store().updateWallpaperCost('WP01', 1500);
    expect(store().wallpaperCosts.WP01).toBe(1500);
  });

  it('updateAreaCost', () => {
    store().updateAreaCost('wooden_blind', 600);
    expect(store().areaCosts.wooden_blind).toBe(600);
  });
});

describe('CostDataSlice — lifecycle', () => {
  it('loadDefaultCosts คืนค่าแรง+บริการ+อุปกรณ์ default แต่ไม่แตะ fabricCosts', () => {
    store().updateFabricCost('F001', 120);
    store().updateLaborCost('ลอน', { rate: 1 });
    store().updateServiceCost('install_point', 1);
    store().loadDefaultCosts();
    expect(store().laborCosts).toEqual(DEFAULT_LABOR_COSTS);
    expect(store().serviceCosts).toEqual(DEFAULT_SERVICE_COSTS);
    expect(store().accessoryCosts).toEqual(DEFAULT_ACCESSORY_COSTS);
    expect(store().fabricCosts.F001).toBe(120); // ผ้าไม่ถูกล้าง
  });

  it('resetProductionCosts ล้าง fabric/wallpaper/area + คืน default labor/service/accessory', () => {
    store().updateFabricCost('F001', 120);
    store().updateWallpaperCost('WP01', 1500);
    store().resetProductionCosts();
    expect(store().fabricCosts).toEqual({});
    expect(store().wallpaperCosts).toEqual({});
    expect(store().areaCosts).toEqual({});
    expect(store().laborCosts).toEqual(DEFAULT_LABOR_COSTS);
    expect(store().serviceCosts).toEqual(DEFAULT_SERVICE_COSTS);
  });
});

describe('CostDataSlice — owner baseline (ค่าตั้งต้นของฉัน)', () => {
  it('saveCostDefaults snapshot ค่าเย็บ+บริการ ปัจจุบัน', () => {
    store().updateLaborCost('ลอน', { rate: 999 });
    store().updateServiceCost('install_point', 777);
    store().saveCostDefaults();
    const snap = store().userCostDefaults;
    expect(snap).not.toBeNull();
    expect(snap!.laborCosts['ลอน'].rate).toBe(999);
    expect(snap!.serviceCosts.install_point).toBe(777);
    expect(typeof snap!.savedAt).toBe('number');
  });

  it('loadCostDefaults คืนค่าจาก baseline ที่บันทึกไว้ (ทับค่าที่แก้ภายหลัง)', () => {
    store().updateLaborCost('ลอน', { rate: 999 });
    store().saveCostDefaults();
    store().updateLaborCost('ลอน', { rate: 1 });
    store().loadCostDefaults();
    expect(store().laborCosts['ลอน'].rate).toBe(999);
  });

  it('loadCostDefaults fallback ค่ามาตรฐานในโค้ดเมื่อยังไม่มี baseline', () => {
    store().updateLaborCost('ลอน', { rate: 1 });
    expect(store().userCostDefaults).toBeNull();
    store().loadCostDefaults();
    expect(store().laborCosts).toEqual(DEFAULT_LABOR_COSTS);
    expect(store().serviceCosts).toEqual(DEFAULT_SERVICE_COSTS);
  });

  it('clearCostDefaults ล้าง baseline → null', () => {
    store().saveCostDefaults();
    expect(store().userCostDefaults).not.toBeNull();
    store().clearCostDefaults();
    expect(store().userCostDefaults).toBeNull();
  });

  it('resetProductionCosts ล้าง baseline ด้วย (factory reset)', () => {
    store().saveCostDefaults();
    expect(store().userCostDefaults).not.toBeNull();
    store().resetProductionCosts();
    expect(store().userCostDefaults).toBeNull();
  });
});

describe('CostDataSlice — costInclude (สวิตช์นับ/ไม่นับ)', () => {
  it('default: เปิด 3 ส่วนแรก · ขนส่งปิด (ไม่เคยถูกนับมาก่อน — opt-in)', () => {
    expect(store().costInclude).toEqual({ labor: true, rail: true, service: true, shipping: false });

    store().setCostInclude('labor', false);
    expect(store().costInclude).toEqual({ labor: false, rail: true, service: true, shipping: false });
  });

  it('resetProductionCosts → คืนสวิตช์เป็น default', () => {
    store().setCostInclude('rail', false);
    store().setCostInclude('shipping', true);
    store().resetProductionCosts();
    expect(store().costInclude.rail).toBe(true);
    expect(store().costInclude.shipping).toBe(false);
  });

  it('DEFAULT_SERVICE_COSTS มีอัตราขนส่งเหมาต่องาน (เริ่ม 0 = ยังไม่ตั้ง)', () => {
    expect(store().serviceCosts).toHaveProperty('shipping_per_job', 0);
  });
});

describe('CostDataSlice — import/export', () => {
  it('exportSecrets คืน JSON ที่มี 7 vault keys + costInclude', () => {
    store().updateFabricCost('F001', 120);
    const parsed = JSON.parse(store().exportSecrets());
    expect(parsed).toHaveProperty('laborCosts');
    expect(parsed).toHaveProperty('serviceCosts');
    expect(parsed).toHaveProperty('accessoryCosts');
    expect(parsed).toHaveProperty('hardwareCosts');
    expect(parsed.fabricCosts).toMatchObject({ F001: 120 });
    expect(parsed).toHaveProperty('wallpaperCosts');
    expect(parsed).toHaveProperty('areaCosts');
    expect(parsed).toHaveProperty('costInclude');
  });

  it('importSecrets รับ costInclude (merge ทับ key ที่ส่งมา)', () => {
    const ok = store().importSecrets(
      JSON.stringify({ fabricCosts: { F001: 99 }, costInclude: { labor: false } })
    );
    expect(ok).toBe(true);
    expect(store().costInclude).toEqual({ labor: false, rail: true, service: true, shipping: false });
  });

  it('importSecrets merge ข้อมูลที่ valid → true', () => {
    const ok = store().importSecrets(JSON.stringify({ fabricCosts: { F001: 99 } }));
    expect(ok).toBe(true);
    expect(store().fabricCosts.F001).toBe(99);
  });

  it('importSecrets JSON พังไวยากรณ์ → false', () => {
    expect(store().importSecrets('{ not json')).toBe(false);
  });

  it('importSecrets ไม่มี vault key ที่รู้จัก → false', () => {
    expect(store().importSecrets(JSON.stringify({ random: 1 }))).toBe(false);
  });
});
