// src/lib/customers/contract.test.ts
import { describe, it, expect } from 'vitest';
import {
  isCustomerContract,
  parseCustomerPayload,
  CUSTOMER_CONTRACT_MAGIC,
  CUSTOMER_CONTRACT_VERSION,
} from '@/lib/customers/contract';

describe('isCustomerContract', () => {
  it('true เฉพาะ object ที่มี contract magic ตรง', () => {
    expect(isCustomerContract({ contract: CUSTOMER_CONTRACT_MAGIC })).toBe(true);
    expect(isCustomerContract({ contract: 'marnthara.catalog' })).toBe(false);
    expect(isCustomerContract(null)).toBe(false);
    expect(isCustomerContract([])).toBe(false);
  });
});

describe('parseCustomerPayload', () => {
  it('contract เต็ม → entries', () => {
    const res = parseCustomerPayload({
      contract: CUSTOMER_CONTRACT_MAGIC,
      version: CUSTOMER_CONTRACT_VERSION,
      entries: [{ code: 'C0007', name: 'สมชาย', phone: '08x' }],
    });
    expect(res.ok).toBe(true);
    expect(res.entries).toHaveLength(1);
    expect(res.entries[0].code).toBe('C0007');
  });

  it('array ตรง ๆ → entries (ผ่อนปรนให้วางง่าย)', () => {
    const res = parseCustomerPayload([{ code: 'C1', name: 'a' }]);
    expect(res.ok).toBe(true);
    expect(res.entries).toHaveLength(1);
  });

  it('entry ขาด code/name → ok false', () => {
    expect(parseCustomerPayload([{ name: 'x' }]).ok).toBe(false);
    expect(
      parseCustomerPayload({
        contract: CUSTOMER_CONTRACT_MAGIC,
        version: CUSTOMER_CONTRACT_VERSION,
        entries: [{ code: '', name: 'x' }],
      }).ok
    ).toBe(false);
  });

  it('contract magic ผิด → ok false', () => {
    expect(parseCustomerPayload({ contract: 'wrong', version: 1, entries: [] }).ok).toBe(false);
  });
});
