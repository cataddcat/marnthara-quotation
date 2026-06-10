import React, { useRef, useState } from 'react';
import { Room, ItemData } from '@/types';
import { ItemCard } from './ItemCard';
import { useAppStore } from '@/store/useAppStore';
import { useConfirm } from '@/hooks/useConfirm';
import { PricingEngine } from '@/lib/pricing/PricingEngine';
import { isItemIncomplete, displayIndexes } from '@/lib/item-status';
import { itemTypeBreakdown } from '@/lib/item-display';
import { getRoomAccent } from '@/lib/room-accents';
import { fmtTH } from '@/utils/formatters';
import { cn } from '@/lib/utils';
import { Metric } from '@/components/ui/Metric';
import { Menu, MenuButton, MenuItem, MenuItems, Transition } from '@headlessui/react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDroppable,
  closestCorners,
  type CollisionDetection,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  arrayMove,
  rectSortingStrategy,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  Plus,
  ChevronRight,
  MoreHorizontal,
  ChevronUp,
  ChevronDown,
  Copy,
  PauseCircle,
  CheckCircle2,
  Trash2,
  LayoutGrid,
  LayoutList,
  AlertTriangle,
} from 'lucide-react';

// ────────────────────────────────────────────────────────────────────────────
// Room Dashboard (Full tier) — เห็นทุกห้องในกริดเดียว + ลากเรียงลำดับ · 2 ความหนาแน่น
//   • compact (ค่าเริ่มต้น) = การ์ดสรุปขนาดคงที่เท่ากันทุกใบ (ชื่อ + จำนวน + รายชื่อสินค้าแบบย่อ)
//     คลิกการ์ด → เข้าห้อง (focus) · ลากเรียง "ห้อง" ได้ · ไม่มี item-level dnd
//   • detailed = การ์ดเต็มใบเดิม: ลาก item เรียงในห้อง · ย้ายข้ามห้อง (เห็น preview สดระหว่างลาก)
//   • engine = @dnd-kit (เมาส์ + แตะ + คีย์บอร์ด) · styling ตาม HANDOFF §1.7
//   • cross-room ใช้ local state ระหว่างลาก (preview) แล้ว commit store ครั้งเดียวตอนปล่อย (undo = 1 step)
// ────────────────────────────────────────────────────────────────────────────

export type DashboardDensity = 'compact' | 'detailed';

const gripCls =
  'shrink-0 flex items-center justify-center w-7 h-9 rounded-md text-muted-foreground/50 hover:text-foreground hover:bg-muted cursor-grab active:cursor-grabbing transition-colors touch-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

// anchor ให้ OverviewSidebar เลื่อนมาหา — กันการ์ดมุดใต้ fixed header (3.5rem + safe-area)
const roomAnchorCls = 'scroll-mt-[calc(3.5rem+env(safe-area-inset-top)+0.75rem)]';

/** หา roomId ที่ array ของ item ids มี id นี้อยู่ (ใช้กับ local container map) */
const findContainer = (map: Record<string, string[]>, id: string): string | undefined =>
  Object.keys(map).find((roomId) => map[roomId].includes(id));

interface RoomDashboardProps {
  rooms: Room[];
  density: DashboardDensity;
  onSetDensity: (density: DashboardDensity) => void;
  onAddItem: (roomId: string) => void;
  onEditItem: (roomId: string, item: ItemData) => void;
  onOpenRoom: (roomId: string) => void;
}

// collision เฉพาะชนิดที่ลากอยู่ (กัน nested context ชนกันมั่ว):
//   ลากห้อง → จับเฉพาะ 'room' · ลาก item → จับ 'item' + พื้นที่ห้อง 'roomdrop'
const collisionDetection: CollisionDetection = (args) => {
  const activeType = args.active.data.current?.type;
  const droppableContainers = args.droppableContainers.filter((c) => {
    const t = c.data.current?.type;
    if (activeType === 'room') return t === 'room';
    return t === 'item' || t === 'roomdrop';
  });
  return closestCorners({ ...args, droppableContainers });
};

