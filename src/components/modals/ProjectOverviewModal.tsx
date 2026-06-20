import React, { useState, useMemo } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useAppStore } from '@/store/useAppStore';
import { fmtTH, fmtSize, toNum } from '@/utils/formatters';
import { ITEM_CONFIG } from '@/config/constants';
import { PricingEngine } from '@/lib/pricing/PricingEngine';
import { ItemData } from '@/types';
import { ItemTypeKey } from '@/config/enums';
import { cn } from '@/lib/utils';
import { getRoomAccent } from '@/lib/room-accents';
import { NUM_TONE_EEERT } from '@/config/dataTones';
import { Metric } from '@/components/ui/Metric';
import {
  Package,
  TrendingUp,
  ChevronRight,
  LayoutList,
  ArrowRight,
} from 'lucide-react';

// ไม่ใช้ไอคอนประจำชนิดสินค้า — lucide ไม่มีเซ็ตที่สื่อครบทั้ง 9 ชนิด (ไอคอนยืมความหมาย
// เช่น Scissors/Grid3X3 อ่านแล้วไม่ตรงสินค้าจริง) → ระบุชนิดด้วย "ชื่อ" อย่างเดียวชัดกว่า

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
    // ตัวเลขขนาดล้วน (ตัด "กว้าง/สูง", บังคับ xx.xx) — ใช้ fmtSize canonical (×); ชนิดไม่มีมิติเดี่ยว
    // (วอลเปเปอร์ widths[] / รื้อถอน) ใช้สเปคสรุปเดิม
    const rec = item as unknown as Record<string, unknown>;
    const w = toNum(rec.width_m as string | number | null | undefined);
    const h = toNum(rec.height_m as string | number | null | undefined);
    if (w > 0 && h > 0) return `${fmtSize(w, h)} ม.`;
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
    >
      <div className="space-y-4 pb-safe-area">
        {/* Grand Total Card — project KPI (มูลค่า emerald hero · count neutral) */}
        <div className="bg-card rounded-2xl p-5 flex items-end justify-between gap-4 border border-border">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 bg-muted rounded-xl text-foreground shrink-0">
              <TrendingUp className="w-5 h-5" strokeWidth={1.5} />
            </div>
            <Metric label="มูลค่าโครงการ" value={fmtTH(grandTotal)} tone="money" size="md" plate />
          </div>
          <Metric
            label="รายการทั้งหมด"
            value={
              <>
                <span className={NUM_TONE_EEERT.count}>{totalItemCount}</span>
                <span className="ml-1 text-sm font-normal text-muted-foreground">จุด</span>
              </>
            }
            tone="neutral"
            size="md"
            align="right"
            className="shrink-0"
          />
        </div>

        {/* Filter Chips */}
        {presentTypes.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-width:none] [-webkit-overflow-scrolling:touch]">
            {/* "ทั้งหมด" chip — only when multiple types */}
            {presentTypes.length > 1 && (
              <button
                onClick={() => setActiveFilter(null)}
                className={cn(
                  'flex-shrink-0 flex items-center gap-1.5 px-3 py-2 min-h-11 rounded-full text-xs font-semibold transition-all duration-200 border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background',
                  activeFilter === null
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-card text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground'
                )}
              >
                <LayoutList className="w-4 h-4" strokeWidth={1.5} />
                ทั้งหมด
                <span
                  className={cn(
                    'inline-flex items-center justify-center min-w-5 h-5 rounded-full text-xs font-bold px-1',
                    activeFilter === null
                      ? 'bg-background/25 text-primary-foreground'
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
              const count = typeSummary[type] ?? 0;
              const isActive = activeFilter === type;

              return (
                <button
                  key={type}
                  onClick={() => handleFilterToggle(type)}
                  className={cn(
                    'flex-shrink-0 flex items-center gap-1.5 px-3 py-2 min-h-11 rounded-full text-xs font-semibold transition-all duration-200 border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background',
                    isActive
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-card text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground'
                  )}
                >
                  {config.name}
                  <span
                    className={cn(
                      'inline-flex items-center justify-center min-w-5 h-5 rounded-full text-xs font-bold px-1',
                      isActive
                        ? 'bg-background/25 text-primary-foreground'
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
          <div className="flex items-center justify-between px-1 py-1.5 rounded-xl bg-muted/40 border border-border">
            <span className="text-xs text-muted-foreground pl-2">
              แสดงเฉพาะ{' '}
              <span className="font-bold text-foreground">{ITEM_CONFIG[activeFilter].name}</span>
              {' · '}
              {typeSummary[activeFilter]} จุด
            </span>
            <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 eeert:text-emerald-800 pr-2">
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
            const accent = getRoomAccent(room.id);
            // ลำดับอิง rooms ทั้งโครงการ (filter อยู่เลขเดิมไม่เลื่อน) — filteredRooms เป็น object ใหม่ จึงหาเทียบด้วย id
            const roomIndex = rooms.findIndex((r) => r.id === room.id);
            // color-coded room avatar (room identity) — sanctioned colour use (DESIGN §2)
            // แสดง "ลำดับ/ทั้งหมด" แทนอักษรแรก (มาตรฐานเดียวกับ RoomCard focus header)
            const roomAvatar = (
              <span
                className={cn(
                  'h-7 min-w-7 px-1 rounded-lg flex items-center justify-center font-mono text-sm font-bold tabular-nums leading-none shrink-0',
                  accent.avatar,
                  accent.avatarText
                )}
              >
                {roomIndex + 1}/{rooms.length}
              </span>
            );
            return (
              <div key={room.id} className="animate-fade-in">
                {/* Room Header — color-coded avatar + name + room total (price kept at room level) */}
                <div className="flex items-center justify-between gap-2 px-1 mb-2">
                  {onNavigateToRoom ? (
                    <button
                      onClick={() => handleRoomClick(room.id)}
                      className="flex items-center gap-2.5 min-w-0 group text-left rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] transition-transform"
                    >
                      {roomAvatar}
                      <span className="text-base font-bold text-foreground truncate group-hover:text-muted-foreground transition-colors">
                        {room.name}
                      </span>
                      <ArrowRight className="w-4 h-4 shrink-0 text-foreground opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all" strokeWidth={1.5} />
                    </button>
                  ) : (
                    <h3 className="text-base font-bold text-foreground flex items-center gap-2.5 min-w-0">
                      {roomAvatar}
                      <span className="truncate">{room.name}</span>
                    </h3>
                  )}
                  <span className="text-sm font-mono font-semibold text-emerald-700 dark:text-emerald-400 eeert:text-emerald-800 shrink-0">
                    {fmtTH(roomTotal)}
                  </span>
                </div>

                {/* Items */}
                <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border/50 shadow-sm">
                  {room.items.map((item) => {
                    const config = ITEM_CONFIG[item.type as ItemTypeKey];
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleItemClick(room.id, item)}
                        className="w-full text-left px-4 py-3 flex justify-between items-center gap-2 hover:bg-muted/50 transition-colors group active:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                      >
                        {/* Item Summary — ชื่อชนิด + รายละเอียด/ขนาด + ราคาต่อชิ้น (ไม่มีไอคอนชนิด — ดูคอมเมนต์บนสุด) */}
                        <div className="flex items-center gap-3 overflow-hidden flex-1 min-w-0">
                          <div className="min-w-0">
                            <div className="text-[15px] font-medium text-foreground truncate">
                              {config?.name}
                            </div>
                            {renderSpec(item) && (
                              <div className="text-sm text-muted-foreground truncate">
                                {renderSpec(item)}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-sm font-mono font-bold tabular-nums text-emerald-700 dark:text-emerald-400 eeert:text-emerald-800">
                            {fmtTH(PricingEngine.calculatePrice(item))}
                          </span>
                          <ChevronRight className="w-4 h-4 text-muted-foreground/30" strokeWidth={1.5} />
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
