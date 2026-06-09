// src/lib/docName.test.ts
// ทดสอบ util มาตรฐานชื่อเอกสาร (pure functions)

import { describe, it, expect } from 'vitest';
import {
  sanitizeFilenameSegment,
  customerToken,
  formatDocCode,
  yyyymmdd,
  buildDocFileBase,
} from './docName';

describe('sanitizeFilenameSegment', () => {
  it('แทนอักขระต้องห้าม / \\ : * ? " < > | ด้วย -', () => {
    expect(sanitizeFilenameSegment('a/b\\c:d*e?f"g<h>i|j')).toBe('a-b-c-d-e-f-g-h-i-j');
  });

  it('แทนเว้นวรรคด้วย - และยุบซ้ำ', () => {
    expect(sanitizeFilenameSegment('คุณ สมชาย   ใจดี')).toBe('คุณ-สมชาย-ใจดี');
  });

  it('แทน emoji ด้วย - แล้วตัดขอบ (คงตัวอักษรไทย)', () => {
    expect(sanitizeFilenameSegment('สมชาย😀')).toBe('สมชาย');
    expect(sanitizeFilenameSegment('ร้าน🎉ม่าน')).toBe('ร้าน-ม่าน');
  });

  it('ตัด - และ . นำหน้า/ตามท้าย', () => {
    expect(sanitizeFilenameSegment('  -.ชื่อ.-  ')).toBe('ชื่อ');
  });

  it('ว่าง / undefined / มีแต่ช่องว่าง → ไม่ระบุชื่อ', () => {
    expect(sanitizeFilenameSegment('')).toBe('ไม่ระบุชื่อ');
    expect(sanitizeFilenameSegment('   ')).toBe('ไม่ระบุชื่อ');
    expect(sanitizeFilenameSegment(undefined)).toBe('ไม่ระบุชื่อ');
  });
});

describe('customerToken', () => {
  it('C + 4 hex แรกของ UUID (พิมพ์ใหญ่)', () => {
    expect(customerToken('7a3f1b2c-1234-4abc-89de-000011112222')).toBe('C7A3F');
  });

  it('UUID ต่างกัน → token ต่างกัน (กุญแจแยกลูกค้าชื่อซ้ำ)', () => {
    const a = customerToken('7a3f1b2c-0000-4000-8000-000000000000');
    const b = customerToken('9c1d2e3f-0000-4000-8000-000000000000');
    expect(a).toBe('C7A3F');
    expect(b).toBe('C9C1D');
    expect(a).not.toBe(b);
  });

  it('ไม่มี id → C0000', () => {
    expect(customerToken(undefined)).toBe('C0000');
    expect(customerToken('')).toBe('C0000');
  });
});

describe('formatDocCode', () => {
  it('มี code → ใช้ code เป็นโทเค็น', () => {
    expect(formatDocCode({ id: '7a3f1b2c-0000-4000-8000-0', code: 'C0007', seq: 1 })).toBe(
      'C0007-001'
    );
  });

  it('ไม่มี code → ใช้ C{4hex} จาก id', () => {
    expect(formatDocCode({ id: '7a3f1b2c-0000-4000-8000-0', seq: 1 })).toBe('C7A3F-001');
  });

  it('pad เลขรัน 3 หลัก', () => {
    expect(formatDocCode({ id: '7a3f1b2c-0000-4000-8000-0', seq: 12 })).toBe('C7A3F-012');
    expect(formatDocCode({ id: '7a3f1b2c-0000-4000-8000-0', seq: 0 })).toBe('C7A3F-001');
  });

  it('sanitize code ที่มีอักขระแปลก', () => {
    expect(formatDocCode({ code: 'C 00/7', seq: 1 })).toBe('C-00-7-001');
  });
});

describe('yyyymmdd', () => {
  it('คืนรูปแบบ YYYYMMDD (เวลาท้องถิ่น)', () => {
    expect(yyyymmdd(new Date(2026, 5, 9))).toBe('20260609'); // เดือน 5 = มิถุนายน
    expect(yyyymmdd(new Date(2026, 0, 1))).toBe('20260101');
  });
});

describe('buildDocFileBase', () => {
  const d = new Date(2026, 5, 9);

  it('ประกอบ 4 ส่วนถูกลำดับ: <type>_<name>_<code>_<YYYYMMDD>', () => {
    expect(buildDocFileBase('mtr-backup', 'สมชาย', 'C7A3F-001', d)).toBe(
      'mtr-backup_สมชาย_C7A3F-001_20260609'
    );
  });

  it('ชื่อลูกค้าว่าง → ไม่ระบุชื่อ', () => {
    expect(buildDocFileBase('quotation', '', 'C7A3F-001', d)).toBe(
      'quotation_ไม่ระบุชื่อ_C7A3F-001_20260609'
    );
  });

  it('verification: ลูกค้าชื่อเดียวกัน UUID ต่างกัน → ชื่อไฟล์รหัสต่างกัน', () => {
    const codeA = formatDocCode({ id: '7a3f1b2c-0000-4000-8000-0', seq: 1 });
    const codeB = formatDocCode({ id: '9c1d2e3f-0000-4000-8000-0', seq: 1 });
    const fileA = buildDocFileBase('mtr-backup', 'สมชาย', codeA, d);
    const fileB = buildDocFileBase('mtr-backup', 'สมชาย', codeB, d);
    expect(fileA).not.toBe(fileB);
    expect(fileA).toBe('mtr-backup_สมชาย_C7A3F-001_20260609');
    expect(fileB).toBe('mtr-backup_สมชาย_C9C1D-001_20260609');
  });
});
