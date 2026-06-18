// src/lib/undoHistory.ts
//
// ตัวช่วย "หน้าประวัติการแก้ไข" — zundo เก็บเป็น snapshot ของ state (ไม่มีชื่อ action)
// ⇒ คำอธิบาย "เปลี่ยนอะไร" มาจากการ diff snapshot ติดกัน. เพราะ Zustand อัปเดตแบบ immutable
// ทุก slice ที่เปลี่ยนจะได้ "reference ใหม่" ส่วนที่ไม่เปลี่ยน = reference เดิม → เทียบด้วย !== ได้แม่น.

import type { AppState } from '@/store/useAppStore';

/** ชุดฟิลด์ที่ zundo partialize เก็บ (ดู useAppStore temporal.partialize) */
export type HistorySnapshot = Partial<
  Pick<
    AppState,
    | 'rooms'
    | 'customer'
    | 'discount'
    | 'favorites'
    | 'receipts'
    | 'expenses'
    | 'laborCosts'
    | 'serviceCosts'
    | 'accessoryCosts'
    | 'hardwareCosts'
    | 'fabricCosts'
    | 'wallpaperCosts'
    | 'areaCosts'
  >
>;

const VAULTS = [
  'laborCosts',
  'serviceCosts',
  'accessoryCosts',
  'hardwareCosts',
  'fabricCosts',
  'wallpaperCosts',
  'areaCosts',
] as const;

/** คำอธิบายสั้น ๆ ว่า "เปลี่ยนอะไร" เพื่อไปถึง next จาก prev (heuristic จาก diff) */
export const describeStep = (prev: HistorySnapshot, next: HistorySnapshot): string => {
  const pRooms = prev.rooms ?? [];
  const nRooms = next.rooms ?? [];

  if (next.rooms !== prev.rooms) {
    if (nRooms.length > pRooms.length) {
      const added = nRooms.find((r) => !pRooms.some((p) => p.id === r.id));
      return added?.name ? `เพิ่มห้อง «${added.name}»` : 'เพิ่มห้อง';
    }
    if (nRooms.length < pRooms.length) {
      const removed = pRooms.find((p) => !nRooms.some((r) => r.id === p.id));
      return removed?.name ? `ลบห้อง «${removed.name}»` : 'ลบห้อง';
    }
    // จำนวนห้องเท่ากัน — หาห้องที่เนื้อหาเปลี่ยน (reference ต่าง)
    for (const nr of nRooms) {
      const pr = pRooms.find((p) => p.id === nr.id);
      if (!pr || pr === nr) continue;
      if (pr.name !== nr.name) return `เปลี่ยนชื่อห้อง → «${nr.name}»`;
      if (pr.items.length !== nr.items.length) {
        return `${nr.items.length > pr.items.length ? 'เพิ่ม' : 'ลบ'}รายการในห้อง «${nr.name}»`;
      }
      if (pr.is_suspended !== nr.is_suspended) {
        return `${nr.is_suspended ? 'พักห้อง' : 'เปิดห้อง'} «${nr.name}»`;
      }
      return `แก้รายการในห้อง «${nr.name}»`;
    }
    return 'จัดเรียงห้องใหม่';
  }

  if (next.discount !== prev.discount) return 'แก้ส่วนลด';
  if (next.customer !== prev.customer) return 'แก้ข้อมูลลูกค้า';
  for (const v of VAULTS) if (next[v] !== prev[v]) return 'แก้ทุน/ราคาวัสดุ';
  if (next.favorites !== prev.favorites) return 'แก้รายการโปรด';
  if (next.receipts !== prev.receipts || next.expenses !== prev.expenses) return 'แก้รายการเงิน';
  return 'แก้ไขข้อมูล';
};

/** สรุปสถานะของ snapshot = "ย้อนไปแล้วจะกลับไปสภาพไหน" (นับห้อง/รายการที่ไม่ถูกพัก) */
export const summarize = (s: HistorySnapshot): string => {
  let roomCount = 0;
  let itemCount = 0;
  for (const r of s.rooms ?? []) {
    if (r.is_suspended) continue;
    roomCount += 1;
    for (const it of r.items) if (!it.is_suspended) itemCount += 1;
  }
  return `${roomCount} ห้อง · ${itemCount} รายการ`;
};

export interface TimelineRow {
  /** ดัชนีตามลำดับเวลา (0 = เก่าสุด) — ใช้คำนวณระยะ undo/redo */
  index: number;
  isCurrent: boolean;
  label: string;
  summary: string;
}

/**
 * สร้าง timeline เรียงเก่า→ใหม่.
 * zundo เก็บ futureStates แบบ "ใหม่สุด→ใกล้ปัจจุบัน" ⇒ ต้อง reverse ให้เป็น "ใกล้→ใหม่สุด"
 * timeline = [...pastStates(เก่า→ใหม่), current, ...reverse(futureStates)]
 */
export const buildTimeline = (
  pastStates: HistorySnapshot[],
  current: HistorySnapshot,
  futureStates: HistorySnapshot[]
): { rows: TimelineRow[]; currentIndex: number } => {
  const chrono = [...pastStates, current, ...[...futureStates].reverse()];
  const currentIndex = pastStates.length;
  const rows = chrono.map((snap, i) => ({
    index: i,
    isCurrent: i === currentIndex,
    label: i === 0 ? 'จุดเริ่มต้น' : describeStep(chrono[i - 1], snap),
    summary: summarize(snap),
  }));
  return { rows, currentIndex };
};
