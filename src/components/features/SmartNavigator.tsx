import React from 'react';
import { useAppStore } from '@/store/useAppStore';
import { PricingEngine } from '@/lib/pricing/PricingEngine';
import { fmtTH } from '@/utils/formatters';
import { cn } from '@/lib/utils';
import { Plus, ChevronRight, X, LayoutList, Maximize2 } from 'lucide-react';
import { useHaptic } from '@/hooks/useHaptic';
import { useIsMobile } from '@/hooks/useIsMobile';

interface SmartNavigatorProps {
  isOpen: boolean;
  onClose: () => void;
  activeRoomId: string | null;
  onNavigate: (roomId: string) => void;
  viewMode: 'focus' | 'overview';
  onSetViewMode: (mode: 'focus' | 'overview') => void;
}

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
  const isMobile = useIsMobile();

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

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm transition-opacity duration-300',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Bottom Panel — full width on mobile, centered & constrained on desktop */}
      <div
        className={cn(
          'fixed bottom-0 z-[61] flex flex-col bg-background border-border/60 shadow-2xl',
          'transition-transform duration-300 ease-out will-change-transform',
          isMobile
            ? 'left-0 right-0 rounded-t-3xl border-t'
            : 'left-1/2 -translate-x-1/2 w-full max-w-sm rounded-2xl border mb-4',
          isOpen ? 'translate-y-0' : 'translate-y-full'
        )}
        style={{ maxHeight: '72vh' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 shrink-0">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/25" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-3 pb-3.5 border-b border-border/40 shrink-0">
          <div>
            <span className="font-bold text-[15px] text-foreground">ห้องทั้งหมด</span>
            {rooms.length > 0 && (
              <span className="ml-2 text-xs text-muted-foreground font-medium">
                {rooms.length} ห้อง
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="ปิด"
            className="p-3 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors active:scale-90"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Room List */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-2 min-h-0">
          {rooms.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              ยังไม่มีห้องในโครงการนี้
            </div>
          ) : (
            rooms.map((room) => {
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
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-3 rounded-xl mb-1 transition-all duration-150 text-left active:scale-[0.98]',
                    isActive ? 'bg-primary/10' : 'hover:bg-muted/50'
                  )}
                >
                  {/* Active indicator dot */}
                  <div
                    className={cn(
                      'w-2 h-2 rounded-full shrink-0 transition-colors',
                      isActive
                        ? 'bg-primary shadow-[0_0_8px_rgba(var(--primary),0.6)]'
                        : 'bg-border'
                    )}
                  />

                  <div className="flex-1 min-w-0">
                    <div
                      className={cn(
                        'font-semibold text-sm leading-tight truncate',
                        isActive ? 'text-primary' : 'text-foreground',
                        room.is_suspended && 'line-through text-muted-foreground'
                      )}
                    >
                      {room.name}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {room.items.length} รายการ
                      {room.is_suspended && (
                        <span className="ml-1.5 text-amber-500">· ซ่อน</span>
                      )}
                    </div>
                  </div>

                  <span
                    className={cn(
                      'tabular-nums font-bold text-sm shrink-0',
                      isActive
                        ? 'text-primary'
                        : 'text-emerald-600 dark:text-emerald-400'
                    )}
                  >
                    {fmtTH(total)}
                  </span>

                  <ChevronRight
                    className={cn(
                      'w-3.5 h-3.5 shrink-0',
                      isActive ? 'text-primary/50' : 'text-muted-foreground/25'
                    )}
                  />
                </button>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="shrink-0 border-t border-border/40 px-4 pt-3 pb-3 pb-safe-bottom flex gap-2.5">
          {/* View mode toggle */}
          <button
            onClick={handleToggleViewMode}
            className={cn(
              'flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-border/60 text-sm font-medium transition-colors shrink-0',
              'bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/60 active:scale-[0.97]'
            )}
          >
            {viewMode === 'focus' ? (
              <>
                <LayoutList className="w-4 h-4" />
                <span>สรุปทุกห้อง</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-4 h-4" />
                <span>โฟกัสห้อง</span>
              </>
            )}
          </button>

          {/* Add Room CTA */}
          <button
            onClick={handleAddRoom}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold transition-all active:scale-[0.97] shadow-sm"
          >
            <Plus className="w-4 h-4" />
            เพิ่มห้องใหม่
          </button>
        </div>
      </div>
    </>
  );
};
