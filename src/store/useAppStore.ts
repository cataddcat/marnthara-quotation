import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { temporal } from 'zundo';
import { STORAGE_KEY } from '@/config/constants';
import { migrateLegacyState } from './migrations';

// Import Slices
import { createCustomerSlice, CustomerSlice } from './slices/CustomerSlice';
import { createProjectSlice, ProjectSlice } from './slices/ProjectSlice';
import { createShopProfileSlice, ShopProfileSlice } from './slices/ShopProfileSlice';
import { createInventorySlice, InventorySlice } from './slices/InventorySlice';
import { createUISlice, UISlice } from './slices/UISlice';
import { createCostDataSlice, CostDataSlice } from './slices/CostDataSlice';

// --- [QOL] EXPORT TYPES HERE ---
// เพื่อให้ไฟล์อื่น import { ProjectSlice } from '@/store/useAppStore' ได้เลย
// ไม่ต้องไปจำว่าไฟล์ Slice ชื่ออะไร
export type { CustomerSlice } from './slices/CustomerSlice';
export type { ProjectSlice } from './slices/ProjectSlice';
export type { ShopProfileSlice } from './slices/ShopProfileSlice';
export type { InventorySlice } from './slices/InventorySlice';
export type { UISlice, ModalType } from './slices/UISlice';
export type { CostDataSlice, LaborCost } from './slices/CostDataSlice';
// formulas เป็น compile-time constant แล้ว — import { FORMULAS } from '@/config/formulas'
export type { FormulaConfig } from '@/config/formulas';

// Combine Types
export type AppState = CustomerSlice &
  ProjectSlice &
  ShopProfileSlice &
  InventorySlice &
  UISlice &
  CostDataSlice;

const omitTransientState = (state: AppState): Partial<AppState> => {
  const newState = { ...state };
  delete (newState as Partial<AppState>).activeModal;
  delete (newState as Partial<AppState>).modalProps;
  delete (newState as Partial<AppState>).modalStack;
  return newState;
};

export const useAppStore = create<AppState>()(
  temporal(
    persist(
      (...a) => ({
        ...createCustomerSlice(...a),
        ...createProjectSlice(...a),
        ...createShopProfileSlice(...a),
        ...createInventorySlice(...a),
        ...createUISlice(...a),
        ...createCostDataSlice(...a),
      }),
      {
        name: STORAGE_KEY,
        storage: createJSONStorage(() => localStorage),
        version: 2,
        // v1→v2: แปลงผ้าม่าน schema เก่า (type:'set' + ชื่อฟิลด์เดิม) → โครงสร้างปัจจุบัน
        migrate: (persisted) => migrateLegacyState(persisted) as AppState,
        partialize: (state) => omitTransientState(state),
      }
    ),
    {
      limit: 20,
      partialize: (state) => {
        // Explicitly selecting what to undo/redo
        const {
          rooms,
          customer,
          shopConfig,
          discount,
          laborCosts,
          accessoryCosts,
          fabricCosts,
          wallpaperCosts,
          areaCosts,
          favorites,
        } = state;
        return {
          rooms,
          customer,
          shopConfig,
          discount,
          laborCosts,
          accessoryCosts,
          fabricCosts,
          wallpaperCosts,
          areaCosts,
          favorites,
        };
      },
    }
  )
);