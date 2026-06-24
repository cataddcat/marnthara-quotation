import { StateCreator } from 'zustand';
import { AppState } from '../useAppStore';
import { normalizeCode } from '@/lib/codes';

// ────────────────────────────────────────────────────────────────────────────
// ฉบับร่างวัสดุ "ในเครื่อง" (offline-first) — code + ทุน + ราคาขาย ที่ผู้ใช้กรอกเอง
// ────────────────────────────────────────────────────────────────────────────
// ต่างจาก product master (favorites/catalog = DB-owned, read-only, ไม่ persist — HANDOFF §11.8):
//   ฉบับร่างนี้เป็น "ของผู้ใช้" → persist ในเครื่อง, ใช้ซ้ำข้ามจุด/ข้ามงาน (shop-level),
//   ไม่เข้า undo (reference data), และ "ยอม" ให้ DB เมื่อออนไลน์ (reconcile ในคลังวัสดุ).
//   ไม่เคยถูก push กลับขึ้น Firestore — แก้ทุน/SKU จริงทำที่เครื่องมือภายนอกเท่านั้น.
// key หมวด = FAVORITE_CATEGORIES, key รหัส = normalizeCode (ให้ตรงกับ vault/contract).
// ────────────────────────────────────────────────────────────────────────────

export interface MaterialDraft {
  /** รหัส normalize แล้ว (UPPERCASE, trimmed) — ตรงกับ key ใน map */
  code: string;
  /** ทุน/หน่วยของหมวด (optional — กรอกในคลังวัสดุ) */
  cost?: number;
  /** ราคาขาย/หน่วย (optional — มาจากฟอร์มหน้างานหรือคลังวัสดุ) */
  sellPrice?: number;
  /** epoch ms ของการแก้ล่าสุด */
  updatedAt: number;
}

export interface MaterialDraftSlice {
  /** หมวด → { normCode → ฉบับร่าง } */
  materialDrafts: Record<string, Record<string, MaterialDraft>>;

  /** เพิ่ม/อัปเดตฉบับร่าง — merge ฟิลด์ (ส่งเฉพาะที่จะแก้; ฟิลด์ที่ไม่ส่งคงค่าเดิม) */
  upsertMaterialDraft: (
    category: string,
    draft: { code: string; cost?: number; sellPrice?: number }
  ) => void;
  removeMaterialDraft: (category: string, code: string) => void;
  /** ล้างทั้งหมด (ไม่ระบุหมวด) หรือเฉพาะหมวดเดียว */
  clearMaterialDrafts: (category?: string) => void;
}

export const createMaterialDraftSlice: StateCreator<
  AppState,
  [['zustand/persist', unknown], ['temporal', unknown]],
  [],
  MaterialDraftSlice
> = (set) => ({
  materialDrafts: {},

  upsertMaterialDraft: (category, draft) =>
    set((state) => {
      const code = normalizeCode(draft.code);
      if (!code) return { materialDrafts: state.materialDrafts };

      const catMap = state.materialDrafts[category] || {};
      const prev = catMap[code];
      const next: MaterialDraft = {
        code,
        cost: draft.cost ?? prev?.cost,
        sellPrice: draft.sellPrice ?? prev?.sellPrice,
        updatedAt: Date.now(),
      };

      return {
        materialDrafts: {
          ...state.materialDrafts,
          [category]: { ...catMap, [code]: next },
        },
      };
    }),

  removeMaterialDraft: (category, code) =>
    set((state) => {
      const catMap = state.materialDrafts[category];
      const norm = normalizeCode(code);
      if (!catMap || !(norm in catMap)) return { materialDrafts: state.materialDrafts };

      const nextCat = { ...catMap };
      delete nextCat[norm];
      return { materialDrafts: { ...state.materialDrafts, [category]: nextCat } };
    }),

  clearMaterialDrafts: (category) =>
    set((state) => {
      if (!category) return { materialDrafts: {} };
      if (!state.materialDrafts[category]) return { materialDrafts: state.materialDrafts };
      const next = { ...state.materialDrafts };
      delete next[category];
      return { materialDrafts: next };
    }),
});
