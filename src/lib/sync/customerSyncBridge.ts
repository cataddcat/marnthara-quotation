// src/lib/sync/customerSyncBridge.ts
// สะพาน CustomerRegistrySlice ↔ syncEngine (Firestore) — no-op จนกว่าจะ sign-in
// import แค่ type (ไม่ผูก store/Firestore)

import type { RegistryCustomer } from '@/lib/customers/contract';

export interface CustomerSyncBridge {
  pushCustomer: (c: RegistryCustomer) => void;
  pushCustomers: (cs: RegistryCustomer[]) => void;
  deleteCustomerRemote: (code: string) => void;
}

const NOOP: CustomerSyncBridge = {
  pushCustomer: () => {},
  pushCustomers: () => {},
  deleteCustomerRemote: () => {},
};

let bridge: CustomerSyncBridge = NOOP;

export const setCustomerSyncBridge = (impl: CustomerSyncBridge): void => {
  bridge = impl;
};

export const resetCustomerSyncBridge = (): void => {
  bridge = NOOP;
};

export const customerSync = (): CustomerSyncBridge => bridge;
