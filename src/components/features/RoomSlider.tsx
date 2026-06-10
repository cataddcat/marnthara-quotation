import React, { useEffect, useRef, useState } from 'react';
import { Room, ItemData } from '@/types';
import { RoomCard } from './RoomCard';
import { RoomDashboard, type DashboardDensity } from './RoomDashboard';
import { OverviewSidebar } from './OverviewSidebar';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useHaptic } from '@/hooks/useHaptic';
import { useExperienceMode } from '@/hooks/useExperienceMode';
import { cn } from '@/lib/utils';

interface RoomSliderProps {
  rooms: Room[];
  activeRoomId: string | null;
  onSetActiveRoom: (roomId: string) => void;
  viewMode: 'focus' | 'overview';
  onSetViewMode: (mode: 'focus' | 'overview') => void;
  dashboardDensity: DashboardDensity;
  onSetDashboardDensity: (density: DashboardDensity) => void;
  onAddItem: (roomId: string) => void;
  onEditItem: (roomId: string, item: ItemData) => void;
}

const SWIPE_THRESHOLD = 50;
const MAX_DOTS = 8;

export const RoomSlider: React.FC<RoomSliderProps> = ({
  rooms,
  activeRoomId,
  onSetActiveRoom,
  viewMode,
  onSetViewMode,
  dashboardDensity,
  onSetDashboardDensity,
  onAddItem,
  onEditItem,
}) => {
  const { trigger } = useHaptic();
  const { isField } = useExperienceMode();
  // overview เป็นของโหมดละเอียด (detail — รวมมือถือ) — โหมดหน้างาน (field) ใช้ focus ทีละห้อง
  // และดูสรุปผ่าน "All Rooms Summary" (ProjectOverviewModal) จาก dock "ภาพรวม" แทน
  const effectiveViewMode = isField ? 'focus' : viewMode;
  const touchStartXRef = useRef<number | null>(null);
  // ทิศการสลับห้องล่าสุด — ใช้เลือกทิศ slide animation (state: อ่านตอน render ได้)
  const [direction, setDirection] = useState<'next' | 'prev'>('next');

  const activeIndex = rooms.findIndex((r) => r.id === activeRoomId);
  // วนรอบ (circular): "ถัดไป" จากห้องสุดท้าย → ห้องแรก, "ก่อนหน้า" จากห้องแรก → ห้องสุดท้าย
  // เปิดใช้เมื่อมีมากกว่า 1 ห้องเท่านั้น (1 ห้อง = วนไปหาตัวเอง ไม่มีความหมาย)
  const canNavigate = rooms.length > 1;

  useEffect(() => {
    if (viewMode === 'focus') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeRoomId, viewMode]);

  const navigatePrev = () => {
    if (!canNavigate) return;
    trigger('selection');
    setDirection('prev');
    const prevIndex = (activeIndex - 1 + rooms.length) % rooms.length;
    onSetActiveRoom(rooms[prevIndex].id);
  };

  const navigateNext = () => {
    if (!canNavigate) return;
    trigger('selection');
    setDirection('next');
    const nextIndex = (activeIndex + 1) % rooms.length;
    onSetActiveRoom(rooms[nextIndex].id);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartXRef.current;
    touchStartXRef.current = null;
    if (Math.abs(delta) < SWIPE_THRESHOLD) return;
    if (delta < 0) navigateNext();
    else navigatePrev();
  };

  if (effectiveViewMode === 'focus') {
    const activeRoom = rooms.find((r) => r.id === activeRoomId);
    if (!activeRoom) return null;

    const useDots = rooms.length <= MAX_DOTS;

    return (
      <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        {/* Room Navigation Strip — large horizontal capsule prev/next (easy tap) */}
        <div className="flex items-center justify-between gap-2 mb-3 px-1">
          <button
            onClick={navigatePrev}
            disabled={!canNavigate}
            aria-label="ห้องก่อนหน้า"
            className={cn(
              'inline-flex items-center gap-1 h-11 px-4 rounded-full border text-sm font-medium transition-all outline-none shrink-0',
              canNavigate
                ? 'border-border bg-card text-foreground shadow-sm hover:bg-muted hover:shadow-md active:scale-95 active:shadow-sm'
                : 'border-border/50 text-muted-foreground/30 cursor-not-allowed'
            )}
          >
            <ChevronLeft className="w-4 h-4" />
            ก่อนหน้า
          </button>

          {useDots ? (
            <div className="flex items-center min-w-0">
              {/* จุด visual เล็กเท่าเดิม แต่ hit area สูง 44px (h-11) — แตะง่ายขึ้นโดยไม่บวมสายตา */}
              {rooms.map((room, i) => (
                <button
                  key={room.id}
                  onClick={() => {
                    if (i !== activeIndex) {
                      trigger('selection');
                      setDirection(i > activeIndex ? 'next' : 'prev');
                      onSetActiveRoom(room.id);
                    }
                  }}
                  aria-label={room.name}
                  className="group flex h-11 w-6 items-center justify-center outline-none"
                >
                  <span
                    className={cn(
                      'rounded-full transition-all duration-200',
                      i === activeIndex
                        ? 'w-5 h-2 bg-primary'
                        : 'w-2 h-2 bg-muted-foreground/30 group-hover:bg-muted-foreground/60 group-active:scale-90'
                    )}
                  />
                </button>
              ))}
            </div>
          ) : (
            <span className="text-xs font-medium text-muted-foreground tabular-nums shrink-0">
              {activeIndex + 1} / {rooms.length}
            </span>
          )}

          <button
            onClick={navigateNext}
            disabled={!canNavigate}
            aria-label="ห้องถัดไป"
            className={cn(
              'inline-flex items-center gap-1 h-11 px-4 rounded-full border text-sm font-medium transition-all outline-none shrink-0',
              canNavigate
                ? 'border-border bg-card text-foreground shadow-sm hover:bg-muted hover:shadow-md active:scale-95 active:shadow-sm'
                : 'border-border/50 text-muted-foreground/30 cursor-not-allowed'
            )}
          >
            ถัดไป
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Keyed wrapper remounts per room → slide animation fires from the swipe/nav direction */}
        <div
          key={activeRoom.id}
          className={cn(
            'animate-in fade-in duration-300',
            direction === 'next' ? 'slide-in-from-right-8' : 'slide-in-from-left-8'
          )}
        >
          <RoomCard
            room={activeRoom}
            roomIndex={activeIndex}
            totalRooms={rooms.length}
            onAddItem={onAddItem}
            onEditItem={onEditItem}
          />
        </div>
      </div>
    );
  }

  // overview (โหมดละเอียด) = sidebar ดัชนีห้อง (≥lg, sticky ซ้าย) + แดชบอร์ดกริด + ลากเรียงลำดับ
  // (จอแคบ: sidebar ซ่อน, กริดยุบเหลือ 1 คอลัมน์ — ยังลากเรียง/ย้ายข้ามห้องด้วยนิ้วได้)
  return (
    <div className="lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-4 lg:items-start">
      <OverviewSidebar rooms={rooms} layoutKey={dashboardDensity} className="hidden lg:flex" />
      <RoomDashboard
        rooms={rooms}
        density={dashboardDensity}
        onSetDensity={onSetDashboardDensity}
        onAddItem={onAddItem}
        onEditItem={onEditItem}
        onOpenRoom={(roomId) => {
          onSetActiveRoom(roomId);
          onSetViewMode('focus');
        }}
      />
    </div>
  );
};
