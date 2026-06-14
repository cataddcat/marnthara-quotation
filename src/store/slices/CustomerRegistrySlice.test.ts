// src/store/slices/CustomerRegistrySlice.test.ts
// CustomerRegistrySlice — import/upsert/remove (customerSync() เป็น no-op ในเทสต์)

import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '@/store/useAppStore';
import { CUSTOMER_CONTRACT_MAGIC } from '@/lib/customers/contract';

const reset = () => useAppStore.setState({ customerRegistry: [] });
const s = () => useAppStore.getState();

describe('👥 CustomerRegistrySlice — importCustomers', () => {
  beforeEach(reset);

  it('นำเข้า contract → เพิ่มลูกค้า + คืน imported', () => {
    const res = s().importCustomers({
      contract: CUSTOMER_CONTRACT_MAGIC,
      version: 1,
      entries: [
        { code: 'C0007', name: 'สมชาย' },
        { code: 'C0008', name: 'สมหญิง' },
      ],
    });
    expect(res.ok).toBe(true);
    expect(res.imported).toBe(2);
    expect(s().customerRegistry).toHaveLength(2);
  });

  it('upsert by code (case-insensitive) → ไม่ซ้ำ + อัปเดตชื่อ', () => {
    s().importCustomers([{ code: 'C0007', name: 'เก่า' }]);
    s().importCustomers([{ code: ' c0007 ', name: 'ใหม่' }]);
    expect(s().customerRegistry).toHaveLength(1);
    expect(s().customerRegistry[0].name).toBe('ใหม่');
  });

  it('payload ผิด → ok false ไม่แตะ registry', () => {
    s().importCustomers([{ code: 'C1', name: 'a' }]);
    const res = s().importCustomers([{ name: 'ไม่มีรหัส' }]);
    expect(res.ok).toBe(false);
    expect(s().customerRegistry).toHaveLength(1);
  });
});

describe('👥 CustomerRegistrySlice — upsert / remove / clear', () => {
  beforeEach(reset);

  it('upsertCustomer → เพิ่มใหม่แล้วแก้ทับ (id คงเดิม)', () => {
    s().upsertCustomer({ code: 'C1', name: 'A' });
    const id = s().customerRegistry[0].id;
    s().upsertCustomer({ code: 'C1', name: 'A2', phone: '08x' });
    expect(s().customerRegistry).toHaveLength(1);
    expect(s().customerRegistry[0].name).toBe('A2');
    expect(s().customerRegistry[0].phone).toBe('08x');
    expect(s().customerRegistry[0].id).toBe(id);
  });

  it('removeCustomer → ลบตาม code (case-insensitive)', () => {
    s().upsertCustomer({ code: 'C1', name: 'A' });
    s().upsertCustomer({ code: 'C2', name: 'B' });
    s().removeCustomer('c1');
    expect(s().customerRegistry.map((c) => c.code)).toEqual(['C2']);
  });

  it('clearCustomerRegistry → ว่าง', () => {
    s().upsertCustomer({ code: 'C1', name: 'A' });
    s().clearCustomerRegistry();
    expect(s().customerRegistry).toHaveLength(0);
  });
});
