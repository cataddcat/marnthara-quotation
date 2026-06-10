import { StateCreator } from 'zustand';
import { AppState } from '../useAppStore';
import { Customer } from '@/types';
import { newUuid } from '@/lib/id';

export interface CustomerSlice {
  customer: Customer;
  setCustomer: (data: Partial<Customer>) => void;
  /**
   * เติม identity ของลูกค้าแบบ lazy: ถ้ายังไม่มี id → สร้าง UUID, ถ้ายังไม่มี docSeq → 1.
   * คืน { id, code, seq } ให้จุด export เอาไปประกอบรหัสเอกสาร. idempotent + persist.
   */
  ensureCustomerIdentity: () => { id: string; code?: string; seq: number };
  /** เพิ่มเลขรันเอกสารต่อลูกค้า (+1 เงียบ ๆ) — สำหรับกรณีออกเอกสารฉบับใหม่ */
  bumpDocSeq: () => void;
}

export const createCustomerSlice: StateCreator<
  AppState,
  [['zustand/persist', unknown], ['temporal', unknown]],
  [],
  CustomerSlice
> = (set, get) => ({
  // หมายเหตุ: ไม่ใส่ id/code/docSeq ใน default โดยตั้งใจ → เริ่มงานใหม่ (resetProject) id หาย
  // → export ครั้งถัดได้ UUID ใหม่ = รหัสต่างกัน (กลไกผ่าน verification "ชื่อซ้ำ คนละงาน")
  customer: {
    name: '',
    phone: '',
    address: '',
    taxId: '',
    installationAddress: '',
    useSameAddress: true,
    showInstallationAddress: true,
  },
  setCustomer: (data) =>
    set((state) => ({
      customer: { ...state.customer, ...data },
    })),
  ensureCustomerIdentity: () => {
    const cur = get().customer;
    const id = cur.id ?? newUuid();
    const seq = cur.docSeq ?? 1;
    if (cur.id !== id || cur.docSeq !== seq) {
      set((state) => ({ customer: { ...state.customer, id, docSeq: seq } }));
    }
    return { id, code: cur.code, seq };
  },
  bumpDocSeq: () =>
    set((state) => ({
      customer: { ...state.customer, docSeq: (state.customer.docSeq ?? 1) + 1 },
    })),
});