export const RoomDashboard: React.FC<RoomDashboardProps> = ({
  rooms,
  density,
  onSetDensity,
  onAddItem,
  onEditItem,
  onOpenRoom,
}) => {
  const reorderRooms = useAppStore((s) => s.reorderRooms);
  const reorderItems = useAppStore((s) => s.reorderItems);
  const moveItemToRoom = useAppStore((s) => s.moveItemToRoom);
  const addRoom = useAppStore((s) => s.addRoom);

  const [active, setActive] = useState<{ type: 'room' | 'item'; id: string } | null>(null);
  // ลำดับ item ต่อห้องระหว่างลาก (cross-room preview) — null = ใช้ค่าจาก store
  const [localItems, setLocalItems] = useState<Record<string, string[]> | null>(null);
  const dragFromRoomRef = useRef<string | null>(null); // ห้องต้นทางจริงตอนเริ่มลาก

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const roomIds = rooms.map((r) => r.id);
  const itemById = new Map<string, ItemData>(
    rooms.flatMap((r) => r.items).map((i) => [i.id, i] as const)
  );
  const getRoomItems = (room: Room): ItemData[] => {
    const ids = localItems?.[room.id];
    if (!ids) return room.items;
    return ids.map((id) => itemById.get(id)).filter((i): i is ItemData => Boolean(i));
  };

  // สรุปโครงการ (เฉพาะห้อง/รายการที่ไม่ถูกซ่อน)
  const visibleItems = rooms
    .filter((r) => !r.is_suspended)
    .flatMap((r) => r.items.filter((i) => !i.is_suspended));
  const grandTotal = visibleItems.reduce((s, i) => s + PricingEngine.calculatePrice(i), 0);
  const totalItems = visibleItems.length;
  const incompleteCount = visibleItems.filter(isItemIncomplete).length;

  const handleDragStart = (e: DragStartEvent) => {
    const t = e.active.data.current?.type;
    if (t === 'room') {
      setActive({ type: 'room', id: String(e.active.id) });
    } else if (t === 'item') {
      setActive({ type: 'item', id: String(e.active.id) });
      dragFromRoomRef.current = (e.active.data.current?.roomId as string) ?? null;
      setLocalItems(Object.fromEntries(rooms.map((r) => [r.id, r.items.map((i) => i.id)])));
    }
  };

  // ย้าย item ข้ามห้องใน local state ระหว่างลาก (ภายในห้องเดียวกันปล่อยให้ sortable จัดการ transform เอง)
  const handleDragOver = (e: DragOverEvent) => {
    const { active: a, over } = e;
    if (!over || a.data.current?.type !== 'item') return;
    const activeId = String(a.id);
    const overId = String(over.id);
    setLocalItems((prev) => {
      if (!prev) return prev;
      const activeContainer = findContainer(prev, activeId);
      const overContainer = overId.startsWith('drop-') ? overId.slice(5) : findContainer(prev, overId);
      if (!activeContainer || !overContainer || activeContainer === overContainer) return prev;
      if (!(overContainer in prev)) return prev;
      const activeArr = prev[activeContainer];
      const overArr = prev[overContainer];
      const activeIndex = activeArr.indexOf(activeId);
      if (activeIndex < 0) return prev;
      const newIndex = overId.startsWith('drop-')
        ? overArr.length
        : (() => {
            const oi = overArr.indexOf(overId);
            return oi >= 0 ? oi : overArr.length;
          })();
      return {
        ...prev,
        [activeContainer]: activeArr.filter((id) => id !== activeId),
        [overContainer]: [...overArr.slice(0, newIndex), activeId, ...overArr.slice(newIndex)],
      };
    });
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const { active: a, over } = e;
    const aType = a.data.current?.type;

    if (aType === 'room') {
      setActive(null);
      if (over && a.id !== over.id) {
        const from = rooms.findIndex((r) => r.id === a.id);
        const to = rooms.findIndex((r) => r.id === over.id);
        if (from !== -1 && to !== -1) reorderRooms(from, to);
      }
      return;
    }

    if (aType === 'item') {
      const lc = localItems;
      const fromRoomId = dragFromRoomRef.current;
      setActive(null);
      setLocalItems(null);
      dragFromRoomRef.current = null;
      if (!lc || !over || !fromRoomId) return;

      const activeId = String(a.id);
      const overId = String(over.id);
      const finalContainer = findContainer(lc, activeId);
      if (!finalContainer) return;

      // เรียงภายในห้องปลายทางให้ตรงตำแหน่ง over (ลากในห้องเดียวกันก็ทำที่นี่)
      let finalArr = lc[finalContainer];
      if (!overId.startsWith('drop-') && findContainer(lc, overId) === finalContainer) {
        const ai = finalArr.indexOf(activeId);
        const oi = finalArr.indexOf(overId);
        if (ai >= 0 && oi >= 0 && ai !== oi) finalArr = arrayMove(finalArr, ai, oi);
      }
      const finalIndex = finalArr.indexOf(activeId);

      const origRoom = rooms.find((r) => r.id === fromRoomId);
      const origIndex = origRoom ? origRoom.items.findIndex((i) => i.id === activeId) : -1;
      if (origIndex < 0 || finalIndex < 0) return;

      if (finalContainer === fromRoomId) {
        if (origIndex !== finalIndex) reorderItems(fromRoomId, origIndex, finalIndex);
      } else {
        moveItemToRoom(fromRoomId, activeId, finalContainer, finalIndex);
      }
    }
  };

  const handleDragCancel = () => {
    setActive(null);
    setLocalItems(null);
    dragFromRoomRef.current = null;
  };

  const activeRoom = active?.type === 'room' ? rooms.find((r) => r.id === active.id) : null;
  const activeItem = active?.type === 'item' ? itemById.get(active.id) : null;

  return (
    <div className="space-y-3">
      {/* สรุปโครงการ — KPI bar: ภาพรวม (จำนวน/ค้าง) ซ้าย · มูลค่าโครงการ (emerald hero) ขวา */}
      <div className="flex items-end justify-between gap-3 rounded-2xl border border-border bg-card px-5 py-4">
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-xs font-medium tracking-wide text-muted-foreground">
            ภาพรวมโครงการ
          </span>
          <div className="flex items-center gap-2 text-sm min-w-0">
            <span className="font-semibold text-foreground tabular-nums shrink-0">
              {totalItems} จุด
            </span>
            {incompleteCount > 0 && (
              <>
                <span className="text-muted-foreground/30">·</span>
                <span className="font-semibold text-amber-600 dark:text-amber-400 shrink-0">
                  ค้าง {incompleteCount}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Metric
            label="มูลค่าโครงการ"
            value={fmtTH(grandTotal)}
            tone="money"
            size="sm"
            align="right"
          />
          <div className="hidden sm:block h-9 w-px bg-border/60" />
          {/* toggle ความหนาแน่น — ย่อ (การ์ดสรุป) ⇄ ละเอียด (item เต็ม + ลากข้ามห้อง) */}
          <div
            role="group"
            aria-label="ความหนาแน่นการแสดงผล"
            className="flex items-center gap-0.5 p-0.5 rounded-xl border border-border bg-muted/40"
          >
            <DensityButton
              active={density === 'compact'}
              label="มุมมองย่อ"
              icon={LayoutGrid}
              onClick={() => onSetDensity('compact')}
            />
            <DensityButton
              active={density === 'detailed'}
              label="มุมมองละเอียด"
              icon={LayoutList}
              onClick={() => onSetDensity('detailed')}
            />
          </div>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext items={roomIds} strategy={rectSortingStrategy}>
          <div className="grid items-start gap-3 sm:grid-cols-2 xl:grid-cols-3 pb-6">
            {rooms.map((room, idx) =>
              density === 'compact' ? (
                <CompactRoomCard
                  key={room.id}
                  room={room}
                  items={getRoomItems(room)}
                  index={idx}
                  totalRooms={rooms.length}
                  onOpenRoom={onOpenRoom}
                />
              ) : (
                <SortableRoomCard
                  key={room.id}
                  room={room}
                  items={getRoomItems(room)}
                  index={idx}
                  totalRooms={rooms.length}
                  onAddItem={onAddItem}
                  onEditItem={onEditItem}
                  onOpenRoom={onOpenRoom}
                />
              )
            )}

            {/* เพิ่มห้องใหม่ — โหมดย่อสูงเท่าการ์ดเพื่อกริดเรียงเสมอกัน */}
            <button
              onClick={() => addRoom()}
              className={cn(
                'flex items-center justify-center gap-2 rounded-2xl border border-dashed border-border/60 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-border hover:bg-muted/20 transition-colors',
                density === 'compact' ? 'h-48' : 'min-h-[4rem]'
              )}
            >
              <Plus className="w-4 h-4" strokeWidth={1.5} />
              เพิ่มห้อง
            </button>
          </div>
        </SortableContext>

        <DragOverlay dropAnimation={null}>
          {activeRoom ? (
            <RoomOverlay room={activeRoom} />
          ) : activeItem ? (
            <div className="w-[340px] max-w-[85vw] opacity-95 rotate-1">
              <ItemCard item={activeItem} index={0} roomId="" onEdit={() => {}} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};

// ─── ปุ่ม toggle ความหนาแน่น (chrome ขาวดำ — ไม่ใช่ CTA) ───────────────────────

const DensityButton: React.FC<{
  active: boolean;
  label: string;
  icon: React.ElementType;
  onClick: () => void;
}> = ({ active, label, icon: Icon, onClick }) => (
  <button
    onClick={onClick}
    aria-pressed={active}
    aria-label={label}
    title={label}
    className={cn(
      'flex items-center justify-center w-11 h-11 rounded-[10px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      active
        ? 'bg-card text-foreground border border-border shadow-xs'
        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
    )}
  >
    <Icon className="w-4 h-4" strokeWidth={1.5} />
  </button>
);

// ─── เมนูจัดการห้อง (ใช้ร่วม compact + detailed) — เลื่อนลำดับ / คัดลอก / พัก / ลบ ───

const RoomCardMenu: React.FC<{ room: Room; index: number; totalRooms: number }> = ({
  room,
  index,
  totalRooms,
}) => {
  const reorderRooms = useAppStore((s) => s.reorderRooms);
  const duplicateRoom = useAppStore((s) => s.duplicateRoom);
  const toggleRoomSuspension = useAppStore((s) => s.toggleRoomSuspension);
  const removeRoom = useAppStore((s) => s.removeRoom);
  const { confirm } = useConfirm();

  const handleDeleteRoom = async () => {
    const ok = await confirm({
      title: `ลบห้อง "${room.name}"?`,
      description: 'รายการทั้งหมดในห้องนี้จะถูกลบและกู้คืนไม่ได้',
      confirmLabel: 'ยืนยันลบ',
      variant: 'destructive',
    });
    if (ok) removeRoom(room.id);
  };

  return (
    <Menu as="div" className="relative shrink-0">
      <MenuButton
        aria-label="ตัวเลือกห้อง"
        className="flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <MoreHorizontal className="w-4 h-4" strokeWidth={1.5} />
      </MenuButton>
      <Transition
        enter="transition ease-out duration-100"
        enterFrom="opacity-0 scale-95"
        enterTo="opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="opacity-100 scale-100"
        leaveTo="opacity-0 scale-95"
      >
        <MenuItems anchor="bottom end" className="z-50 w-44 origin-top-right rounded-xl border border-border bg-popover p-1 shadow-md focus:outline-none [--anchor-gap:0.25rem]">
          {index > 0 && (
            <MenuItem>
              {({ active }) => (
                <button
                  onClick={() => reorderRooms(index, index - 1)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm',
                    active ? 'bg-accent' : 'text-foreground'
                  )}
                >
                  <ChevronUp className="w-4 h-4" strokeWidth={1.5} /> เลื่อนก่อนหน้า
                </button>
              )}
            </MenuItem>
          )}
          {index < totalRooms - 1 && (
            <MenuItem>
              {({ active }) => (
                <button
                  onClick={() => reorderRooms(index, index + 1)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm',
                    active ? 'bg-accent' : 'text-foreground'
                  )}
                >
                  <ChevronDown className="w-4 h-4" strokeWidth={1.5} /> เลื่อนถัดไป
                </button>
              )}
            </MenuItem>
          )}
          <div className="my-1 h-px bg-border" />
          <MenuItem>
            {({ active }) => (
              <button
                onClick={() => duplicateRoom(room.id)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm',
                  active ? 'bg-accent' : 'text-foreground'
                )}
              >
                <Copy className="w-4 h-4" strokeWidth={1.5} /> คัดลอกห้อง
              </button>
            )}
          </MenuItem>
          <MenuItem>
            {({ active }) => (
              <button
                onClick={() => toggleRoomSuspension(room.id)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm',
                  active ? 'bg-accent' : 'text-foreground'
                )}
              >
                {room.is_suspended ? (
                  <CheckCircle2 className="w-4 h-4" strokeWidth={1.5} />
                ) : (
                  <PauseCircle className="w-4 h-4" strokeWidth={1.5} />
                )}
                {room.is_suspended ? 'เปิดใช้งาน' : 'พักห้อง (ไม่นับยอด)'}
              </button>
            )}
          </MenuItem>
          <MenuItem>
            {({ active }) => (
              <button
                onClick={handleDeleteRoom}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-destructive',
                  active && 'bg-destructive/10'
                )}
              >
                <Trash2 className="w-4 h-4" strokeWidth={1.5} /> ลบห้อง
              </button>
            )}
          </MenuItem>
        </MenuItems>
      </Transition>
    </Menu>
  );
};

