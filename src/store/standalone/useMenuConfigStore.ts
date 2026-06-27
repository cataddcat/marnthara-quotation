// src/store/standalone/useMenuConfigStore.ts
// ────────────────────────────────────────────────────────────────────────────
// สถานะ "โหมดปรับแต่งเมนู" (dev tool) + ลำดับเมนูที่ผู้ใช้จัดเอง
// • editing — เปิด/ปิดโหมดลากจัดเรียง (toggle จาก DevInspector)
// • order   — ลำดับ entry id ที่ persist ลง localStorage (null = ใช้ default จาก MENU_ENTRIES)
// แยกจาก useAppStore: เป็น config เฉพาะเครื่อง (เหมือน sim-notch ใน DevInspector) ไม่เข้า undo/persist หลัก
// ────────────────────────────────────────────────────────────────────────────

import { create } from 'zustand';
import { MENU_ENTRIES, MENU_ENTRY_IDS, type MenuEntry } from '@/config/menuItems';

const LS_KEY = 'mtr.menu-order';
const hasWindow = typeof window !== 'undefined';

const loadOrder = (): string[] | null => {
  if (!hasWindow) return null;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const arr: unknown = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : null;
  } catch {
    return null;
  }
};

const saveOrder = (order: string[] | null) => {
  if (!hasWindow) return;
  try {
    if (order) localStorage.setItem(LS_KEY, JSON.stringify(order));
    else localStorage.removeItem(LS_KEY);
  } catch {
    /* localStorage เต็ม/ปิด — ข้าม (จะกลับไปใช้ default) */
  }
};

/** reconcile ลำดับที่ persist กับ entries จริง: คงเฉพาะ id ที่รู้จัก (ตามลำดับ saved) +
 *  เติม id ใหม่ที่เพิ่งเพิ่มในโค้ดต่อท้าย + ตัด id ที่หายไป → กันลำดับเพี้ยนเมื่อโค้ดเปลี่ยน */
export const reconcileIds = (order: string[] | null): string[] => {
  if (!order) return [...MENU_ENTRY_IDS];
  const known = new Set(MENU_ENTRY_IDS);
  const seen = new Set<string>();
  const result: string[] = [];
  for (const id of order) {
    if (known.has(id) && !seen.has(id)) {
      result.push(id);
      seen.add(id);
    }
  }
  for (const id of MENU_ENTRY_IDS) {
    if (!seen.has(id)) result.push(id);
  }
  return result;
};

/** entries ตามลำดับปัจจุบัน (reconcile แล้ว) — ใช้ render เมนู */
export const getOrderedEntries = (order: string[] | null): MenuEntry[] => {
  const byId = new Map(MENU_ENTRIES.map((e) => [e.id, e] as const));
  return reconcileIds(order)
    .map((id) => byId.get(id))
    .filter((e): e is MenuEntry => Boolean(e));
};

interface MenuConfigState {
  editing: boolean;
  order: string[] | null;
  toggleEditing: () => void;
  setEditing: (v: boolean) => void;
  /** ย้าย entry (id) ไปยังตำแหน่งของ overId — index-based บนลำดับที่ reconcile แล้ว */
  reorder: (activeId: string, overId: string) => void;
  reset: () => void;
}

export const useMenuConfigStore = create<MenuConfigState>((set, get) => ({
  editing: false,
  order: loadOrder(),

  toggleEditing: () => set((s) => ({ editing: !s.editing })),
  setEditing: (v) => set({ editing: v }),

  reorder: (activeId, overId) => {
    const ids = reconcileIds(get().order);
    const from = ids.indexOf(activeId);
    const to = ids.indexOf(overId);
    if (from === -1 || to === -1 || from === to) return;
    const next = [...ids];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    saveOrder(next);
    set({ order: next });
  },

  reset: () => {
    saveOrder(null);
    set({ order: null });
  },
}));
