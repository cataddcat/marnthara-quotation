// src/lib/materials/draftReconcile.ts
// ────────────────────────────────────────────────────────────────────────────
// จัดสถานะ "ฉบับร่างในเครื่อง" เทียบกับแค็ตตาล็อก DB (เมื่อออนไลน์) — นโยบาย:
//   DB เป็น master แต่ไม่ทับเลขผู้ใช้เงียบ ๆ.
//   • local    = ยังไม่มีรหัสนี้ใน DB (หรือออฟไลน์ จึงยังไม่รู้) → คงฉบับร่างไว้
//   • match    = ทุน+ราคาตรงกับ DB → "ยืนยันโดยแค็ตตาล็อก" (prune ได้)
//   • conflict = ต่างจาก DB → ให้ผู้ใช้เลือก (ใช้ของแค็ตตาล็อก / เก็บของฉัน)
// pure → เทสได้ + ใช้ร่วมใน DraftRow (MaterialSummaryModal)
// ────────────────────────────────────────────────────────────────────────────

export type DraftReconcileState = 'local' | 'match' | 'conflict';

const EPS = 0.001;

/**
 * @param draft ค่าที่ผู้ใช้กรอก (ทุน/ราคาขาย) — 0/undefined = ยังไม่ได้ตั้ง (ไม่ถือว่าขัดแย้ง)
 * @param db    ค่าจากแค็ตตาล็อก DB ของรหัสเดียวกัน, หรือ null เมื่อ "ไม่มีใน DB / ออฟไลน์"
 */
export function classifyDraft(
  draft: { cost?: number; sellPrice?: number },
  db: { cost: number; sellPrice: number } | null
): DraftReconcileState {
  if (!db) return 'local';
  const cost = draft.cost ?? 0;
  const sell = draft.sellPrice ?? 0;
  const costDiffers = cost > 0 && Math.abs(cost - db.cost) > EPS;
  const sellDiffers = sell > 0 && Math.abs(sell - db.sellPrice) > EPS;
  return costDiffers || sellDiffers ? 'conflict' : 'match';
}