// ─── การ์ดห้องแบบย่อ (compact) — ขนาดคงที่เท่ากันทุกใบ ────────────────────────────
//   ชื่อห้อง (เต็มความกว้าง — ไม่มีราคา) + จำนวนรายการ + สรุป "ชนิดสินค้า ×N" · คลิก = เข้าห้อง

const COMPACT_MAX_LINES = 4;

interface CompactRoomCardProps {
  room: Room;
  items: ItemData[];
  index: number;
  totalRooms: number;
  onOpenRoom: (roomId: string) => void;
}

const CompactRoomCard: React.FC<CompactRoomCardProps> = ({
  room,
  items,
  index,
  totalRooms,
  onOpenRoom,
}) => {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: room.id, data: { type: 'room' } });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const accent = getRoomAccent(room.id);
  const activeItems = items.filter((i) => !i.is_suspended);
  const incompleteCount = room.is_suspended ? 0 : activeItems.filter(isItemIncomplete).length;

  // สรุป "ชนิด ×N" — โควตาบรรทัด: เกิน → แสดง (MAX-1) ชนิดแรก + ปิดท้ายด้วย "+N ชนิด"
  const breakdown = itemTypeBreakdown(items);
  const shownTypes =
    breakdown.length > COMPACT_MAX_LINES ? breakdown.slice(0, COMPACT_MAX_LINES - 1) : breakdown;
  const moreTypes = breakdown.length - shownTypes.length;

  return (
    <div
      ref={setNodeRef}
      style={style}
      id={`room-${room.id}`}
      className={cn(
        'flex h-48 flex-col overflow-hidden rounded-2xl border bg-card transition-colors',
        roomAnchorCls,
        room.is_suspended && 'grayscale opacity-60 border-dashed',
        isDragging ? 'opacity-40 border-primary/50' : 'border-border'
      )}
    >
      {/* Header — grip(ลากเรียงห้อง) + avatar accent + ชื่อ(→focus) + ยอด + เมนู */}
      <div className="flex items-center gap-1.5 px-2 py-2 border-b border-border/60 shrink-0">
        <button
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label="ลากเพื่อย้ายลำดับห้อง"
          className={gripCls}
        >
          <GripVertical className="w-4 h-4" strokeWidth={1.5} />
        </button>

        <button
          onClick={() => onOpenRoom(room.id)}
          className="group flex items-center gap-2 flex-1 min-w-0 text-left rounded-md px-1 py-1 hover:bg-muted/50 transition-colors"
        >
          {/* เลขลำดับห้อง 1/3 (แทนอักษรแรก) — ชัดเจนกว่าเวลาไล่งานหน้างาน */}
          <span
            className={cn(
              'h-7 min-w-7 px-1.5 rounded-lg flex items-center justify-center font-mono text-sm font-bold tabular-nums shrink-0',
              accent.avatar,
              accent.avatarText
            )}
          >
            {index + 1}/{totalRooms}
          </span>
          <span
            className={cn(
              'min-w-0 flex-1 font-semibold text-sm truncate text-foreground group-hover:text-muted-foreground transition-colors',
              room.is_suspended && 'line-through text-muted-foreground'
            )}
          >
            {room.name}
          </span>
          <ChevronRight
            className="w-4 h-4 text-muted-foreground/30 shrink-0 transition-colors"
            strokeWidth={1.5}
          />
        </button>

        <RoomCardMenu room={room} index={index} totalRooms={totalRooms} />
      </div>

      {/* Meta — จำนวนรายการ + ค้าง */}
      <div className="flex items-center gap-2 px-4 pt-2 shrink-0">
        <span className="text-xs text-muted-foreground">
          <span className="font-mono font-semibold tabular-nums text-foreground">
            {activeItems.length}
          </span>{' '}
          รายการ
        </span>
        {incompleteCount > 0 && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/60 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/40">
            <AlertTriangle className="w-3 h-3" strokeWidth={1.5} />
            ค้าง {incompleteCount}
          </span>
        )}
      </div>

      {/* สรุปชนิดสินค้า ×N — คลิกพื้นที่นี้ = เข้าห้อง (focus) */}
      <button
        onClick={() => onOpenRoom(room.id)}
        aria-label={`เปิดห้อง ${room.name}`}
        className="flex-1 min-h-0 overflow-hidden px-4 py-2 text-left hover:bg-muted/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      >
        {breakdown.length === 0 ? (
          <p className="text-xs text-muted-foreground/50 pt-3 text-center">
            {items.length === 0 ? 'ยังไม่มีสินค้า' : 'พักทุกรายการ'}
          </p>
        ) : (
          <ul className="space-y-0.5">
            {shownTypes.map(({ label, count }) => (
              <li key={label} className="flex items-center justify-between gap-2 min-w-0">
                <span className="truncate text-sm text-foreground/90">{label}</span>
                <span className="shrink-0 font-mono text-sm font-medium tabular-nums text-muted-foreground">
                  ×{count}
                </span>
              </li>
            ))}
            {moreTypes > 0 && (
              <li className="text-xs font-medium text-muted-foreground pt-0.5">
                +{moreTypes} ชนิด
              </li>
            )}
          </ul>
        )}
      </button>
    </div>
  );
};

