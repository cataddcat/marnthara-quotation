// src/lib/materials/captureDrafts.ts
// บันทึก "รหัสที่ผู้ใช้สร้างเอง + ราคาขาย" เป็นฉบับร่างใน "ราคาของฉัน" อัตโนมัติตอนเซฟรายการ
// → รหัส free-code จัดการได้ (แก้ราคา/ลบ) ที่ MaterialSummaryModal แทนที่จะเป็น derive read-only อย่างเดียว.
// - เก็บเฉพาะที่มี "รหัส + ราคาขาย > 0"
// - ข้ามรหัสที่เป็นของคลัง (DB master) เมื่อออนไลน์; ออฟไลน์เก็บไว้ก่อน (reconcile ทีหลัง — HANDOFF §11.9)
// - เก็บ "ราคาขาย" เท่านั้น (ไม่มีทุน) → useMaterialDraftHydration ข้าม draft ไร้ทุน = ไม่กวน cost vault

import type { ItemData } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { useCatalogStore } from '@/store/standalone/useCatalogStore';
import { normalizeCode } from '@/lib/codes';
import { itemCodeEntries } from './projectCodes';

export function captureItemMaterialDrafts(item: ItemData): void {
  const entries = itemCodeEntries(item).filter((e) => e.sellPrice > 0);
  if (entries.length === 0) return;

  const catalog = useCatalogStore.getState();
  const catalogReady = catalog.status === 'ready';
  const isCatalogCode = (category: string, code: string) =>
    catalogReady &&
    catalog.entries.some(
      (e) => e.category === category && normalizeCode(e.code) === normalizeCode(code)
    );

  const upsert = useAppStore.getState().upsertMaterialDraft;
  for (const e of entries) {
    if (isCatalogCode(e.category, e.code)) continue; // คลังเป็นเจ้าของรหัสนี้ — ไม่ต้องทำ draft ซ้ำ
    upsert(e.category, { code: e.code, sellPrice: e.sellPrice });
  }
}
