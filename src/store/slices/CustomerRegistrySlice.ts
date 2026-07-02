import { StateCreator } from 'zustand';
import { AppState } from '../useAppStore';
import { newUuid } from '@/lib/id';
import { normalizeCode } from '@/lib/codes';
import {
  parseCustomerPayload,
  type CustomerEntry,
  type CustomerImportResult,
  type RegistryCustomer,
} from '@/lib/customers/contract';
import { customerSync } from '@/lib/sync/customerSyncBridge';

// ─────────────────────────────────────────────────────────────────────────────
// CustomerRegistrySlice — ทะเบียนลูกค้า (mirror)
//
// local-only: import ไฟล์/วาง → เก็บใน customerRegistry (persist) ใช้เลือกลูกค้าเปิดงานใหม่
// signed-in: syncEngine ป้อน mirror จาก Firestore (setCustomerRegistryMirror) + mutation ดันขึ้น cloud
// ─────────────────────────────────────────────────────────────────────────────

export interface CustomerRegistrySlice {
  customerRegistry: RegistryCustomer[];

  /** import bulk (Customer Contract / array) — upsert by code + push cloud */
  importCustomers: (payload: unknown) => CustomerImportResult;
  /** เพิ่ม/แก้ลูกค้ารายเดียว (จาก CustomerDirectory) */
  upsertCustomer: (entry: CustomerEntry) => void;
  removeCustomer: (code: string) => void;
  clearCustomerRegistry: () => void;

  /** syncEngine ป้อน mirror ทั้งก้อนจาก Firestore snapshot */
  setCustomerRegistryMirror: (list: RegistryCustomer[]) => void;
}

const upsertByCode = (
  list: RegistryCustomer[],
  entry: CustomerEntry
): { next: RegistryCustomer[]; merged: RegistryCustomer } => {
  const key = normalizeCode(entry.code);
  const idx = list.findIndex((c) => normalizeCode(c.code) === key);
  const merged: RegistryCustomer = {
    id: idx >= 0 ? list[idx].id : newUuid(),
    ...(idx >= 0 ? list[idx] : {}),
    ...entry,
    // provenance — reconcile ตอน sign-in แรกใช้เทียบ "local ใหม่กว่า" (กัน cloud ทับแก้ไข offline เงียบ ๆ)
    updated_at: entry.updated_at ?? new Date().toISOString(),
  };
  const next = list.slice();
  if (idx >= 0) next[idx] = merged;
  else next.push(merged);
  return { next, merged };
};

export const createCustomerRegistrySlice: StateCreator<
  AppState,
  [['zustand/persist', unknown], ['temporal', unknown]],
  [],
  CustomerRegistrySlice
> = (set) => ({
  customerRegistry: [],

  importCustomers: (payload) => {
    const { ok, entries, error } = parseCustomerPayload(payload);
    if (!ok) return { ok: false, imported: 0, skipped: 0, errors: [error ?? 'ข้อมูลไม่ถูกต้อง'] };

    const pushed: RegistryCustomer[] = [];
    set((state) => {
      let list = state.customerRegistry;
      for (const e of entries) {
        const { next, merged } = upsertByCode(list, e);
        list = next;
        pushed.push(merged);
      }
      return { customerRegistry: list };
    });
    customerSync().pushCustomers(pushed);
    return { ok: true, imported: entries.length, skipped: 0, errors: [] };
  },

  upsertCustomer: (entry) => {
    let merged: RegistryCustomer | null = null;
    set((state) => {
      const res = upsertByCode(state.customerRegistry, entry);
      merged = res.merged;
      return { customerRegistry: res.next };
    });
    if (merged) customerSync().pushCustomer(merged);
  },

  removeCustomer: (code) => {
    const key = normalizeCode(code);
    set((state) => ({
      customerRegistry: state.customerRegistry.filter((c) => normalizeCode(c.code) !== key),
    }));
    customerSync().deleteCustomerRemote(key);
  },

  clearCustomerRegistry: () => set(() => ({ customerRegistry: [] })),

  setCustomerRegistryMirror: (list) => set(() => ({ customerRegistry: list })),
});
