import { StateCreator } from 'zustand';
import { AppState } from '../useAppStore';
import { Customer } from '@/types';

export interface CustomerSlice {
  customer: Customer;
  setCustomer: (data: Partial<Customer>) => void;
}

export const createCustomerSlice: StateCreator<
  AppState,
  [['zustand/persist', unknown], ['temporal', unknown]],
  [],
  CustomerSlice
> = (set) => ({
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
});
