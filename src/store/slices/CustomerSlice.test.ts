// src/store/slices/CustomerSlice.test.ts
// CustomerSlice — setCustomer merge partial

import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '@/store/useAppStore';

const store = () => useAppStore.getState();

beforeEach(() => {
  useAppStore.setState({
    customer: {
      name: '',
      phone: '',
      address: '',
      taxId: '',
      installationAddress: '',
      useSameAddress: true,
      showInstallationAddress: true,
    },
  });
});

describe('CustomerSlice', () => {
  it('setCustomer merge partial โดยไม่ทับ field อื่น', () => {
    store().setCustomer({ name: 'คุณสมชาย' });
    expect(store().customer.name).toBe('คุณสมชาย');
    expect(store().customer.useSameAddress).toBe(true);
  });

  it('setCustomer หลายครั้ง → สะสมค่า', () => {
    store().setCustomer({ name: 'A' });
    store().setCustomer({ phone: '081-000-0000' });
    expect(store().customer).toMatchObject({ name: 'A', phone: '081-000-0000' });
  });

  it('setCustomer ตั้ง useSameAddress = false', () => {
    store().setCustomer({ useSameAddress: false });
    expect(store().customer.useSameAddress).toBe(false);
  });
});
