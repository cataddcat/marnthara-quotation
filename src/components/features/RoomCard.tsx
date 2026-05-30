import React, { useState, useMemo, useRef } from 'react';
import { Room, ItemData } from '@/types';
import { ItemCard } from './ItemCard';
import { EmptyState } from './EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { PricingEngine } from '@/lib/pricing/PricingEngine';
import { fmtTH } from '@/utils/formatters';
import { cn } from '@/lib/utils';
import { ITEM_CONFIG } from '@/config/constants';
import { isItemIncomplete } from '@/lib/item-status';
import {
  ChevronRight,
  Plus,
  Settings2,
  Trash2,
  Copy,
  EyeOff,
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

// Deterministic accent per room — all classes must be static strings for Tailwind JIT
const ROOM_ACCENTS = [
  {
    stripe: 'bg-violet-500',
    avatar: 'bg-violet-500/15',
    avatarText: 'text-violet-600 dark:text-violet-300',
    tag: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
  },
  {
    stripe: 'bg-sky-500',
    avatar: 'bg-sky-500/15',
    avatarText: 'text-sky-600 dark:text-sky-300',
    tag: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  },
  {
    stripe: 'bg-teal-500',
    avatar: 'bg-teal-500/15',
    avatarText: 'text-teal-600 dark:text-teal-300',
    tag: 'bg-teal-500/10 text-teal-700 dark:text-teal-300',
  },
  {
    stripe: 'bg-emerald-500',
    avatar: 'bg-emerald-500/15',
    avatarText: 'text-emerald-600 dark:text-emerald-300',
    tag: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  },
  {
    stripe: 'bg-amber-500',
    avatar: 'bg-amber-500/15',
    avatarText: 'text-amber-600 dark:text-amber-300',
    tag: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  },
  {
    stripe: 'bg-orange-500',
    avatar: 'bg-orange-500/15',
    avatarText: 'text-orange-600 dark:text-orange-300',
    tag: 'bg-orange-500/10 text-orange-700 dark:text-orange-300',
  },
  {
    stripe: 'bg-rose-500',
    avatar: 'bg-rose-500/15',
    avatarText: 'text-rose-600 dark:text-rose-300',
    tag: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
  },
  {
    stripe: 'bg-pink-500',
    avatar: 'bg-pink-500/15',
    avatarText: 'text-pink-600 dark:text-pink-300',
    tag: 'bg-pink-500/10 text-pink-700 dark:text-pink-300',
  },
] as const;

function getRoomAccent(id: string) {
  const idx = [...id].reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % ROOM_ACCENTS.length;
  return ROOM_ACCENTS[idx];
}

interface RoomCardProps {
  room: Room;
  isCompact?: boolean;
  roomIndex?: number;
  totalRooms?: number;
  onSelect?: () => void;
  onAddItem: (roomId: string) => void;
  onEditItem: (roomId: string, item: ItemData) => void;
  onOpenDefaults: (roomId: string) => void;
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
  onOpenDefaults,
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
  const incompleteCount = room.items.filter(
    (i) => !i.is_suspended && isItemIncomplete(i)
  ).length;

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
      <MenuButton aria-label="ตัวเลือกห้อง" className="p-3 rounded-xl text-muted-foreground hover:bg-black/5 dark:hover:bg-white/10 hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 active:scale-90">
        <MoreHorizontal className="w-4 h-4" />
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
        <MenuItems className="absolute right-0 z-50 mt-2 w-48 origin-top-right divide-y divide-border rounded-xl bg-popover p-1 shadow-xl ring-1 ring-black/5 focus:outline-none border border-border/50">
          <div className="p-1">
            <MenuItem>
              {({ active }) => (
                <button
                  onClick={() => onOpenDefaults(room.id)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm',
                    active ? 'bg-primary/10 text-primary' : 'text-foreground'
                  )}
                >
                  <Settings2 className="w-4 h-4" /> ตั้งค่าห้อง
                </button>
              )}
            </MenuItem>
            <MenuItem>
              {({ active }) => (
                <button
                  onClick={() => duplicateRoom(room.id)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm',
                    active ? 'bg-accent' : 'text-foreground'
                  )}
                >
                  <Copy className="w-4 h-4" /> คัดลอกห้อง
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
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <EyeOff className="w-4 h-4" />
                  )}
                  {room.is_suspended ? 'เปิดใช้งาน' : 'ซ่อนห้อง'}
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
                  <Trash2 className="w-4 h-4" /> ลบห้อง
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
          'rounded-xl border bg-card transition-all duration-200',
          room.is_suspended
            ? 'grayscale opacity-60 border-dashed border-border'
            : 'border-border hover:border-primary/20 hover:shadow-sm',
          className
        )}
      >
        <div className="flex items-stretch">
          {/* Left accent stripe */}
          <div className={cn('w-1 shrink-0 rounded-l-xl', accent.stripe)} />

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
                <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/60 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/40">
                  ค้าง {incompleteCount}
                </span>
              )}
              <span
                className={cn(
                  'text-sm font-bold tabular-nums',
                  room.is_suspended
                    ? 'text-muted-foreground line-through'
                    : 'text-emerald-600 dark:text-emerald-400'
                )}
              >
                {fmtTH(roomTotal)}
              </span>
              <ChevronRight className="w-4 h-4 text-muted-foreground/30 shrink-0" />
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
          'rounded-2xl border bg-card transition-all duration-300',
          room.is_suspended
            ? 'grayscale opacity-60 border-dashed border-border'
            : 'border-border/60 shadow-md'
        )}
      >
        {/* Top accent stripe */}
        <div className={cn('h-1 rounded-t-2xl', accent.stripe)} />

        {/* Header body */}
        <div className="p-4 pb-3">
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
                <span className="text-xl font-bold">{room.name.charAt(0)}</span>
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
                      className="font-bold text-xl bg-background border border-primary/30 rounded-lg px-2 py-0.5 flex-1 min-w-0 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <button
                      onClick={handleSaveName}
                      className="p-0.5 text-primary hover:bg-primary/10 rounded"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={handleCancelName}
                      className="p-0.5 text-muted-foreground hover:bg-muted rounded"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <h2
                      className={cn(
                        'text-xl font-bold leading-tight truncate',
                        room.is_suspended && 'line-through text-muted-foreground'
                      )}
                    >
                      {room.name}
                    </h2>
                    <button
                      onClick={startEditingName}
                      className="p-0.5 text-muted-foreground/30 hover:text-primary shrink-0 transition-colors"
                    >
                      <Pencil className="w-3 h-3" />
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
                        'text-[11px] px-2 py-0.5 rounded-full font-medium',
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

        {/* Stats footer */}
        <div className="px-4 py-2.5 border-t border-border/30 bg-muted/20 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{itemCount} รายการ</span>
            {incompleteCount > 0 && (
              <>
                <span className="text-muted-foreground/30">·</span>
                <span className="text-amber-600 dark:text-amber-400 font-semibold">
                  ค้าง {incompleteCount} จุด
                </span>
              </>
            )}
            {suspendedCount > 0 && (
              <>
                <span className="text-muted-foreground/30">·</span>
                <span className="text-amber-500">{suspendedCount} ซ่อน</span>
              </>
            )}
          </div>
          <span
            className={cn(
              'text-base font-bold tabular-nums',
              room.is_suspended
                ? 'text-muted-foreground line-through'
                : 'text-emerald-600 dark:text-emerald-400'
            )}
          >
            {fmtTH(roomTotal)}
          </span>
        </div>
      </div>

      {/* Items List (only in non-suspended focus mode) */}
      {!room.is_suspended && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 animate-fade-in pb-1">
          {room.items.length === 0 ? (
            <div className="sm:col-span-2">
              <EmptyState
                icon={Package}
                title="ยังไม่มีสินค้าในห้องนี้"
                description="เพิ่มสินค้าเพื่อเริ่มคำนวณราคา"
                size="sm"
              />
            </div>
          ) : (
            room.items.map((item, idx) => (
              <ItemCard
                key={item.id}
                item={item}
                index={idx}
                roomId={room.id}
                onEdit={() => onEditItem(room.id, item)}
              />
            ))
          )}
          <button
            onClick={() => onAddItem(room.id)}
            className="sm:col-span-2 w-full group flex items-center justify-center gap-2 h-10 rounded-xl border-2 border-dashed border-border/50 hover:border-primary/40 bg-muted/10 hover:bg-primary/5 transition-all active:scale-[0.99]"
          >
            <Plus className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="text-xs font-medium text-muted-foreground group-hover:text-primary">
              เพิ่มสินค้าใหม่
            </span>
          </button>
        </div>
      )}
    </div>
  );
};

export const RoomCardSkeleton: React.FC = () => (
  <div className="rounded-2xl border border-border bg-card overflow-hidden">
    <div className="h-1 bg-muted animate-pulse" />
    <div className="p-4 pb-3">
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
    <div className="px-4 py-2.5 border-t border-border/30 bg-muted/20 flex items-center justify-between">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-4 w-20" />
    </div>
  </div>
);
