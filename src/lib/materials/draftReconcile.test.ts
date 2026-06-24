import { describe, it, expect } from 'vitest';
import { classifyDraft } from './draftReconcile';

describe('classifyDraft — นโยบาย reconcile (A/B/C)', () => {
  it('C local: ไม่มีใน DB (หรือออฟไลน์) → local', () => {
    expect(classifyDraft({ cost: 100, sellPrice: 200 }, null)).toBe('local');
  });

  it('A match: ทุน+ราคาตรงกับ DB → match', () => {
    expect(classifyDraft({ cost: 100, sellPrice: 200 }, { cost: 100, sellPrice: 200 })).toBe(
      'match'
    );
  });

  it('B conflict: ราคาขายต่าง → conflict', () => {
    expect(classifyDraft({ cost: 100, sellPrice: 250 }, { cost: 100, sellPrice: 200 })).toBe(
      'conflict'
    );
  });

  it('B conflict: ทุนต่าง → conflict', () => {
    expect(classifyDraft({ cost: 120, sellPrice: 200 }, { cost: 100, sellPrice: 200 })).toBe(
      'conflict'
    );
  });

  it('A match: ฉบับร่างยังไม่ตั้งราคา (0/undefined) ไม่ถือว่าขัดแย้ง', () => {
    expect(classifyDraft({}, { cost: 100, sellPrice: 200 })).toBe('match');
    expect(classifyDraft({ cost: 0, sellPrice: 0 }, { cost: 100, sellPrice: 200 })).toBe('match');
  });

  it('A match: ต่างน้อยกว่า epsilon → match (กัน floating error)', () => {
    expect(classifyDraft({ cost: 100.0005, sellPrice: 200 }, { cost: 100, sellPrice: 200 })).toBe(
      'match'
    );
  });
});
