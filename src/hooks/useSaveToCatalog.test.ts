import { describe, it, expect } from 'vitest';
import { classifyCatalogSave } from './useSaveToCatalog';

describe('classifyCatalogSave', () => {
  it('ราคา <= 0 → invalid', () => {
    expect(classifyCatalogSave(undefined, 0)).toBe('invalid');
    expect(classifyCatalogSave(100, -5)).toBe('invalid');
  });

  it('รหัสใหม่ (ยังไม่มีในคลัง) → add', () => {
    expect(classifyCatalogSave(undefined, 450)).toBe('add');
  });

  it('มีอยู่แล้วและราคาตรงกัน → noop (รวม tolerance)', () => {
    expect(classifyCatalogSave(450, 450)).toBe('noop');
    expect(classifyCatalogSave(450, 450.005)).toBe('noop');
  });

  it('มีอยู่แล้วแต่ราคาต่าง → update (ต้องยืนยันก่อนทับ)', () => {
    expect(classifyCatalogSave(450, 500)).toBe('update');
    expect(classifyCatalogSave(450, 400)).toBe('update');
  });

  it('ราคาเดิม 0 (ยังไม่ตั้ง) + ราคาใหม่ > 0 → update', () => {
    expect(classifyCatalogSave(0, 450)).toBe('update');
  });
});
