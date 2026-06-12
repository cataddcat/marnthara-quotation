// src/components/modals/FinancialDashboard/MoneyTab.tsx
//
// แท็บ "เงินเข้า-ออก" — เงินจริงของงาน (ไม่ใช่ประมาณการ):
//   1) เงินรับจากลูกค้า (มัดจำ/งวด) + quick-add มัดจำ 50% จากราคางาน
//   2) เช็คลิสท์รายจ่าย — ติ๊กจ่ายแล้ว/ยัง + เติมจากประมาณการ (สะพานจากทุนที่รู้)
// หลัก "บอกเท่าที่รู้": ตัวเลขทุกตัวคือเงินที่บันทึกจริง ไม่มีการอนุมานกำไร

import React, { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { fmtTH, toNum } from '@/utils/formatters';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useHaptic } from '@/hooks/useHaptic';
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
  type ExpenseCategory,
} from '@/config/enums';
import { Wallet, ClipboardCheck, Check, Trash2, Plus, Sparkles } from 'lucide-react';

const todayISO = () => new Date().toISOString().slice(0, 10);

const fmtDateTH = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
};

const CATEGORY_OPTIONS = Object.values(EXPENSE_CATEGORIES).map((value) => ({
  value,
  label: EXPENSE_CATEGORY_LABELS[value],
}));

interface MoneyTabProps {
  /** ราคางานหลังส่วนลด/VAT (finalTotal) — ฐาน quick-add มัดจำ 50% */
  jobPrice: number;
  /** ประมาณการทุนที่รู้รายถัง (จาก CostEngine aggregate) — ปุ่ม "เติมจากประมาณการ" */
  estimates: { fabric: number; labor: number; rail: number };
}

