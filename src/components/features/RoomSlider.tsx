import React, { useEffect, useRef, useState } from 'react';
import { Room, ItemData } from '@/types';
import { RoomCard } from './RoomCard';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useHaptic } from '@/hooks/useHaptic';
import { cn } from '@/lib/utils';

interface RoomSliderProps {
  rooms: Room[];
  activeRoomId: string | null;
  onSetActiveRoom: (roomId: string) => void;
  viewMode: 'focus' | 'overview';
  onSetViewMode: (mode: 'focus' | 'overview') => void;
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
  onAddItem,
  onEditItem,
}) => {
  const { trigger } = useHaptic();
  const touchStartXRef = useRef<number | null>(null);
  // ทิศการสลับห้องล่าสุด — ใช้เลือกทิศ slide animation (state: อ่านตอน render ได้)
  const [direction, setDirection] = useState<'next' | 'prev'>('next');

  const activeIndex = rooms.findIndex((r) => r.id === activeRoomId);
  const canPrev = activeIndex > 0;
  const canNext = activeIndex < rooms.length - 1;

  useEffect(() => {
    if (viewMode === 'focus') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeRoomId, viewMode]);

  const navigatePrev = () => {
    if (!canPrev) return;
    trigger('selection');
    setDirection('prev');
    onSetActiveRoom(rooms[activeIndex - 1].id);
  };

  const navigateNext = () => {
    if (!canNext) return;
    trigger('selection');
    setDirection('next');
    onSetActiveRoom(rooms[activeIndex + 1].id);
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

  if (viewMode === 'focus') {
    const activeRoom = rooms.find((r) => r.id === activeRoomId);
    if (!activeRoom) return null;

    const useDots = rooms.length <= MAX_DOTS;

    return (
      <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        {/* Room Navigation Strip — large horizontal capsule prev/next (easy tap) */}
        <div className="flex items-center justify-between gap-2 mb-3 px-1">
          <button
            onClick={navigatePrev}
            disabled={!canPrev}
            aria-label="ห้องก่อนหน้า"
            className={cn(
              'inline-flex items-center gap-1 h-11 px-4 rounded-full border text-sm font-medium transition-all outline-none shrink-0',
              canPrev
                ? 'border-border bg-card text-foreground hover:bg-muted active:scale-95'
                : 'border-border/50 text-muted-foreground/30 cursor-not-allowed'
            )}
          >
            <ChevronLeft className="w-4 h-4" />
            ก่อนหน้า
          </button>

          {useDots ? (
            <div className="flex items-center gap-1.5 min-w-0">
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
                  className={cn(
                    'rounded-full transition-all duration-200 outline-none',
                    i === activeIndex
                      ? 'w-5 h-2 bg-primary'
                      : 'w-2 h-2 bg-muted-foreground/30 hover:bg-muted-foreground/60 active:scale-90'
                  )}
                />
              ))}
            </div>
          ) : (
            <span className="text-xs font-medium text-muted-foreground tabular-nums shrink-0">
              {activeIndex + 1} / {rooms.length}
            </span>
          )}

          <button
            onClick={navigateNext}
            disabled={!canNext}
            aria-label="ห้องถัดไป"
            className={cn(
              'inline-flex items-center gap-1 h-11 px-4 rounded-full border text-sm font-medium transition-all outline-none shrink-0',
              canNext
                ? 'border-border bg-card text-foreground hover:bg-muted active:scale-95'
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

  return (
    <div className="flex flex-col gap-2.5 pb-6">
      {rooms.map((room) => (
        <RoomCard
          key={room.id}
          room={room}
          isCompact
          onSelect={() => {
            onSetActiveRoom(room.id);
            onSetViewMode('focus');
          }}
          onAddItem={onAddItem}
          onEditItem={onEditItem}
        />
      ))}
    </div>
  );
};