// ─── การ์ดห้อง (sortable + droppable container ของ item) ───────────────────────

interface SortableRoomCardProps {
  room: Room;
  items: ItemData[]; // ลำดับ item ที่จะแสดง (อาจเป็น preview ระหว่างลากข้ามห้อง)
  index: number;
  totalRooms: number;
  onAddItem: (roomId: string) => void;
  onEditItem: (roomId: string, item: ItemData) => void;
  onOpenRoom: (roomId: string) => void;
}

const SortableRoomCard: React.FC<SortableRoomCardProps> = ({
  room,
  items,
  index,
  totalRooms,
  onAddItem,
  onEditItem,
  onOpenRoom,
}) => {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: room.id, data: { type: 'room' } });
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `drop-${room.id}`,
    data: { type: 'roomdrop', roomId: room.id },
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const activeItems = items.filter((i) => !i.is_suspended);
  const roomTotal = room.is_suspended
    ? 0
    : activeItems.reduce((s, i) => s + PricingEngine.calculatePrice(i), 0);
  const itemIds = items.map((i) => i.id);
  // เลขลำดับ NN — รายการว่าง = -1 (ItemCard ไม่โชว์เลข)
  const itemDisplayIdx = displayIndexes(items);

  return (
    <div
      ref={setNodeRef}
      style={style}
      id={`room-${room.id}`}
      className={cn(
        'flex flex-col rounded-2xl border bg-card transition-colors',
        roomAnchorCls,
        room.is_suspended && 'grayscale opacity-60 border-dashed',
        isDragging ? 'opacity-40 border-primary/50' : 'border-border'
      )}
    >
      {/* Room header — grip(drag) + ชื่อ(→focus) + ยอด + เมนูจัดการ */}
      <div className="flex items-center gap-1.5 px-2 py-2 border-b border-border/60">
        <button
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label="ลากเพื่อย้ายลำดับห้อง"
          className={gripCls}
        >
          <GripVertical className="w-4 h-4" strokeWidth={1.5} />
        </button>

        <button
          onClick={() => onOpenRoom(room.id)}
          className="group flex items-center gap-2 flex-1 min-w-0 text-left rounded-md px-1 py-1 hover:bg-muted/50 transition-colors"
        >
          <span className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-sm font-bold text-foreground shrink-0">
            {room.name.charAt(0)}
          </span>
          <span className="min-w-0 flex-1">
            <span
              className={cn(
                'block font-semibold text-sm truncate text-foreground group-hover:text-muted-foreground transition-colors',
                room.is_suspended && 'line-through text-muted-foreground'
              )}
            >
              {room.name}
            </span>
            <span className="block text-xs text-muted-foreground">
              {activeItems.length} รายการ
            </span>
          </span>
          <ChevronRight className="w-4 h-4 text-muted-foreground/30 shrink-0 transition-colors" strokeWidth={1.5} />
        </button>

        <span
          className={cn(
            'shrink-0 font-mono font-semibold text-sm tabular-nums',
            room.is_suspended
              ? 'text-muted-foreground line-through'
              : 'text-emerald-600 dark:text-emerald-400'
          )}
        >
          {fmtTH(roomTotal)}
        </span>

        <RoomCardMenu room={room} index={index} totalRooms={totalRooms} />
      </div>

      {/* Items — sortable ในห้อง + เป็น droppable สำหรับย้ายข้ามห้อง */}
      {!room.is_suspended && (
        <div
          ref={setDropRef}
          className={cn(
            'p-2 space-y-2 rounded-b-2xl transition-colors',
            isOver && 'bg-accent ring-1 ring-inset ring-foreground/20'
          )}
        >
          <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
            {items.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground/50 py-4">ยังไม่มีสินค้า</p>
            ) : (
              items.map((item, iIdx) => (
                <SortableItemRow
                  key={item.id}
                  item={item}
                  index={itemDisplayIdx[iIdx]}
                  roomId={room.id}
                  onEdit={() => onEditItem(room.id, item)}
                />
              ))
            )}
          </SortableContext>

          <button
            onClick={() => onAddItem(room.id)}
            className="w-full flex items-center justify-center gap-1.5 h-9 rounded-lg border border-dashed border-border/60 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-border hover:bg-muted/20 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
            เพิ่มสินค้า
          </button>
        </div>
      )}
    </div>
  );
};

