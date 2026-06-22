// src/lib/backup-export.test.ts
import { describe, it, expect } from 'vitest';
import { buildBackupObject } from '@/lib/backup-export';
import { useAppStore } from '@/store/useAppStore';

describe('buildBackupObject', () => {
  it('รวม customer/rooms/discount/payments/production(ของร้าน) + version', () => {
    useAppStore.setState({
      receipts: [{ id: 'r', label: 'มัดจำ', amount: 100, date: '2026-06-15' }],
      expenses: [],
    });
    const obj = buildBackupObject(useAppStore.getState());

    expect(obj.customer).toBeDefined();
    expect(obj.rooms).toBeDefined();
    expect(obj.discount).toBeDefined();
    // product master (favorites + ทุนสินค้า) = DB ภายนอก → ไม่อยู่ใน backup (HANDOFF §11.8)
    expect(obj.favorites).toBeUndefined();

    const payments = obj.payments as { receipts: unknown[]; expenses: unknown[] };
    expect(payments.receipts).toHaveLength(1);

    const production = obj.production as Record<string, unknown>;
    // เฉพาะ "ของร้านเอง" (ค่าเย็บ/บริการ/accessory legacy + สวิตช์)
    for (const k of ['laborCosts', 'serviceCosts', 'accessoryCosts', 'costInclude']) {
      expect(production[k]).toBeDefined();
    }
    // ทุนสินค้า ไม่อยู่ใน backup แล้ว
    for (const k of ['hardwareCosts', 'fabricCosts', 'wallpaperCosts', 'areaCosts']) {
      expect(production[k]).toBeUndefined();
    }

    expect(obj.version).toBe('1.0.0');
    expect(typeof obj.exportDate).toBe('string');
  });
});
