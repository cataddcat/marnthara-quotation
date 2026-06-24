import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '@/store/useAppStore';
import { FAVORITE_CATEGORIES } from '@/config/enums';

const CAT = FAVORITE_CATEGORIES.CURTAIN_MAIN;

describe('MaterialDraftSlice', () => {
  beforeEach(() => useAppStore.setState({ materialDrafts: {} }));

  it('upsert: normalize key (case/space) + เก็บ cost/sellPrice', () => {
    useAppStore.getState().upsertMaterialDraft(CAT, { code: ' f001 ', cost: 200, sellPrice: 350 });
    const d = useAppStore.getState().materialDrafts[CAT].F001;
    expect(d.code).toBe('F001');
    expect(d.cost).toBe(200);
    expect(d.sellPrice).toBe(350);
  });

  it('upsert merge: ส่งเฉพาะ sellPrice ไม่ลบ cost เดิม', () => {
    const s = useAppStore.getState();
    s.upsertMaterialDraft(CAT, { code: 'F001', cost: 200, sellPrice: 350 });
    s.upsertMaterialDraft(CAT, { code: 'F001', sellPrice: 400 });
    const d = useAppStore.getState().materialDrafts[CAT].F001;
    expect(d.cost).toBe(200);
    expect(d.sellPrice).toBe(400);
  });

  it('remove (รับรหัสดิบ) + clear ต่อหมวด', () => {
    const s = useAppStore.getState();
    s.upsertMaterialDraft(CAT, { code: 'F001', sellPrice: 350 });
    s.upsertMaterialDraft(CAT, { code: 'F002', sellPrice: 360 });
    s.removeMaterialDraft(CAT, 'f001');
    expect(useAppStore.getState().materialDrafts[CAT].F001).toBeUndefined();
    expect(useAppStore.getState().materialDrafts[CAT].F002).toBeDefined();
    s.clearMaterialDrafts(CAT);
    expect(useAppStore.getState().materialDrafts[CAT]).toBeUndefined();
  });

  it('upsert ไม่สร้าง entry เมื่อ code ว่าง', () => {
    useAppStore.getState().upsertMaterialDraft(CAT, { code: '   ', sellPrice: 1 });
    expect(useAppStore.getState().materialDrafts[CAT]).toBeUndefined();
  });
});
