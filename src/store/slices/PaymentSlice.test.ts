// src/store/slices/PaymentSlice.test.ts
// PaymentSlice — เงินจริงของงาน: add/update/toggle/remove + ผูกกับ resetProject

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useAppStore } from '@/store/useAppStore';
import { EXPENSE_CATEGORIES } from '@/config/enums';

const resetPayments = () => useAppStore.setState({ receipts: [], expenses: [] });

describe('💸 PaymentSlice — เงินรับ (receipts)', () => {
  beforeEach(resetPayments);

  it('addReceipt → เพิ่ม entry พร้อม id ที่ store gen ให้', () => {
    const id = useAppStore
      .getState()
      .addReceipt({ label: 'มัดจำ 50%', amount: 5000, date: '2026-06-12' });

    const { receipts } = useAppStore.getState();
    expect(receipts).toHaveLength(1);
    expect(receipts[0]).toMatchObject({ id, label: 'มัดจำ 50%', amount: 5000 });
  });

  it('updateReceipt → แก้เฉพาะ entry เป้าหมาย', () => {
    const s = useAppStore.getState();
    const id1 = s.addReceipt({ label: 'มัดจำ', amount: 5000, date: '2026-06-12' });
    const id2 = s.addReceipt({ label: 'งวดสุดท้าย', amount: 3000, date: '2026-06-12' });

    useAppStore.getState().updateReceipt(id1, { amount: 6000 });

    const { receipts } = useAppStore.getState();
    expect(receipts.find((r) => r.id === id1)?.amount).toBe(6000);
    expect(receipts.find((r) => r.id === id2)?.amount).toBe(3000);
  });

  it('removeReceipt → ลบเฉพาะ entry เป้าหมาย', () => {
    const s = useAppStore.getState();
    const id1 = s.addReceipt({ label: 'มัดจำ', amount: 5000, date: '2026-06-12' });
    useAppStore.getState().addReceipt({ label: 'งวด 2', amount: 2000, date: '2026-06-12' });

    useAppStore.getState().removeReceipt(id1);

    const { receipts } = useAppStore.getState();
    expect(receipts).toHaveLength(1);
    expect(receipts[0].label).toBe('งวด 2');
  });
});

describe('💸 PaymentSlice — เช็คลิสท์รายจ่าย (expenses)', () => {
  beforeEach(resetPayments);

  const addExpense = (extra: Partial<Parameters<ReturnType<typeof useAppStore.getState>['addExpense']>[0]> = {}) =>
    useAppStore.getState().addExpense({
      label: 'ค่าผ้า F001',
      amount: 2500,
      category: EXPENSE_CATEGORIES.MATERIAL,
      paid: false,
      date: '2026-06-12',
      ...extra,
    });

  it('addExpense → เริ่มต้น "ยังไม่จ่าย" ได้', () => {
    const id = addExpense();
    const e = useAppStore.getState().expenses.find((x) => x.id === id);
    expect(e).toMatchObject({ label: 'ค่าผ้า F001', amount: 2500, paid: false });
  });

  it('toggle → จ่ายแล้ว stamp วันที่กดจ่าย (เวลาท้องถิ่น) · toggle กลับ คง date เดิม', () => {
    vi.useFakeTimers();
    // 01:30 น. ตามเวลาเครื่อง — ฝั่ง UTC ยังเป็นเมื่อวาน (จับ bug toISOString)
    vi.setSystemTime(new Date(2026, 5, 12, 1, 30));

    const id = addExpense({ date: '2026-01-01' }); // สร้างไว้นานแล้ว
    useAppStore.getState().toggleExpensePaid(id);
    expect(useAppStore.getState().expenses.find((e) => e.id === id)?.date).toBe('2026-06-12');

    useAppStore.getState().toggleExpensePaid(id); // ติ๊กกลับเป็นยังไม่จ่าย
    const e = useAppStore.getState().expenses.find((x) => x.id === id);
    expect(e?.paid).toBe(false);
    expect(e?.date).toBe('2026-06-12'); // ไม่ถูกแตะตอนติ๊กกลับ

    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('toggleExpensePaid → สลับ จ่ายแล้ว/ยังไม่จ่าย เฉพาะตัวเป้าหมาย', () => {
    const id1 = addExpense();
    const id2 = addExpense({ label: 'ค่าขนส่ง', amount: 300 });

    useAppStore.getState().toggleExpensePaid(id1);

    let { expenses } = useAppStore.getState();
    expect(expenses.find((e) => e.id === id1)?.paid).toBe(true);
    expect(expenses.find((e) => e.id === id2)?.paid).toBe(false);

    useAppStore.getState().toggleExpensePaid(id1);
    expenses = useAppStore.getState().expenses;
    expect(expenses.find((e) => e.id === id1)?.paid).toBe(false);
  });

  it('removeExpense → ลบเฉพาะตัวเป้าหมาย', () => {
    const id1 = addExpense();
    addExpense({ label: 'ค่าช่าง', amount: 1500 });

    useAppStore.getState().removeExpense(id1);

    expect(useAppStore.getState().expenses).toHaveLength(1);
  });

  it('clearPayments → ล้างทั้ง receipts และ expenses', () => {
    useAppStore.getState().addReceipt({ label: 'มัดจำ', amount: 5000, date: '2026-06-12' });
    addExpense();

    useAppStore.getState().clearPayments();

    expect(useAppStore.getState().receipts).toHaveLength(0);
    expect(useAppStore.getState().expenses).toHaveLength(0);
  });
});

describe('💸 PaymentSlice — ขอบเขตข้อมูลงาน (per-job)', () => {
  beforeEach(resetPayments);

  it('resetProject → เงินของงานถูกล้างพร้อม rooms/customer (งานใหม่เริ่มศูนย์)', () => {
    useAppStore.getState().addReceipt({ label: 'มัดจำ', amount: 5000, date: '2026-06-12' });
    useAppStore.getState().addExpense({
      label: 'ค่าผ้า',
      amount: 2500,
      category: EXPENSE_CATEGORIES.MATERIAL,
      paid: true,
      date: '2026-06-12',
    });

    useAppStore.getState().resetProject();

    expect(useAppStore.getState().receipts).toHaveLength(0);
    expect(useAppStore.getState().expenses).toHaveLength(0);
  });
});
