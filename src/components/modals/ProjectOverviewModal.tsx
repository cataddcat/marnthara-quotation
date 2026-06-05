import React, { useState, useMemo } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useAppStore } from '@/store/useAppStore';
import { fmtTH } from '@/utils/formatters';
import { ITEM_CONFIG } from '@/config/constants';
import { PricingEngine } from '@/lib/pricing/PricingEngine';
import { ItemData } from '@/types';
import { ItemTypeKey } from '@/config/enums';
import { cn } from '@/lib/utils';
import {
  Package,
  TrendingUp,
  ChevronRight,
  AlignLeft,
  ScrollText,
  Blinds,
  Minimize2,
  Columns,
  Grid3X3,
  Scissors,
  LayoutList,
  ArrowRight,
} from 'lucide-react';

const ICON_COMPONENTS: Record<string, React.ElementType> = {
  AlignLeft,
  ScrollText,
  Blinds,
  Minimize2,
  Columns,
  Grid3X3,
  Scissors,
};

interface ProjectOverviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToRoom?: (roomId: string) => void;
}

export const ProjectOverviewModal: React.FC<ProjectOverviewModalProps> = ({
  isOpen,
  onClose,
  onNavigateToRoom,
}) => {
  const rooms = useAppStore((state) => state.rooms);
  const openModal = useAppStore((state) => state.openModal);
  const [activeFilter, setActiveFilter] = useState<ItemTypeKey | null>(null);

  const activeRooms = useMemo(
    () =>
      rooms
        .map((room) => ({
          ...room,
          items: room.items.filter((i) => !i.is_suspended),
        }))
        .filter((r) => r.items.length > 0),
    [rooms]
  );

  const grandTotal = useMemo(
    () =>
      activeRooms.reduce(
        (sum, room) =>
          sum + room.items.reduce((s, i) => s + PricingEngine.calculatePrice(i), 0),
        0
      ),
    [activeRooms]
  );

  // Count items per type across all rooms
  const typeSummary = useMemo(() => {
    const summary: Partial<Record<ItemTypeKey, number>> = {};
    activeRooms.forEach((room) => {
      room.items.forEach((item) => {
        summary[item.type as ItemTypeKey] = (summary[item.type as ItemTypeKey] ?? 0) + 1;
      });
    });
    return summary;
  }, [activeRooms]);

  const totalItemCount = Object.values(typeSummary).reduce((s, c) => s + c, 0);

  // Types present in the project, in ITEM_CONFIG order
  const presentTypes = (Object.keys(ITEM_CONFIG) as ItemTypeKey[]).filter(
    (t) => (typeSummary[t] ?? 0) > 0
  );

  // Rooms filtered by active type filter
  const filteredRooms = useMemo(() => {
    if (!activeFilter) return activeRooms;
    return activeRooms
      .map((room) => ({ ...room, items: room.items.filter((i) => i.type === activeFilter) }))
      .filter((room) => room.items.length > 0);
  }, [activeRooms, activeFilter]);

  const filteredTotal = useMemo(
    () =>
      filteredRooms.reduce(
        (sum, room) =>
          sum + room.items.reduce((s, i) => s + PricingEngine.calculatePrice(i), 0),
        0
      ),
    [filteredRooms]
  );

  const handleItemClick = (roomId: string, item: ItemData) => {
    onClose();
    setTimeout(() => {
      openModal('item', {
        mode: 'edit',
        roomId,
        itemId: item.id,
        itemType: item.type,
        initialData: item,
      });
    }, 150);
  };

  const renderSpec = (item: ItemData) => {
    const specs = PricingEngine.getItemSpecs(item);
    return specs.length > 0 ? specs[0] : '';
  };

  const handleFilterToggle = (type: ItemTypeKey) => {
    setActiveFilter((prev) => (prev === type ? null : type));
  };

  const handleRoomClick = (roomId: string) => {
    if (!onNavigateToRoom) return;
    onClose();
    setTimeout(() => onNavigateToRoom(roomId), 150);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      variant="drawer"
      title="สรุปรายการ"
      description={`มูลค่าโครงการ ${fmtTH(grandTotal)}`}
    >
      <div className="space-y-4 pb-safe-area">
        {/* Grand Total Card */}
        <div className="bg-primary/5 rounded-2xl p-4 flex items-center justify-between border border-primary/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-full text-primary">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                มูลค่าโครงการ
              </span>
              <span className="text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                {fmtTH(grandTotal)}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">รายการทั้งหมด</div>
            <div className="text-lg font-bold text-foreground tabular-nums">
              {totalItemCount}{' '}
              <span className="text-sm font-normal text-muted-foreground">จุด</span>
            </div>
          </div>
        </div>

        {/* Filter Chips */}
        {presentTypes.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-width:none] [-webkit-overflow-scrolling:touch]">
            {/* "ทั้งหมด" chip — only when multiple types */}
            {presentTypes.length > 1 && (
              <button
                onClick={() => setActiveFilter(null)}
                className={cn(
                  'flex-shrink-0 flex items-center gap-1.5 px-3 py-2 min-h-11 rounded-full text-xs font-semibold transition-all duration-200 border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1 focus-visible:ring-offset-background',
                  activeFilter === null
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground'
                )}
              >
                <LayoutList className="w-3 h-3" />
                ทั้งหมด
                <span
                  className={cn(
                    'inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-bold px-1',
                    activeFilter === null
                      ? 'bg-white/25 text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {totalItemCount}
                </span>
              </button>
            )}

            {/* Per-type chips */}
            {presentTypes.map((type) => {
              const config = ITEM_CONFIG[type];
              const IconComp = ICON_COMPONENTS[config.icon] ?? Package;
              const count = typeSummary[type] ?? 0;
              const isActive = activeFilter === type;

              return (
                <button
                  key={type}
                  onClick={() => handleFilterToggle(type)}
                  className={cn(
                    'flex-shrink-0 flex items-center gap-1.5 px-3 py-2 min-h-11 rounded-full text-xs font-semibold transition-all duration-200 border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1 focus-visible:ring-offset-background',
                    isActive
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground'
                  )}
                >
                  <IconComp className="w-3 h-3" />
                  {config.name}
                  <span
                    className={cn(
                      'inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-bold px-1',
                      isActive
                        ? 'bg-white/25 text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Active filter summary bar */}
        {activeFilter && (
          <div className="flex items-center justify-between px-1 py-1.5 rounded-xl bg-primary/5 border border-primary/10">
            <span className="text-xs text-muted-foreground pl-2">
              แสดงเฉพาะ{' '}
              <span className="font-bold text-primary">{ITEM_CONFIG[activeFilter].name}</span>
              {' · '}
              {typeSummary[activeFilter]} จุด
            </span>
            <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 pr-2">
              {fmtTH(filteredTotal)}
            </span>
          </div>
        )}

        {/* Rooms List */}
        <div className="space-y-6">
          {filteredRooms.map((room) => {
            const roomTotal = room.items.reduce(
              (s, i) => s + PricingEngine.calculatePrice(i),
              0
            );
            return (
              <div key={room.id} className="animate-fade-in">
                {/* Room Header */}
                <div className="flex items-center justify-between px-1 mb-2">
                  {onNavigateToRoom ? (
                    <button
                      onClick={() => handleRoomClick(room.id)}
                      className="flex items-center gap-2 group text-left rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-95 transition-transform"
                    >
                      <span className="w-1 h-4 bg-primary rounded-full group-hover:h-5 transition-all" />
                      <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                        {room.name}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-primary opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all" />
                    </button>
                  ) : (
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <span className="w-1 h-4 bg-primary rounded-full" />
                      {room.name}
                    </h3>
                  )}
                  <span className="text-xs font-mono font-medium text-emerald-600 dark:text-emerald-400">
                    {fmtTH(roomTotal)}
                  </span>
                </div>

                {/* Items */}
                <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border/50 shadow-sm">
                  {room.items.map((item) => {
                    const config = ITEM_CONFIG[item.type as ItemTypeKey];
                    const IconComp = ICON_COMPONENTS[config?.icon ?? ''] ?? Package;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleItemClick(room.id, item)}
                        className="w-full text-left px-4 py-3 flex justify-between items-center hover:bg-muted/50 transition-colors group active:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-inset"
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                            <IconComp className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                              {config?.name}
                            </div>
                            <div className="text-xs text-muted-foreground truncate opacity-80">
                              {renderSpec(item)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 pl-2 flex-shrink-0">
                          <span className="text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                            {fmtTH(PricingEngine.calculatePrice(item))}
                          </span>
                          <ChevronRight className="w-4 h-4 text-muted-foreground/30" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Empty state: filter has no results */}
          {filteredRooms.length === 0 && activeFilter && activeRooms.length > 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground space-y-2">
              <Package className="w-12 h-12 opacity-20" />
              <p className="text-sm">ไม่มี{ITEM_CONFIG[activeFilter]?.name}ในโครงการนี้</p>
            </div>
          )}

          {/* Empty state: no items in project */}
          {activeRooms.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground space-y-2">
              <Package className="w-12 h-12 opacity-20" />
              <p>ยังไม่มีรายการสินค้า</p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
