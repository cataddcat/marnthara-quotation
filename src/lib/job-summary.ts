// src/lib/job-summary.ts
// ────────────────────────────────────────────────────────────────────────────
// สรุปเงิน + ความคืบหน้าของ "งานหนึ่งก้อน" สำหรับการ์ดในกระดาน "งานทั้งหมด"
// คำนวณสด (งานมีไม่กี่งาน → ถูกกว่าเก็บ snapshot ที่ค้าง). สูตรเงิน = เดียวกับหน้าหลัก
// (PricingEngine + performFinalAdjustments) ป้าย "ค้าง N จุด" = isItemIncomplete เดียวกับ header
// ────────────────────────────────────────────────────────────────────────────

import { PricingEngine } from '@/lib/pricing/PricingEngine';
import { performFinalAdjustments } from '@/hooks/useCalculations';
import { isItemIncomplete } from '@/lib/item-status';
import type { JobBundle } from '@/lib/job-bundle';

export interface JobSummary {
  /** ราคางานสุทธิ (หลังส่วนลด + VAT) — ตรงกับ finalTotal หน้าหลัก */
  price: number;
  /** รับแล้ว (Σ มัดจำ/งวด) */
  received: number;
  /** ค้างเก็บ = max(price − received, 0) */
  balance: number;
  roomCount: number;
  itemCount: number;
  /** จำนวนจุดที่ "เริ่มแล้วแต่ยังไม่ครบ" (ยังไม่ใส่ผ้า/ราคา) */
  incompleteCount: number;
}

export const summarizeJob = (b: JobBundle, vatRate: number): JobSummary => {
  let itemCount = 0;
  let incompleteCount = 0;
  let roomCount = 0;
  let raw = 0;

  for (const room of b.rooms) {
    if (room.is_suspended) continue;
    roomCount += 1;
    for (const item of room.items) {
      if (item.is_suspended) continue;
      itemCount += 1;
      if (isItemIncomplete(item)) incompleteCount += 1;
      raw += PricingEngine.calculatePrice(item);
    }
  }

  const { finalTotal } = performFinalAdjustments(raw, b.discount, vatRate);
  const received = b.receipts.reduce((sum, r) => sum + r.amount, 0);
  const balance = Math.max(finalTotal - received, 0);

  return { price: finalTotal, received, balance, roomCount, itemCount, incompleteCount };
};
