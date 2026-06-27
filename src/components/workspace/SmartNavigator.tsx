import React, { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { isItemPending } from '@/lib/item-status';
import { cn } from '@/lib/utils';
import { Plus, ChevronRight } from 'lucide-react';
import { useHaptic } from '@/hooks/useHaptic';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

interface SmartNavigatorProps {
  isOpen: boolean;
  onClose: () => void;
  activeRoomId: string | null;
  onNavigate: (roomId: string) => void;
  onSetViewMode: (mode: 'focus' | 'overview') => void;
  /** เปิดมาด้วยตัวกรองไหน — จากปุ่ม "ค้าง N" = 'pending', อื่น ๆ = 'all' */
  initialFilter?: 'all' | 'pending';
}

/**
 * Room Navigator — ลิ้นชักนำทาง/ตรวจสอบห้อง (strictly functional, ไม่มีราคา).
 * โชว์เมตริกเพื่อ audit: จำนวนรายการ + "ค้าง N" (ยังไม่พร้อม) แล้ว deep-link กระโดดไปห้อง (focus).
 * ภาพรวมเชิงนำเสนอ (สี/ราคา/รายการ) อยู่ที่ "All Rooms Summary" (dock "ภาพรวม") แยกกัน.
 * สร้างบน <Modal variant="drawer"> เพื่อ a11y ครบจาก vaul/headless.
 */
export const SmartNavigator: React.FC<SmartNavigatorProps> = ({
  isOpen,
  onClose,
  activeRoomId,
  onNavigate,
  onSetViewMode,
  initialFilter = 'all',
}) => {
  const rooms = useAppStore((s) => s.rooms);
  const addRoom = useAppStore((s) => s.addRoom);
  const { trigger } = useHaptic();

// ตัวกรอง: ทั้งหมด vs เฉพาะห้องที่ยังมีจุดค้าง
  const [filter, setFilter] = useState<'all' | 'pending'>(initialFilter);
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);

  // เช็คและอัปเดต State ทันทีใน Render Phase แทนการใช้ useEffect
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setFilter(initialFilter);
    }
  }

  // นับจุดค้างต่อห้อง (เกณฑ์เดียวกับ header/การ์ด) — ใช้ทั้งกรองและ badge
  const roomsWithPending = rooms.map((room) => ({
    room,
    incompleteCount: room.items.filter((i) => !i.is_suspended && isItemPending(i)).length,
  }));
  const pendingCount = roomsWithPending.filter((x) => x.incompleteCount > 0).length;
  const hasPending = pendingCount > 0;
  const visibleRooms =
    filter === 'pending'
      ? roomsWithPending.filter((x) => x.incompleteCount > 0)
      : roomsWithPending;

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

  // Footer — เพิ่มห้องใหม่ (primary CTA เดียว; สงวนสีหลักให้ปุ่มนี้)
  const footer = (
    <Button
      variant="primary"
      size="md"
      onClick={handleAddRoom}
      disableHaptic
      className="w-full gap-2 text-sm font-bold"
    >
      <Plus className="h-4 w-4" strokeWidth={1.5} />
      เพิ่มห้องใหม่
    </Button>
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
        <div className="space-y-2">
          {/* ตัวกรอง — โชว์เมื่อมีจุดค้าง: ทั้งหมด / เฉพาะที่ค้าง (N) */}
          {hasPending && (
            <div className="flex gap-1 rounded-xl bg-muted/60 p-1">
              {(['all', 'pending'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => {
                    trigger('selection');
                    setFilter(f);
                  }}
                  aria-pressed={filter === f}
                  className={cn(
                    'flex-1 min-h-[44px] rounded-lg px-3 text-sm font-semibold transition-colors',
                    filter === f
                      ? 'bg-foreground text-background'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {f === 'all' ? 'ทั้งหมด' : `เฉพาะที่ค้าง (${pendingCount})`}
                </button>
              ))}
            </div>
          )}

          {visibleRooms.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              ไม่มีจุดที่ค้างแล้ว — ครบทุกห้อง
            </div>
          ) : (
            <div className="space-y-1">
              {visibleRooms.map(({ room, incompleteCount }) => {
                const isActive = room.id === activeRoomId;
                const itemCount = room.items.length;

                return (
                  <button
                    key={room.id}
                    onClick={() => handleNavigate(room.id)}
                    aria-current={isActive ? 'true' : undefined}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-all duration-150 active:scale-[0.98]',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                      isActive ? 'bg-accent' : 'hover:bg-muted/50'
                    )}
                  >
                    {/* จุดบอกห้องที่กำลังโฟกัส */}
                    <div
                      className={cn(
                        'h-2 w-2 shrink-0 rounded-full transition-colors',
                        isActive ? 'bg-foreground' : 'bg-border'
                      )}
                    />

                    <div className="min-w-0 flex-1">
                      <div
                        className={cn(
                          'truncate text-base font-semibold leading-normal text-foreground',
                          room.is_suspended && 'text-muted-foreground line-through'
                        )}
                      >
                        {room.name}
                      </div>
                      {/* เมตริกเพื่อ audit — จำนวนรายการ + ค้าง + พัก/ไม่นับ (ไม่มีราคา) */}
                      <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span>{itemCount} รายการ</span>
                        {incompleteCount > 0 && (
                          <>
                            <span className="text-muted-foreground/30">·</span>
                            <span className="font-semibold text-amber-700 dark:text-amber-400 eeert:text-amber-900">
                              ค้าง {incompleteCount}
                            </span>
                          </>
                        )}
                        {room.is_suspended && (
                          <>
                            <span className="text-muted-foreground/30">·</span>
                            <span className="text-amber-700 dark:text-amber-400 eeert:text-amber-900">พัก</span>
                          </>
                        )}
                      </div>
                    </div>

                    <ChevronRight
                      className={cn(
                        'h-4 w-4 shrink-0',
                        isActive ? 'text-foreground/50' : 'text-muted-foreground/30'
                      )}
                      strokeWidth={1.5}
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};