export const MoneyTab: React.FC<MoneyTabProps> = ({ jobPrice, estimates }) => {
  const receipts = useAppStore((s) => s.receipts);
  const expenses = useAppStore((s) => s.expenses);
  const addReceipt = useAppStore((s) => s.addReceipt);
  const removeReceipt = useAppStore((s) => s.removeReceipt);
  const addExpense = useAppStore((s) => s.addExpense);
  const toggleExpensePaid = useAppStore((s) => s.toggleExpensePaid);
  const removeExpense = useAppStore((s) => s.removeExpense);
  const { trigger } = useHaptic();

  // ฟอร์มเพิ่มรายการ — เก็บเป็น string ระหว่างพิมพ์ แปลงตอน submit
  const [receiptLabel, setReceiptLabel] = useState('');
  const [receiptAmount, setReceiptAmount] = useState('');
  const [expenseLabel, setExpenseLabel] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory>(
    EXPENSE_CATEGORIES.MATERIAL
  );

  const paidTotal = expenses.reduce((s, e) => s + (e.paid ? e.amount : 0), 0);
  const expenseTotal = expenses.reduce((s, e) => s + e.amount, 0);
  const paidCount = expenses.filter((e) => e.paid).length;

  const handleAddReceipt = () => {
    const amount = toNum(receiptAmount);
    if (amount <= 0) return;
    addReceipt({
      label: receiptLabel.trim() || 'เงินรับ',
      amount,
      date: todayISO(),
    });
    setReceiptLabel('');
    setReceiptAmount('');
  };

  const handleQuickDeposit = () => {
    if (jobPrice <= 0) return;
    addReceipt({
      label: 'มัดจำ 50%',
      amount: Math.round(jobPrice / 2),
      date: todayISO(),
    });
  };

  const handleAddExpense = () => {
    const amount = toNum(expenseAmount);
    if (amount <= 0) return;
    addExpense({
      label: expenseLabel.trim() || EXPENSE_CATEGORY_LABELS[expenseCategory],
      amount,
      category: expenseCategory,
      paid: false,
      date: todayISO(),
    });
    setExpenseLabel('');
    setExpenseAmount('');
  };

  // เติมจากประมาณการ — สร้างรายการ "ยังไม่จ่าย" จากทุนที่รู้ (ปัดเศษเต็มบาท)
  const estimateChips: { label: string; amount: number; category: ExpenseCategory }[] = [
    { label: 'ค่าผ้า/วัสดุ', amount: estimates.fabric, category: EXPENSE_CATEGORIES.MATERIAL },
    { label: 'ค่าเย็บ', amount: estimates.labor, category: EXPENSE_CATEGORIES.SEWING },
    { label: 'ราง/อุปกรณ์', amount: estimates.rail, category: EXPENSE_CATEGORIES.HARDWARE },
  ].filter((c) => c.amount > 0);

  const handleAddEstimate = (chip: (typeof estimateChips)[number]) => {
    addExpense({
      label: `${chip.label} (ประมาณการ)`,
      amount: Math.round(chip.amount),
      category: chip.category,
      paid: false,
      date: todayISO(),
    });
  };

  return (
    <div className="space-y-5">
      {/* ── 1. เงินรับจากลูกค้า ── */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
            <Wallet className="w-3.5 h-3.5" strokeWidth={1.5} />
            เงินรับจากลูกค้า ({receipts.length})
          </div>
          {receipts.length > 0 && (
            <span className="text-xs font-mono tabular-nums font-bold text-emerald-600">
              ฿{fmtTH(receipts.reduce((s, r) => s + r.amount, 0))}
            </span>
          )}
        </div>

        {receipts.length === 0 && (
          <div className="text-xs text-muted-foreground bg-muted/30 border border-border/50 rounded-xl px-3 py-2.5">
            ยังไม่บันทึกเงินรับ — เริ่มจากมัดจำที่ลูกค้าจ่าย
          </div>
        )}

        {receipts.map((r) => (
          <div
            key={r.id}
            className="flex items-center gap-2.5 bg-card border border-border/60 rounded-xl px-3 py-2.5"
          >
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-foreground truncate">{r.label}</div>
              <div className="text-xs text-muted-foreground">{fmtDateTH(r.date)}</div>
            </div>
            <span className="font-mono tabular-nums text-sm font-bold text-emerald-600 shrink-0">
              ฿{fmtTH(r.amount)}
            </span>
            <button
              onClick={() => {
                trigger('warning');
                removeReceipt(r.id);
              }}
              className="p-2 -mr-1 text-muted-foreground/50 hover:text-destructive transition-colors"
              aria-label={`ลบ ${r.label}`}
            >
              <Trash2 className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>
        ))}

        {/* quick-add มัดจำ 50% — โชว์เมื่อรู้ราคางานและยังไม่มีเงินรับ */}
        {jobPrice > 0 && receipts.length === 0 && (
          <button
            onClick={handleQuickDeposit}
            className="w-full flex items-center justify-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-200/50 dark:border-emerald-800/50 rounded-xl px-3 py-2.5 active:scale-[0.99] transition-transform"
          >
            <Plus className="w-4 h-4" strokeWidth={1.5} />
            มัดจำ 50% = ฿{fmtTH(Math.round(jobPrice / 2))}
          </button>
        )}

        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <Input
              size="sm"
              placeholder="เช่น มัดจำ / งวดสุดท้าย"
              value={receiptLabel}
              onChange={(e) => setReceiptLabel(e.target.value)}
            />
          </div>
          <div className="w-28 shrink-0">
            <Input
              size="sm"
              placeholder="0"
              inputMode="decimal"
              suffix="฿"
              value={receiptAmount}
              onChange={(e) => setReceiptAmount(e.target.value)}
            />
          </div>
          <Button size="sm" variant="secondary" onClick={handleAddReceipt} className="shrink-0">
            เพิ่ม
          </Button>
        </div>
      </section>

      {/* ── 2. เช็คลิสท์รายจ่าย ── */}
      <section className="space-y-2 pt-3 border-t border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
            <ClipboardCheck className="w-3.5 h-3.5" strokeWidth={1.5} />
            เช็คลิสท์รายจ่าย ({paidCount}/{expenses.length})
          </div>
          {expenses.length > 0 && (
            <span className="text-xs font-mono tabular-nums text-muted-foreground">
              จ่ายแล้ว{' '}
              <span className="font-bold text-rose-600">฿{fmtTH(paidTotal)}</span>
              {expenseTotal > paidTotal && <> / ฿{fmtTH(expenseTotal)}</>}
            </span>
          )}
        </div>

        {expenses.length === 0 && (
          <div className="text-xs text-muted-foreground bg-muted/30 border border-border/50 rounded-xl px-3 py-2.5">
            ยังไม่มีรายจ่าย — บันทึกทุกบาทที่จ่ายจริง เพื่อเห็นเงินคงเหลือที่แท้จริง
          </div>
        )}

        {expenses.map((e) => (
          <div
            key={e.id}
            className={cn(
              'flex items-center gap-2.5 bg-card border rounded-xl px-3 py-2.5',
              e.paid ? 'border-border/60' : 'border-dashed border-border'
            )}
          >
            {/* ติ๊กจ่ายแล้ว — ปุ่มสถานะหลักของเช็คลิสท์ */}
            <button
              onClick={() => {
                trigger('selection');
                toggleExpensePaid(e.id);
              }}
              className={cn(
                'w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 transition-colors',
                e.paid
                  ? 'bg-rose-500 border-rose-500 text-white'
                  : 'bg-background border-border text-transparent hover:border-rose-300'
              )}
              aria-label={e.paid ? 'ทำเครื่องหมายยังไม่จ่าย' : 'ทำเครื่องหมายจ่ายแล้ว'}
            >
              <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
            </button>

            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-foreground truncate">{e.label}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span className="bg-muted px-1.5 py-0.5 rounded-full">
                  {EXPENSE_CATEGORY_LABELS[e.category] ?? e.category}
                </span>
                {e.paid ? `จ่ายแล้ว · ${fmtDateTH(e.date)}` : 'ยังไม่จ่าย'}
              </div>
            </div>

            <span
              className={cn(
                'font-mono tabular-nums text-sm font-bold shrink-0',
                e.paid ? 'text-rose-600' : 'text-muted-foreground'
              )}
            >
              ฿{fmtTH(e.amount)}
            </span>
            <button
              onClick={() => {
                trigger('warning');
                removeExpense(e.id);
              }}
              className="p-2 -mr-1 text-muted-foreground/50 hover:text-destructive transition-colors"
              aria-label={`ลบ ${e.label}`}
            >
              <Trash2 className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>
        ))}

        {/* เติมจากประมาณการ — สะพาน ทุนที่รู้ → เช็คลิสท์ (สร้างเป็น "ยังไม่จ่าย") */}
        {estimateChips.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Sparkles className="w-3.5 h-3.5" strokeWidth={1.5} />
              เติมจากประมาณการ (สร้างเป็น "ยังไม่จ่าย" — แก้ยอดจริงทีหลังได้)
            </div>
            <div className="flex flex-wrap gap-1.5">
              {estimateChips.map((chip) => (
                <button
                  key={chip.category}
                  onClick={() => handleAddEstimate(chip)}
                  className="flex items-center gap-1 text-xs font-medium bg-muted hover:bg-muted/70 border border-border/50 rounded-full px-2.5 py-1.5 active:scale-95 transition-transform"
                >
                  <Plus className="w-3 h-3" strokeWidth={1.5} />
                  {chip.label} ≈ ฿{fmtTH(Math.round(chip.amount))}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-36 shrink-0">
              <Select
                size="sm"
                options={CATEGORY_OPTIONS}
                value={expenseCategory}
                onChange={(e) => setExpenseCategory(e.target.value as ExpenseCategory)}
              />
            </div>
            <div className="flex-1 min-w-0">
              <Input
                size="sm"
                placeholder="จ่ายค่าอะไร"
                value={expenseLabel}
                onChange={(e) => setExpenseLabel(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <Input
                size="sm"
                placeholder="0"
                inputMode="decimal"
                suffix="฿"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
              />
            </div>
            <Button size="sm" variant="secondary" onClick={handleAddExpense} className="shrink-0">
              เพิ่มรายจ่าย
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};
