// src/lib/backup.test.ts
// parseBackup: validate ขั้นต่ำ + migrate schema เก่า (เส้นทางเดียวกับ persist migration)

import { describe, it, expect } from 'vitest';
import { parseBackup } from './backup';

const validBackup = {
  customer: { name: 'สมชาย', phone: '081' },
  rooms: [
    {
      id: 'r1',
      name: 'ห้องนอน',
      is_suspended: false,
      items: [{ id: 'i1', type: 'curtain', width_m: '2.00', height_m: '2.50', style: 'ลอน' }],
    },
  ],
  production: { fabricCosts: { F001: 250 } },
  version: '1.0.0',
  exportDate: '2026-01-01T00:00:00.000Z',
};

describe('parseBackup — ไฟล์ปกติ', () => {
  it('ผ่าน + คงฟิลด์เดิม (loose ไม่ strip)', () => {
    const r = parseBackup(validBackup);
    expect(r.ok).toBe(true);
    const item = r.data?.rooms?.[0].items[0] as Record<string, unknown>;
    expect(item.width_m).toBe('2.00'); // ฟิลด์นอก schema ขั้นต่ำต้องไม่หาย
    expect(r.data?.production?.fabricCosts).toEqual({ F001: 250 });
  });

  it('ไม่มี rooms (backup บางส่วน) → ผ่าน', () => {
    const r = parseBackup({ customer: { name: 'x' } });
    expect(r.ok).toBe(true);
    expect(r.data?.rooms).toBeUndefined();
  });
});

describe('parseBackup — migrate schema เก่า', () => {
  it("item type:'set' → 'curtain' + เดา layer_mode (เหมือน persist migration)", () => {
    const legacy = {
      rooms: [
        {
          id: 'r1',
          name: 'A',
          items: [
            { id: 'i1', type: 'set', fabric_variant: 'ทึบ&โปร่ง', fabric_code: 'F9', width_m: 2 },
          ],
        },
      ],
    };
    const r = parseBackup(legacy);
    expect(r.ok).toBe(true);
    const item = r.data?.rooms?.[0].items[0] as Record<string, unknown>;
    expect(item.type).toBe('curtain');
    expect(item.layer_mode).toBe('double');
    expect(item.code).toBe('F9'); // fabric_code → code
    expect(item.width_m).toBe('2'); // number → string
  });

  it('ค่าบริการที่ปนใน accessoryCosts → ย้ายไป serviceCosts (v2→v3)', () => {
    const legacy = {
      production: {
        accessoryCosts: { rail_wave: 130, install_point: 300 },
      },
    };
    const r = parseBackup(legacy);
    expect(r.ok).toBe(true);
    expect(r.data?.production?.accessoryCosts).toEqual({ rail_wave: 130 });
    expect(r.data?.production?.serviceCosts).toEqual({ install_point: 300 });
  });
});

describe('parseBackup — ไฟล์ผิดรูปต้องถูกปฏิเสธ (ไม่ import บางส่วน)', () => {
  it('rooms ไม่ใช่ array → fail', () => {
    const r = parseBackup({ rooms: { id: 'r1' } });
    expect(r.ok).toBe(false);
    expect(r.error).toContain('rooms');
  });

  it('item ไม่มี id/type → fail', () => {
    const r = parseBackup({ rooms: [{ id: 'r1', name: 'A', items: [{ width_m: 2 }] }] });
    expect(r.ok).toBe(false);
  });

  it('cost vault มีค่าไม่ใช่ตัวเลข → fail (กัน NaN ในการคำนวณกำไร)', () => {
    const r = parseBackup({ production: { fabricCosts: { F001: 'แพง' } } });
    expect(r.ok).toBe(false);
  });

  it('ไม่ใช่ object → fail', () => {
    expect(parseBackup('hello').ok).toBe(false);
    expect(parseBackup(null).ok).toBe(false);
  });
});
