import React from 'react';
import { useAppStore } from '@/store/useAppStore';
import { PricingEngine } from '@/lib/pricing/PricingEngine';
import { fmtTH } from '@/utils/formatters';
import { cn } from '@/lib/utils';
import { Plus, ChevronRight, LayoutList, Maximize2 } from 'lucide-react';
import { useHaptic } from '@/hooks/useHaptic';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

interface SmartNavigatorProps {
  isOpen: boolean;
  onClose: () => void;
  activeRoomId: string | null;
  onNavigate: (roomId: string) => void;
  viewMode: 'focus' | 'overview';
  onSetViewMode: (mode: 'focus' | 'overview') => void;
}

/**
 * ลิ้นชักนำทางห้อง — สร้างบน <Modal variant="drawer"> เพื่อได้ a11y ครบจาก vaul/headless:
 * ปิดด้วย Esc, focus-trap + คืน focus, body scroll-lock, ปุ่ม Back มือถือ, role="dialog".
 * Tier (Lite drawer / Full center) จัดการโดย Modal เอง — ไม่ต้องเช็คความกว้างจอที่นี่.
 */
export const SmartNavigator: React.FC<SmartNavigatorProps> = ({
  isOpen,
  onClose,
  activeRoomId,
  onNavigate,
  viewMode,
  onSetViewMode,
}) => {
  const rooms = useAppStore((s) => s.rooms);
  const addRoom = useAppStore((s) => s.addRoom);
  const { trigger } = useHaptic();

  const handleNavigate = (roomId: string) => {
    trigger('light');
    onNavigate(roomId);
    onSetViewMode('focus');
    onClose();
  };

  const handleAddRoom = () => {
    trigger('medium');
    addRoom();
    onSetViewMode('focus');
    onClose();
  };

  const handleToggleViewMode = () => {
    trigger('selection');
    onSetViewMode(viewMode === 'focus' ? 'overview' : 'focus');
    onClose();
  };

  // Footer — ปุ่มมาตรฐาน 48px (size="md") มี focus-visible/haptic ในตัว
  // disableHaptic เพราะ handler ยิง haptic เฉพาะทาง (medium=สร้าง / selection=สลับ) อยู่แล้ว
  const footer = (
    <div className="flex gap-2.5">
      {/* สลับมุมมอง */}
      <Button
        variant="outline"
        size="md"
        onClick={handleToggleViewMode}
        disableHaptic
        className="shrink-0 gap-1.5 px-4 text-sm"
      >
        {viewMode === 'focus' ? (
          <>
            <LayoutList className="h-4 w-4" />
            <span>สรุปทุกห้อง</span>
          </>
        ) : (
          <>
            <Maximize2 className="h-4 w-4" />
            <span>โฟกัสห้อง</span>
          </>
        )}
      </Button>

      {/* เพิ่มห้องใหม่ — primary CTA (สงวนสีหลักให้ปุ่มนี้เท่านั้น) */}
      <Button
        variant="primary"
        size="md"
        onClick={handleAddRoom}
        disableHaptic
        className="flex-1 gap-2 text-sm font-bold"
      >
        <Plus className="h-4 w-4" />
        เพิ่มห้องใหม่
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      variant="drawer"
      maxWidth="sm"
      title="ห้องทั้งหมด"
      description={rooms.length > 0 ? `${rooms.length} ห้อง` : undefined}
      footer={footer}
    >
      {rooms.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground">
          ยังไม่มีห้องในโครงการนี้
        </div>
      ) : (
        <div className="space-y-1">
          {rooms.map((room) => {
            const total = room.is_suspended
              ? 0
              : room.items
                  .filter((i) => !i.is_suspended)
                  .reduce((s, item) => s + PricingEngine.calculatePrice(item), 0);
            const isActive = room.id === activeRoomId;

            return (
              <button
                key={room.id}
                onClick={() => handleNavigate(room.id)}
                aria-current={isActive ? 'true' : undefined}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-all duration-150 active:scale-[0.98]',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-inset',
                  isActive ? 'bg-primary/10' : 'hover:bg-muted/50'
                )}
              >
                {/* จุดบอกห้องที่กำลังโฟกัส */}
                <div
                  className={cn(
                    'h-2 w-2 shrink-0 rounded-full transition-colors',
                    isActive
                      ? 'bg-primary shadow-[0_0_8px_rgba(var(--primary),0.6)]'
                      : 'bg-border'
                  )}
                />

                <div className="min-w-0 flex-1">
                  <div
                    className={cn(
                      'truncate text-sm font-semibold leading-tight',
                      isActive ? 'text-primary' : 'text-foreground',
                      room.is_suspended && 'text-muted-foreground line-through'
                    )}
                  >
                    {room.name}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {room.items.length} รายการ
                    {room.is_suspended && <span className="ml-1.5 text-amber-500">· ซ่อน</span>}
                  </div>
                </div>

                <span
                  className={cn(
                    'shrink-0 text-sm font-bold tabular-nums',
                    isActive ? 'text-primary' : 'text-emerald-600 dark:text-emerald-400'
                  )}
                >
                  {fmtTH(total)}
                </span>

                <ChevronRight
                  className={cn(
                    'h-3.5 w-3.5 shrink-0',
                    isActive ? 'text-primary/50' : 'text-muted-foreground/25'
                  )}
                />
              </button>
            );
          })}
        </div>
      )}
    </Modal>
  );
};
