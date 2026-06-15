// src/lib/security/pin.test.ts
import { describe, it, expect } from 'vitest';
import { hashPin, verifyPin, isValidPin } from '@/lib/security/pin';

describe('pin — hash/verify (Web Crypto SHA-256)', () => {
  it('hash ≠ plaintext · deterministic · ยาว 64 hex', async () => {
    const h = await hashPin('1234');
    expect(h).not.toBe('1234');
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(await hashPin('1234')).toBe(h); // เหมือนเดิมทุกครั้ง
  });

  it('pin ต่างกัน → hash ต่างกัน', async () => {
    expect(await hashPin('1234')).not.toBe(await hashPin('4321'));
  });

  it('verify ถูก/ผิด/ว่าง', async () => {
    const h = await hashPin('4321');
    expect(await verifyPin('4321', h)).toBe(true);
    expect(await verifyPin('0000', h)).toBe(false);
    expect(await verifyPin('', h)).toBe(false);
    expect(await verifyPin('4321', '')).toBe(false);
  });
});

describe('isValidPin — เลข 4–6 หลัก', () => {
  it.each([
    ['1234', true],
    ['123456', true],
    ['123', false],
    ['1234567', false],
    ['12a4', false],
    ['', false],
  ])('%s → %s', (pin, ok) => {
    expect(isValidPin(pin)).toBe(ok);
  });
});
