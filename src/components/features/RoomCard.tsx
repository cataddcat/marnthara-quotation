import React, { useState, useMemo, useRef } from 'react';
import { Room, ItemData } from '@/types';
import { ItemCard } from './ItemCard';
import { EmptyState } from './EmptyState';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { PricingEngine } from '@/lib/pricing/PricingEngine';
import { fmtTH } from '@/utils/formatters';
import { cn } from '@/lib/utils';
import { ITEM_CONFIG } from '@/config/constants';
import { isItemIncomplete, isItemReady, displayIndexes } from '@/lib/item-status';
import {
  ChevronRight,
  Plus,
  Trash2,
  Copy,
  PauseCircle,
  CheckCircle2,
  MoreHorizontal,
  Pencil,
  Check,
  X,
  Package,
} from 'lucide-react';
import { Menu, MenuButton, MenuItem, MenuItems, Transition } from '@headlessui/react';
import { useAppStore } from '@/store/useAppStore';
import { useConfirm } from '@/hooks/useConfirm';
import { getRoomAccent } from '@/lib/room-accents';
import { Metric } from '@/components/ui/Metric';

interface RoomCardProps {
  room: Room;
  isCompact?: boolean;
  roomIndex?: number;
  totalRooms?: number;
  onSelect?: () => void;
  onAddItem: (roomId: string) => void;
  onEditItem: (roomId: string, item: ItemData) => void;
  className?: string;
}

