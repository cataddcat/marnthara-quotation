import React from 'react';
import { useStore } from 'zustand';
import { History, RotateCcw, Check } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/useAppStore';
import { useHaptic } from '@/hooks/useHaptic';
import { buildTimeline, type HistorySnapshot } from '@/lib/undoHistory';

interface UndoHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * หน้าประวัติการแก้ไข — timeline ของ zundo: แต่ละขั้นเปลี่ยนอะไร + ย้อนแล้วกลับไปสภาพไหน.
 * กดแถวใดก็ jump (undo/redo ตามระยะจาก currentIndex). reactive ผ่าน useStore(temporal).
 */
export const UndoHistoryModal: React.FC<UndoHistoryModalProps> = ({ isOpen, onClose }) => {
  // reactive: re-render เมื่อ past/future เปลี่ยน (ครอบทั้ง edit/undo/redo)
  const pastStates = useStore(useAppStore.temporal, (s) => s.pastStates) as HistorySnapshot[];
  const futureStates = useStore(useAppStore.temporal, (s) => s.futureStates) as HistorySnapshot[];
  const { trigger } = useHaptic();

  // live snapshot ผ่าน getState() (non-reactive ปลอดภัย: ทุก tracked change ทำให้ pastStates
  // เปลี่ยน → re-render อยู่แล้ว) — เลี่ยง selector ที่คืน object ใหม่ทุกครั้ง (loop)
  const live = useAppStore.getState();
  const liveSnapshot: HistorySnapshot = {
    rooms: live.rooms,
    customer: live.customer,
    discount: live.discount,
    favorites: live.favorites,
    receipts: live.receipts,
    expenses: live.expenses,
    laborCosts: live.laborCosts,
    serviceCosts: live.serviceCosts,
    accessoryCosts: live.accessoryCosts,
    hardwareCosts: live.hardwareCosts,
    fabricCosts: live.fabricCosts,
    wallpaperCosts: live.wallpaperCosts,
    areaCosts: live.areaCosts,
  };

  const { rows, currentIndex } = buildTimeline(pastStates, liveSnapshot, futureStates);
  const display = [...rows].reverse(); // ใหม่→เก่า (ขั้นล่าสุดบนสุด)
  const hasHistory = rows.length > 1;

  const jumpTo = (target: number) => {
    if (target === currentIndex) return;
    const t = useAppStore.temporal.getState();
    if (target < currentIndex) t.undo(currentIndex - target);
    else t.redo(target - currentIndex);
    trigger('medium');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="ประวัติการแก้ไข"
      description="แตะจุดใดก็ได้เพื่อย้อน/ทำซ้ำไปสถานะนั้น"
      variant="drawer"
      maxWidth="md"
    >
      {!hasHistory ? (
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <History className="w-10 h-10 text-muted-foreground/40" strokeWidth={1.5} />
          <p className="text-sm text-muted-foreground">ยังไม่มีประวัติการแก้ไขในงานนี้</p>
        </div>
      ) : (
        <ol className="space-y-1.5">
          {display.map((row) => {
            const isCurrent = row.index === currentIndex;
            const isFuture = row.index > currentIndex;
            return (
              <li key={row.index}>
                <button
                  type="button"
                  onClick={() => jumpTo(row.index)}
                  disabled={isCurrent}
                  className={cn(
                    'w-full flex items-start gap-3 rounded-xl border px-3 py-2.5 text-left min-h-[44px] transition-all',
                    isCurrent
                      ? 'border-primary/40 bg-primary/5 cursor-default'
                      : 'border-border bg-card hover:bg-muted/50 active:scale-[0.99]',
                    isFuture && !isCurrent && 'opacity-70'
                  )}
                >
                  <span
                    className={cn(
                      'mt-0.5 shrink-0',
                      isCurrent ? 'text-primary' : 'text-muted-foreground'
                    )}
                  >
                    {isCurrent ? (
                      <Check className="w-4 h-4" strokeWidth={2} />
                    ) : (
                      <RotateCcw className="w-4 h-4" strokeWidth={1.5} />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-foreground truncate">
                      {row.label}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {row.summary}
                      {isCurrent && <span className="text-primary font-semibold"> · ตอนนี้</span>}
                      {isFuture && !isCurrent && <span> · ทำซ้ำ</span>}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </Modal>
  );
};
