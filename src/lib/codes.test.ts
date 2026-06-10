// src/lib/codes.test.ts
// normalizeCode + vaultLookup — กันทุน lookup ไม่เจอเพราะ case/space ไม่ตรง

import { describe, it, expect } from 'vitest';
import { normalizeCode, vaultLookup } from './codes';

describe('normalizeCode', () => {
  it('ตัด space + ตัวพิมพ์ใหญ่', () => {
    expect(normalizeCode('  f001 ')).toBe('F001');
    expect(normalizeCode('F001')).toBe('F001');
    expect(normalizeCode('ผ้า-01')).toBe('ผ้า-01'); // อักษรไทยไม่เปลี่ยน
  });
});

describe('vaultLookup', () => {
  const vault = { F001: 250, f002: 80 };

  it('เจอ key ตรง ๆ ก่อน (ข้อมูลเก่าที่เขียนด้วยรหัสดิบ)', () => {
    expect(vaultLookup(vault, 'f002')).toBe(80);
    expect(vaultLookup(vault, 'F001')).toBe(250);
  });

  it('ไม่เจอ key ดิบ → fallback หา key normalize (เคส importCatalog เขียน UPPERCASE)', () => {
    expect(vaultLookup(vault, 'f001')).toBe(250);
    expect(vaultLookup(vault, ' f001 ')).toBe(250);
  });

  it('ไม่พบ/ไม่มีข้อมูล → 0', () => {
    expect(vaultLookup(vault, 'X999')).toBe(0);
    expect(vaultLookup(vault, undefined)).toBe(0);
    expect(vaultLookup(undefined, 'F001')).toBe(0);
  });
});
