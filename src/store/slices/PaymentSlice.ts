import { StateCreator } from 'zustand';
import { AppState } from '../useAppStore';
import { ExpenseCategory } from '@/config/enums';
import { newUuid } from '@/lib/id';

// ─────────────────────────────────────────────────────────────────────────────
// เงินจริงของงาน (per-job) — ข้อเท็จจริงทางประวัติศาสตร์ เก็บตายตัวใน entry
// ไม่คำนวณย้อนจากคลังทุน (ต่างจาก "ทุนที่รู้" ที่คำนวณสดเสมอ — CostEngine)
//
// ขอบเขตข้อมูลงาน = { customer, rooms, discount, receipts, expenses } หนึ่งก้อน
// (รองรับระบบ "สลับลูกค้า" ในอนาคต — snapshot/restore ผ่านเส้นทางเดียวกับ backup.ts)
// ─────────────────────────────────────────────────────────────────────────────

/** เงินรับจากลูกค้า — มัดจำ / งวด */
export interface ReceiptEntry {
  id: string;
  label: string; // เช่น "มัดจำ 50%"
  amount: number;
  date: string; // ISO yyyy-mm-dd
  note?: string;
}

/** รายจ่ายจริง — เช็คลิสท์ จ่ายแล้ว/ยังไม่จ่าย */
export interface ExpenseEntry {
  id: string;
  label: string; // เช่น "ค่าผ้า F001 ร้าน ก."
  amount: number;
  category: ExpenseCategory;
  paid: boolean;
  date: string; // ISO yyyy-mm-dd
  note?: string;
}

export interface PaymentSlice {
  receipts: ReceiptEntry[];
  expenses: ExpenseEntry[];

  addReceipt: (data: Omit<ReceiptEntry, 'id'>) => string;
  updateReceipt: (id: string, data: Partial<Omit<ReceiptEntry, 'id'>>) => void;
  removeReceipt: (id: string) => void;

  addExpense: (data: Omit<ExpenseEntry, 'id'>) => string;
  updateExpense: (id: string, data: Partial<Omit<ExpenseEntry, 'id'>>) => void;
  toggleExpensePaid: (id: string) => void;
  removeExpense: (id: string) => void;

  /** ล้างเงินของงานทั้งหมด — ใช้โดย resetProject (เงินผูกกับงาน ไม่ใช่ร้าน) */
  clearPayments: () => void;
}

export const createPaymentSlice: StateCreator<
  AppState,
  [['zustand/persist', unknown], ['temporal', unknown]],
  [],
  PaymentSlice
> = (set) => ({
  receipts: [],
  expenses: [],

  addReceipt: (data) => {
    const id = newUuid();
    set((state) => ({ receipts: [...state.receipts, { ...data, id }] }));
    return id;
  },

  updateReceipt: (id, data) =>
    set((state) => ({
      receipts: state.receipts.map((r) => (r.id === id ? { ...r, ...data } : r)),
    })),

  removeReceipt: (id) =>
    set((state) => ({ receipts: state.receipts.filter((r) => r.id !== id) })),

  addExpense: (data) => {
    const id = newUuid();
    set((state) => ({ expenses: [...state.expenses, { ...data, id }] }));
    return id;
  },

  updateExpense: (id, data) =>
    set((state) => ({
      expenses: state.expenses.map((e) => (e.id === id ? { ...e, ...data } : e)),
    })),

  toggleExpensePaid: (id) =>
    set((state) => ({
      expenses: state.expenses.map((e) => (e.id === id ? { ...e, paid: !e.paid } : e)),
    })),

  removeExpense: (id) =>
    set((state) => ({ expenses: state.expenses.filter((e) => e.id !== id) })),

  clearPayments: () => set(() => ({ receipts: [], expenses: [] })),
});
