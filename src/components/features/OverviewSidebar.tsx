import React, { useEffect, useRef, useState } from 'react';
import { Room } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { getRoomAccent } from '@/lib/room-accents';
import { Text } from '@/components/ui/Text';
import { cn } from '@/lib/utils';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ────────────────────────────────────────────────────────────────────────────
// Overview Sidebar (โหมดละเอียด · ภาพรวมเท่านั้น) — ดัชนีห้องเรียงลำดับ ติด sticky ข้างซ้าย
//   • คลิกชื่อห้อง → เลื่อนไปหาการ์ด `#room-{id}` ใน dashboard (การ์ดมี scroll-mt กัน header บัง)
//   • ลากแถวขึ้น/ลง → สลับลำดับห้องทั้งแอป (reorderRooms) — PointerSensor distance 8
//     ทำให้คลิกธรรมดายังนำทางได้ · คีย์บอร์ด reorder ใช้เมนู ⋯ บนการ์ด (เลื่อนก่อนหน้า/ถัดไป)
//   • scrollspy ด้วย IntersectionObserver → ไฮไลต์ห้องบนสุดที่มองเห็น (chrome ขาวดำ ไม่ใช้ primary)
//   • จอ <lg ซ่อนทั้งแผง (parent คุมด้วย `hidden lg:flex`) — มือถือใช้กริด 1 คอลัมน์ของ RoomDashboard ตรงๆ
// ────────────────────────────────────────────────────────────────────────────

interface OverviewSidebarProps {
  rooms: Room[];
  /** ค่าที่เปลี่ยนเมื่อการ์ดห้องถูก remount (เช่น density) — บังคับ scrollspy observe DOM ใหม่ */
  layoutKey?: unknown;
  className?: string;
}

export const OverviewSidebar: React.FC<OverviewSidebarProps> = ({
  rooms,
  layoutKey,
  className,
}) => {
  const reorderRooms = useAppStore((s) => s.reorderRooms);
  const [activeId, setActiveId] = useState<string | null>(null);
  // browser ยิง click ใส่แถวหลังปล่อยลาก (dnd-kit ไม่กันให้) — ตั้ง flag ชั่วคราวกันลากแล้วเด้งนำทาง
  const suppressClickRef = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // Scrollspy — ห้องแรก (ตามลำดับ) ที่การ์ดคาบเกี่ยวแถบบนของ viewport = active
  useEffect(() => {
    const els = rooms
      .map((r) => document.getElementById(`room-${r.id}`))
      .filter((el): el is HTMLElement => Boolean(el));
    if (els.length === 0) return;

    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = entry.target.id.replace(/^room-/, '');
          if (entry.isIntersecting) visible.add(id);
          else visible.delete(id);
        });
        const first = rooms.find((r) => visible.has(r.id));
        if (first) setActiveId(first.id);
      },
      // แถบสังเกตช่วงบนของจอ (ใต้ header) — การ์ดที่แตะแถบนี้ถือว่ากำลังอ่านอยู่
      { rootMargin: '-15% 0px -60% 0px' }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [rooms, layoutKey]);

  const handleNavigate = (roomId: string) => {
    if (suppressClickRef.current) return;
    document.getElementById(`room-${roomId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveId(roomId);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    // click จะตามมาหลัง dragend ใน task เดียวกัน — เคลียร์ flag หลังจบ event loop รอบนี้
    suppressClickRef.current = true;
    setTimeout(() => {
      suppressClickRef.current = false;
    }, 0);
    if (!over || active.id === over.id) return;
    const from = rooms.findIndex((r) => r.id === active.id);
    const to = rooms.findIndex((r) => r.id === over.id);
    if (from !== -1 && to !== -1) reorderRooms(from, to);
  };

  return (
    <aside
      className={cn(
        'flex flex-col rounded-2xl border border-border bg-card shadow-xs',
        'lg:sticky lg:top-[calc(3.5rem+var(--safe-top)+1rem)]',
        'max-h-[calc(100dvh-3.5rem-var(--safe-top)-7rem)]',
        className
      )}
    >
      <div className="flex items-baseline justify-between gap-2 px-4 pt-3 pb-2 border-b border-border/60 shrink-0">
        <Text variant="label" as="h2" className="font-semibold tracking-wide">
          Overview
        </Text>
        <Text variant="meta" muted numeric>
          {rooms.length} ห้อง
        </Text>
      </div>

      <nav aria-label="สารบัญห้อง" className="flex-1 min-h-0 overflow-y-auto p-2 space-y-0.5">
        {rooms.length === 0 ? (
          <Text variant="meta" muted as="p" className="px-2 py-3 text-center">
            ยังไม่มีห้อง
          </Text>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={rooms.map((r) => r.id)} strategy={verticalListSortingStrategy}>
              {rooms.map((room, idx) => (
                <SidebarRoomRow
                  key={room.id}
                  room={room}
                  index={idx}
                  isActive={room.id === activeId}
                  onNavigate={handleNavigate}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </nav>
    </aside>
  );
};

// ─── แถวห้อง (sortable ทั้งแถว) — คลิก = นำทาง · ลาก = สลับลำดับ ─────────────────

const SidebarRoomRow: React.FC<{
  room: Room;
  index: number;
  isActive: boolean;
  onNavigate: (roomId: string) => void;
}> = ({ room, index, isActive, onNavigate }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: room.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const accent = getRoomAccent(room.id);
  const activeItemCount = room.items.filter((i) => !i.is_suspended).length;

  return (
    <button
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onNavigate(room.id)}
      aria-current={isActive ? 'true' : undefined}
      title="คลิก = ไปที่ห้อง · ลากเพื่อสลับลำดับ"
      className={cn(
        'flex w-full items-center gap-2 h-11 px-2 rounded-lg text-left transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isDragging
          ? 'opacity-40 bg-muted cursor-grabbing'
          : isActive
            ? 'bg-muted'
            : 'hover:bg-muted/60'
      )}
    >
      <span className="w-5 shrink-0 text-right font-mono text-xs font-medium tabular-nums text-muted-foreground">
        {index + 1}
      </span>
      <span
        className={cn(
          'w-2 h-2 rounded-full shrink-0',
          accent.stripe,
          room.is_suspended && 'opacity-40 grayscale'
        )}
      />
      <span
        className={cn(
          'flex-1 min-w-0 truncate text-sm',
          isActive ? 'font-semibold text-foreground' : 'font-medium text-foreground',
          room.is_suspended && 'line-through text-muted-foreground'
        )}
      >
        {room.name}
      </span>
      <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
        {activeItemCount}
      </span>
    </button>
  );
};