export const RoomCard: React.FC<RoomCardProps> = ({
  room,
  isCompact = false,
  roomIndex,
  totalRooms,
  onSelect,
  onAddItem,
  onEditItem,
  className,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(room.name);
  const inputRef = useRef<HTMLInputElement>(null);

  const removeRoom = useAppStore((state) => state.removeRoom);
  const duplicateRoom = useAppStore((state) => state.duplicateRoom);
  const toggleRoomSuspension = useAppStore((state) => state.toggleRoomSuspension);
  const updateRoom = useAppStore((state) => state.updateRoom);
  const { confirm } = useConfirm();

  const accent = getRoomAccent(room.id);

  const roomTotal = useMemo(() => {
    if (room.is_suspended) return 0;
    return room.items
      .filter((i) => !i.is_suspended)
      .reduce((sum, item) => sum + PricingEngine.calculatePrice(item), 0);
  }, [room.items, room.is_suspended]);

  const typeBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    room.items
      .filter((i) => !i.is_suspended)
      .forEach((item) => {
        const label = ITEM_CONFIG[item.type]?.name ?? item.type;
        counts[label] = (counts[label] || 0) + 1;
      });
    return Object.entries(counts);
  }, [room.items]);

  const itemCount = room.items.length;
  const suspendedCount = room.items.filter((i) => i.is_suspended).length;
  const activeItems = room.items.filter((i) => !i.is_suspended);
  const incompleteCount = activeItems.filter(isItemIncomplete).length;
  // "ครบ" = มีรายการที่ใช้งาน + ทุกรายการพร้อมจริง (ไม่ว่าง/ขนาดครบ/มีราคา) — กัน false "ครบ" จาก item ว่าง
  const allReady = activeItems.length > 0 && activeItems.every(isItemReady);
  // เลขลำดับ NN — รายการว่าง = -1 (ItemCard ไม่โชว์เลข) ให้รายการจริงนับต่อเนื่อง
  const itemDisplayIdx = displayIndexes(room.items);

  const startEditingName = () => {
    setEditName(room.name);
    setIsEditingName(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const handleSaveName = () => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== room.name) {
      updateRoom(room.id, { name: trimmed });
    } else {
      setEditName(room.name);
    }
    setIsEditingName(false);
  };

  const handleCancelName = () => {
    setEditName(room.name);
    setIsEditingName(false);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSaveName();
    if (e.key === 'Escape') handleCancelName();
  };

  const handleDeleteRoom = async () => {
    const isConfirmed = await confirm({
      title: `ลบห้อง "${room.name}"?`,
      description: 'รายการทั้งหมดในห้องนี้จะถูกลบและไม่สามารถกู้คืนได้',
      confirmLabel: 'ยืนยันลบ',
      variant: 'destructive',
    });
    if (isConfirmed) removeRoom(room.id);
  };

  const roomMenu = (
    <Menu as="div" className="relative z-10 shrink-0">
      <MenuButton aria-label="ตัวเลือกห้อง" className="p-3 rounded-xl text-muted-foreground hover:bg-black/5 dark:hover:bg-white/10 hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-90">
        <MoreHorizontal className="w-4 h-4" strokeWidth={1.5} />
      </MenuButton>
      <Transition
        as={React.Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <MenuItems anchor="bottom end" className="z-50 w-48 origin-top-right divide-y divide-border rounded-xl bg-popover p-1 shadow-xl ring-1 ring-black/5 focus:outline-none border border-border/50 [--anchor-gap:0.5rem]">
          <div className="p-1">
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
                    active ? 'bg-warning/10 text-warning-foreground' : 'text-foreground'
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
          </div>
          <div className="p-1">
            <MenuItem>
              {({ active }) => (
                <button
                  onClick={handleDeleteRoom}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-destructive',
                    active ? 'bg-destructive/10' : ''
                  )}
                >
                  <Trash2 className="w-4 h-4" strokeWidth={1.5} /> ลบห้อง
                </button>
              )}
            </MenuItem>
          </div>
        </MenuItems>
      </Transition>
    </Menu>
  );

  // ─── COMPACT MODE (overview) ────────────────────────────────────────────────
  if (isCompact) {
    return (
      <div
        id={`room-${room.id}`}
        className={cn(
          'rounded-2xl border bg-card transition-[border-color] duration-200',
          room.is_suspended
            ? 'grayscale opacity-60 border-dashed border-border'
            : 'border-border hover:border-foreground/20',
          className
        )}
      >
        <div className="flex items-stretch">
          {/* Left accent rail */}
          <div className={cn('w-1.5 shrink-0 rounded-l-2xl', accent.stripe)} />

          {/* Clickable body */}
          <button
            onClick={onSelect}
            className="flex items-center gap-3 flex-1 text-left min-w-0 px-3 py-3 active:bg-muted/40 transition-colors"
          >
            {/* Avatar */}
            <div
              className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0',
                accent.avatar,
                accent.avatarText
              )}
            >
              {room.name.charAt(0)}
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <h3
                className={cn(
                  'font-semibold text-[15px] leading-snug truncate',
                  room.is_suspended && 'line-through text-muted-foreground'
                )}
              >
                {room.name}
              </h3>
              {typeBreakdown.length > 0 ? (
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {typeBreakdown
                    .map(([label, count]) => `${label}${count > 1 ? ` ×${count}` : ''}`)
                    .join(' · ')}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground/40 mt-0.5">ยังไม่มีรายการ</p>
              )}
            </div>

            {/* Price + Chevron */}
            <div className="flex items-center gap-1.5 shrink-0">
              {incompleteCount > 0 && !room.is_suspended && (
                <span className="inline-flex items-center text-xs font-semibold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/60 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/40">
                  ค้าง {incompleteCount}
                </span>
              )}
              <span
                className={cn(
                  'text-sm font-semibold font-mono tabular-nums',
                  room.is_suspended
                    ? 'text-muted-foreground line-through'
                    : 'text-emerald-600 dark:text-emerald-400'
                )}
              >
                {fmtTH(roomTotal)}
              </span>
              <ChevronRight className="w-4 h-4 text-muted-foreground/30 shrink-0" strokeWidth={1.5} />
            </div>
          </button>

          {/* Kebab — outside the button */}
          <div className="flex items-center pr-1">{roomMenu}</div>
        </div>
      </div>
    );
  }

  // ─── FOCUS MODE (full) ───────────────────────────────────────────────────────
  return (
    <div id={`room-${room.id}`} className={cn('flex flex-col gap-2', className)}>
      {/* Room Header Card */}
      <div
        className={cn(
          'relative rounded-2xl border bg-card overflow-hidden transition-[border-color] duration-300 flex',
          room.is_suspended
            ? 'grayscale opacity-60 border-dashed border-border'
            : 'border-border/60'
        )}
      >
        {/* Room-change highlight — accent ring กระพริบ on remount (RoomSlider keys by room id) */}
        <div
          className={cn(
            'pointer-events-none absolute inset-0 z-10 rounded-2xl ring-2 ring-inset animate-room-flash',
            accent.ring
          )}
        />
        {/* Left accent rail — full-height container edge (dashboard panel feel) */}
        <div className={cn('w-1.5 shrink-0', accent.stripe)} />

        <div className="flex-1 min-w-0">
        {/* Header body */}
        <div className="p-5 pb-3">
          <div className="flex items-start gap-3">
            {/* Avatar */}
            <div
              className={cn(
                'w-11 h-11 rounded-xl flex items-center justify-center shrink-0 select-none',
                accent.avatar,
                accent.avatarText
              )}
            >
              {roomIndex !== undefined && totalRooms !== undefined ? (
                <span className="text-sm font-bold tabular-nums leading-none">
                  {roomIndex + 1}/{totalRooms}
                </span>
              ) : (
                <span className="text-lg font-bold">{room.name.charAt(0)}</span>
              )}
            </div>

            {/* Name + type breakdown */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                {isEditingName ? (
                  <div className="flex items-center gap-1 flex-1 min-w-0">
                    <input
                      ref={inputRef}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={handleNameKeyDown}
                      onBlur={handleSaveName}
                      className="font-bold text-lg bg-background border border-primary/30 rounded-lg px-2 py-0.5 flex-1 min-w-0 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <button
                      onClick={handleSaveName}
                      className="p-0.5 text-foreground hover:bg-muted rounded"
                    >
                      <Check className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </button>
                    <button
                      onClick={handleCancelName}
                      className="p-0.5 text-muted-foreground hover:bg-muted rounded"
                    >
                      <X className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </button>
                  </div>
                ) : (
                  <>
                    <h2
                      className={cn(
                        'text-lg font-bold leading-normal truncate',
                        room.is_suspended && 'line-through text-muted-foreground'
                      )}
                    >
                      {room.name}
                    </h2>
                    <button
                      onClick={startEditingName}
                      aria-label="แก้ไขชื่อห้อง"
                      className="p-0.5 text-muted-foreground/30 hover:text-foreground shrink-0 transition-colors"
                    >
                      <Pencil className="w-3 h-3" strokeWidth={1.5} />
                    </button>
                  </>
                )}
              </div>

              {/* Item type breakdown pills */}
              {typeBreakdown.length > 0 ? (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {typeBreakdown.map(([label, count]) => (
                    <span
                      key={label}
                      className={cn(
                        'text-xs px-2 py-0.5 rounded-full font-medium',
                        accent.tag
                      )}
                    >
                      {label}
                      {count > 1 ? ` ×${count}` : ''}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground/40 mt-1">ยังไม่มีรายการ</p>
              )}
            </div>

            {/* Kebab menu */}
            {roomMenu}
          </div>
        </div>

        {/* Stats footer — KPI strip: สถานะ (count/ครบ) ซ้าย · ยอดรวมห้อง (emerald hero) ขวา */}
        <div className="px-5 py-3 border-t border-border/30 bg-muted/20 flex items-end justify-between gap-3">
          <div className="flex flex-col gap-1 min-w-0">
            <span className="text-xs font-medium tracking-wide text-muted-foreground">สถานะ</span>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="font-semibold text-foreground shrink-0">{itemCount} รายการ</span>
              {incompleteCount > 0 ? (
                <>
                  <span className="text-muted-foreground/30">·</span>
                  <span className="text-amber-600 dark:text-amber-400 font-semibold shrink-0">
                    ค้าง {incompleteCount} จุด
                  </span>
                </>
              ) : (
                allReady &&
                !room.is_suspended && (
                  <>
                    <span className="text-muted-foreground/30">·</span>
                    <span className="inline-flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-400 shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={1.5} /> ครบ
                    </span>
                  </>
                )
              )}
              {suspendedCount > 0 && (
                <>
                  <span className="text-muted-foreground/30">·</span>
                  <span className="text-amber-500 shrink-0">{suspendedCount} พัก</span>
                </>
              )}
            </div>
          </div>
          <Metric
            label="ยอดรวมห้อง"
            value={fmtTH(roomTotal)}
            tone="money"
            size="lg"
            align="right"
            struck={room.is_suspended}
            className="shrink-0"
          />
        </div>
        </div>
        {/* /flex-1 column */}
      </div>

      {/* Items List (only in non-suspended focus mode) */}
      {!room.is_suspended &&
        (room.items.length === 0 ? (
          // ห้องว่าง — CTA เดียว (EmptyState + ปุ่มในตัว) ไม่ซ้ำกับแถบ dashed → ไม่เปลืองพื้นที่
          <EmptyState
            icon={Package}
            title="ยังไม่มีรายการในห้องนี้"
            description="เพิ่มรายการ วัดขนาด แล้วคำนวณผ้า/พื้นที่ และราคา"
            size="sm"
            className="animate-fade-in rounded-2xl border border-dashed border-border/60 bg-muted/10"
            action={
              <Button
                size="sm"
                variant="outline"
                onClick={() => onAddItem(room.id)}
                className="gap-1.5"
              >
                <Plus className="w-4 h-4" strokeWidth={1.5} /> เพิ่มสินค้า
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 animate-fade-in pb-1">
            {room.items.map((item, idx) => (
              <ItemCard
                key={item.id}
                item={item}
                index={itemDisplayIdx[idx]}
                roomId={room.id}
                onEdit={() => onEditItem(room.id, item)}
              />
            ))}
            {/* เพิ่มสินค้า — action ที่กดบ่อยที่สุดหน้างาน: แตะ ≥44px (h-11) + ป้าย 14px */}
            <button
              onClick={() => onAddItem(room.id)}
              className="sm:col-span-2 group flex items-center justify-center gap-1.5 h-11 rounded-xl border border-dashed border-border/50 hover:border-foreground/30 hover:bg-muted/20 transition-[border-color,background-color,transform] active:scale-[0.99]"
            >
              <Plus className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" strokeWidth={1.5} />
              <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground">
                เพิ่มสินค้า
              </span>
            </button>
          </div>
        ))}
    </div>
  );
};

export const RoomCardSkeleton: React.FC = () => (
  <div className="rounded-2xl border border-border bg-card overflow-hidden flex">
    <div className="w-1.5 shrink-0 bg-muted animate-pulse" />
    <div className="flex-1 min-w-0">
      <div className="p-5 pb-3">
        <div className="flex items-start gap-3">
          <Skeleton className="w-11 h-11 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-32" />
            <div className="flex gap-1.5">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          </div>
          <Skeleton className="w-7 h-7 rounded-lg shrink-0" />
        </div>
      </div>
      <div className="px-5 py-3 border-t border-border/30 bg-muted/20 flex items-end justify-between">
        <Skeleton className="h-7 w-20" />
        <Skeleton className="h-7 w-24" />
      </div>
    </div>
  </div>
);
