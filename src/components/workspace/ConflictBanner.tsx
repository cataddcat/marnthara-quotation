// src/components/workspace/ConflictBanner.tsx
// แถบเตือนเมื่องานที่เปิดอยู่ถูกแก้จากอีกเครื่องขณะมี edit ค้าง (conflict guard)
// เลือก "โหลดล่าสุด" หรือ "เก็บของฉัน" — อีกเวอร์ชันถูกเก็บเป็นสำเนาเสมอ (ไม่มีของหาย)

import React from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useNotificationStore } from '@/store/standalone/useNotificationStore';
import { Button } from '@/components/ui/Button';
import { AlertTriangle } from 'lucide-react';

export const ConflictBanner: React.FC = () => {
  const conflict = useAppStore((s) => s.conflict);
  const resolveConflict = useAppStore((s) => s.resolveConflict);
  const addToast = useNotificationStore((s) => s.addToast);

  if (!conflict) return null;
  const name = conflict.customer.name || 'งานนี้';

  const choose = (choice: 'load' | 'keep') => {
    resolveConflict(choice);
    addToast(
      'info',
      choice === 'load' ? 'โหลดเวอร์ชันล่าสุดแล้ว' : 'เก็บของคุณแล้ว',
      'อีกเวอร์ชันถูกเก็บไว้เป็นสำเนาในงานทั้งหมด'
    );
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] pt-safe-top px-3 pointer-events-none">
      <div
        role="alert"
        aria-live="assertive"
        className="mx-auto max-w-2xl mt-2 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/80 dark:border-amber-800 shadow-lg p-3 pointer-events-auto animate-fade-in"
      >
        <div className="flex items-start gap-2.5">
          <AlertTriangle
            className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          <div className="flex-1 min-w-0">
            <div className="text-base font-semibold text-amber-900 dark:text-amber-200">
              งานถูกแก้จากอีกเครื่อง
            </div>
            <div className="text-sm text-amber-800 dark:text-amber-300 mt-0.5 leading-relaxed">
              "{name}" มีเวอร์ชันใหม่กว่าจากอุปกรณ์อื่น — เลือกเก็บอันไหน (อีกอันจะถูกเก็บเป็นสำเนา ไม่หาย)
            </div>
            <div className="flex gap-2 mt-2.5">
              <Button
                size="md"
                onClick={() => choose('load')}
                className="flex-1 bg-amber-600 text-white font-semibold hover:bg-amber-700"
              >
                โหลดล่าสุด
              </Button>
              <Button
                variant="outline"
                size="md"
                onClick={() => choose('keep')}
                className="flex-1 border-amber-400 text-amber-800 dark:text-amber-200 font-semibold hover:bg-amber-100 hover:text-amber-900 dark:hover:bg-amber-900/40 dark:hover:text-amber-100"
              >
                เก็บของฉัน
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
