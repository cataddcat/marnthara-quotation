// src/lib/backup-export.test.ts
import { describe, it, expect } from 'vitest';
import { buildBackupObject } from '@/lib/backup-export';
import { useAppStore } from '@/store/useAppStore';

describe('buildBackupObject', () => {
  it('รวม customer/rooms/discount/favorites/payments/production + version', () => {
    useAppStore.setState({
      receipts: [{ id: 'r', label: 'มัดจำ', amount: 100, date: '2026-06-15' }],
      expenses: [],
    });
    const obj = buildBackupObject(useAppStore.getState());

    expect(obj.customer).toBeDefined();
    expect(obj.rooms).toBeDefined();
    expect(obj.discount).toBeDefined();
    expect(obj.favorites).toBeDefined();

    const payments = obj.payments as { receipts: unknown[]; expenses: unknown[] };
    expect(payments.receipts).toHaveLength(1);

    const production = obj.production as Record<string, unknown>;
    // ครบทุก cost vault (กัน backup ตกข้อมูล)
    for (const k of [
      'laborCosts',
      'serviceCosts',
      'accessoryCosts',
      'hardwareCosts',
      'fabricCosts',
      'wallpaperCosts',
      'areaCosts',
      'costInclude',
    ]) {
      expect(production[k]).toBeDefined();
    }

    expect(obj.version).toBe('1.0.0');
    expect(typeof obj.exportDate).toBe('string');
  });
});
