import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { temporal } from 'zundo';
import { STORAGE_KEY } from '@/config/constants';
import { migrateLegacyState, adoptCurrentJobIntoRegistry } from './migrations';
import { registerClearUndo } from './temporalBridge';

// Import Slices
import { createCustomerSlice, CustomerSlice } from './slices/CustomerSlice';
import { createProjectSlice, ProjectSlice } from './slices/ProjectSlice';
import { createShopProfileSlice, ShopProfileSlice } from './slices/ShopProfileSlice';
import { createInventorySlice, InventorySlice } from './slices/InventorySlice';
import { createUISlice, UISlice } from './slices/UISlice';
import { createCostDataSlice, CostDataSlice } from './slices/CostDataSlice';
import { createPaymentSlice, PaymentSlice } from './slices/PaymentSlice';
import { createJobsSlice, JobsSlice } from './slices/JobsSlice';
import {
  createCustomerRegistrySlice,
  CustomerRegistrySlice,
} from './slices/CustomerRegistrySlice';

// --- [QOL] EXPORT TYPES HERE ---
// เพื่อให้ไฟล์อื่น import { ProjectSlice } from '@/store/useAppStore' ได้เลย
// ไม่ต้องไปจำว่าไฟล์ Slice ชื่ออะไร
export type { CustomerSlice } from './slices/CustomerSlice';
export type { ProjectSlice } from './slices/ProjectSlice';
export type { ShopProfileSlice } from './slices/ShopProfileSlice';
export type { InventorySlice } from './slices/InventorySlice';
export type { UISlice, ModalType } from './slices/UISlice';
export type { CostDataSlice, LaborCost, CostInclude } from './slices/CostDataSlice';
export type { PaymentSlice, ReceiptEntry, ExpenseEntry } from './slices/PaymentSlice';
export type { JobsSlice } from './slices/JobsSlice';
export type { CustomerRegistrySlice } from './slices/CustomerRegistrySlice';
// formulas เป็น compile-time constant แล้ว — import { FORMULAS } from '@/config/formulas'
export type { FormulaConfig } from '@/config/formulas';

// Combine Types
export type AppState = CustomerSlice &
  ProjectSlice &
  ShopProfileSlice &
  InventorySlice &
  UISlice &
  CostDataSlice &
  PaymentSlice &
  JobsSlice &
  CustomerRegistrySlice;

const omitTransientState = (state: AppState): Partial<AppState> => {
  const newState = { ...state };
  delete (newState as Partial<AppState>).activeModal;
  delete (newState as Partial<AppState>).modalProps;
  delete (newState as Partial<AppState>).modalStack;
  // product master (SKU registry + ทุนสินค้า) = source of truth ภายนอก → ดึงจาก DB (useCatalogStore,
  // HANDOFF §11.8) ไม่ persist ในแอป. (ค่าแรง/บริการ/accessory legacy = ของร้านเอง ยัง persist)
  delete (newState as Partial<AppState>).favorites;
  delete (newState as Partial<AppState>).fabricCosts;
  delete (newState as Partial<AppState>).wallpaperCosts;
  delete (newState as Partial<AppState>).areaCosts;
  delete (newState as Partial<AppState>).hardwareCosts;
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
        ...createPaymentSlice(...a),
        ...createJobsSlice(...a),
        ...createCustomerRegistrySlice(...a),
      }),
      {
        name: STORAGE_KEY,
        storage: createJSONStorage(() => localStorage),
        version: 6,
        // v1→v2: แปลงผ้าม่าน schema เก่า (type:'set' + ชื่อฟิลด์เดิม) → โครงสร้างปัจจุบัน
        // v2→v3: ย้ายค่าบริการ (install/transport/fuel) จาก accessoryCosts → serviceCosts
        // v3→v4: ชื่อร้าน default เดิม "Marnthara Smart Quotation" → "ม่านธารา"
        // v4→v5: เติม serviceCosts.shipping_per_job + costInclude.shipping ให้ store เดิม
        // v5→v6: รับงานที่ค้างอยู่เข้าชั้นวางงาน (jobs[]) สำหรับระบบสลับงาน
        migrate: (persisted) =>
          adoptCurrentJobIntoRegistry(
            migrateLegacyState(persisted) as Record<string, unknown>
          ) as unknown as AppState,
        partialize: (state) => omitTransientState(state),
      }
    ),
    {
      limit: 20,
      partialize: (state) => {
        // Explicitly selecting what to undo/redo
        // product master (favorites + ทุนสินค้า) = DB-owned (useCatalogStore) → ไม่อยู่ใน undo
        const {
          rooms,
          customer,
          shopConfig,
          discount,
          laborCosts,
          serviceCosts,
          accessoryCosts,
          receipts,
          expenses,
        } = state;
        return {
          rooms,
          customer,
          shopConfig,
          discount,
          laborCosts,
          serviceCosts,
          accessoryCosts,
          receipts,
          expenses,
        };
      },
    }
  )
);

// เชื่อม temporalBridge → ให้ JobsSlice ล้างประวัติ undo ตอนสลับ/สร้างงาน โดยไม่ import วน
registerClearUndo(() => useAppStore.temporal.getState().clear());