// ─── แถว item (sortable) ───────────────────────────────────────────────────────

interface SortableItemRowProps {
  item: ItemData;
  index: number;
  roomId: string;
  onEdit: () => void;
}

const SortableItemRow: React.FC<SortableItemRowProps> = ({ item, index, roomId, onEdit }) => {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id, data: { type: 'item', roomId } });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className={cn('flex items-start gap-1', isDragging && 'opacity-40')}>
      <button
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label="ลากเพื่อย้ายลำดับสินค้า"
        className={cn(gripCls, 'mt-1.5')}
      >
        <GripVertical className="w-4 h-4" strokeWidth={1.5} />
      </button>
      <div className="flex-1 min-w-0">
        <ItemCard item={item} index={index} roomId={roomId} onEdit={onEdit} />
      </div>
    </div>
  );
};

// ─── overlay ขณะลากห้อง (item ใช้ ItemCard ตรงๆ) ──────────────────────────────

const RoomOverlay: React.FC<{ room: Room }> = ({ room }) => (
  <div className="flex items-center gap-2 rounded-xl border border-primary/40 bg-card px-3 py-2 shadow-md">
    <GripVertical className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
    <span className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-sm font-bold text-foreground">
      {room.name.charAt(0)}
    </span>
    <span className="font-semibold text-sm text-foreground">{room.name}</span>
  </div>
);
