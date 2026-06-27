import React, { useEffect, useRef, useState } from 'react';
import { Room, ItemData } from '@/types';
import { RoomCard } from './RoomCard';
import { RoomDashboard, type DashboardDensity } from './RoomDashboard';
import { OverviewSidebar } from './OverviewSidebar';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Package,
  DoorOpen,
  Home,
  LayoutDashboard,
  Menu as MenuIcon,
  PawPrint,
} from 'lucide-react';
import { Menu, MenuButton, MenuItem, MenuItems, Transition } from '@headlessui/react';
import { MENU_ICON_TONE } from '@/config/dataTones';
import { useHaptic } from '@/hooks/useHaptic';
import { useExperienceMode } from '@/hooks/useExperienceMode';
import { useAppStore } from '@/store/useAppStore';
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
  onGoHome: () => void;
  onOpenMainMenu: () => void;
  onOpenOverview: () => void;
}

const SWIPE_THRESHOLD = 60; // ระยะแนวนอนขั้นต่ำ (px) — กันการลั่นจากปัดสั้น
const SWIPE_RATIO = 1.5; // แนวนอนต้องเด่นกว่าแนวตั้งชัดเจน (กันปัดเฉียง/เลื่อนจอ)
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
  onGoHome,
  onOpenMainMenu,
  onOpenOverview,
}) => {
  const { trigger } = useHaptic();
  const { isField } = useExperienceMode();
  const addRoom = useAppStore((s) => s.addRoom);
  // overview เป็นของโหมดละเอียด (detail — รวมมือถือ) — โหมดหน้างาน (field) ใช้ focus ทีละห้อง
  // และดูสรุปผ่าน "All Rooms Summary" (ProjectOverviewModal) จาก dock "ภาพรวม" แทน
  const effectiveViewMode = isField ? 'focus' : viewMode;
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
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
    trigger('light');
    setDirection('prev');
    const prevIndex = (activeIndex - 1 + rooms.length) % rooms.length;
    onSetActiveRoom(rooms[prevIndex].id);
  };

  const navigateNext = () => {
    if (!canNavigate) return;
    trigger('light');
    setDirection('next');
    const nextIndex = (activeIndex + 1) % rooms.length;
    onSetActiveRoom(rooms[nextIndex].id);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) {
      touchStartRef.current = null;
      return;
    }
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const deltaX = t.clientX - start.x;
    const deltaY = t.clientY - start.y;
    // แนวนอนต้องถึงเกณฑ์ "และ" เด่นกว่าแนวตั้ง — ไม่งั้นถือเป็นการเลื่อนจอแนวตั้งตามปกติ
    if (Math.abs(deltaX) < SWIPE_THRESHOLD) return;
    if (Math.abs(deltaX) < Math.abs(deltaY) * SWIPE_RATIO) return;
    if (deltaX < 0) navigateNext();
    else navigatePrev();
  };

  if (effectiveViewMode === 'focus') {
    const activeRoom = rooms.find((r) => r.id === activeRoomId);
    if (!activeRoom) return null;

    const useDots = rooms.length <= MAX_DOTS;

    return (
      <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        {/* Keyed wrapper remounts per room → slide animation fires from the swipe/nav direction */}
        <div
          key={activeRoom.id}
          className={cn(
            'animate-in fade-in duration-300',
            direction === 'next' ? 'slide-in-from-right-16' : 'slide-in-from-left-16'
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

        {/* Spacer — กันรายการสุดท้ายไม่ให้ถูกแถบนำทาง (fixed) บังตอนเลื่อนสุด (เฉพาะโหมด focus) */}
        <div aria-hidden className="h-10" />

        {/* Room Navigation Strip — แคปซูลบาง fixed ที่ล่างจอ (ตำแหน่งเดิมของ dock ที่ลบไป; ระดับนิ้วโป้ง).
            เดิมอยู่บนการ์ด (mb-3); ย้ายลงล่างตาม Design Probe. คง hit area ≥44px (h-11) — ลดแค่ visual. */}
        <div className="fixed left-1/2 -translate-x-1/2 bottom-5 mb-safe-bottom z-40 w-full max-w-[440px] px-4 pointer-events-none">
          <div className="flex items-center justify-between gap-2 p-1 rounded-full bg-card/95 backdrop-blur-xl shadow-lg border border-border colorful:bg-card colorful:backdrop-blur-none pointer-events-auto">
            {/* ซ้าย: ◄ ห้องก่อนหน้า + เมนูนำทาง (หน้าหลัก/เมนู/ภาพรวม รวมในปุ่มเดียว) */}
            <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={navigatePrev}
              disabled={!canNavigate}
              aria-label="ห้องก่อนหน้า"
              className={cn(
                'inline-flex items-center justify-center h-11 w-11 rounded-full transition-all outline-none shrink-0',
                canNavigate
                  ? 'text-foreground hover:bg-muted active:scale-95'
                  : 'text-muted-foreground/30 cursor-not-allowed'
              )}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

              {/* เมนูนำทางแอป — ยุบ หน้าหลัก/เมนู/ภาพรวม ไว้ปุ่มเดียว (Design Probe). เปิดขึ้นบน ชิดซ้าย */}
              <Menu as="div" className="relative shrink-0">
                <MenuButton
                  aria-label="เมนูนำทาง"
                  className="group inline-flex items-center justify-center h-11 w-11 rounded-full text-foreground hover:bg-muted active:scale-95 transition-all outline-none data-[open]:bg-muted"
                >
                  <PawPrint className="w-5 h-5" strokeWidth={1.5} />
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
                  <MenuItems
                    anchor="top start"
                    className="z-50 flex gap-1 origin-bottom rounded-2xl bg-popover p-1.5 shadow-xl ring-1 ring-black/5 focus:outline-none border border-border/50 [--anchor-gap:0.5rem]"
                  >
                    {/* หน้าหลัก · เมนู · ภาพรวม — ไอคอนไทล์ลงสีตามทะเบียน MENU_ICON_TONE (EEERT) */}
                    <MenuItem>
                      {({ active }) => (
                        <button
                          onClick={() => { trigger('light'); onGoHome(); }}
                          className={cn(
                            'flex w-[5rem] flex-col items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 transition-colors',
                            active ? 'bg-accent' : ''
                          )}
                        >
                          <span className={cn('flex h-9 w-9 items-center justify-center rounded-full', MENU_ICON_TONE.deliver)}>
                            <Home className="w-4 h-4" strokeWidth={1.5} />
                          </span>
                          <span className="text-sm font-medium text-foreground whitespace-nowrap">หน้าหลัก</span>
                        </button>
                      )}
                    </MenuItem>
                    <MenuItem>
                      {({ active }) => (
                        <button
                          onClick={() => { trigger('light'); onOpenMainMenu(); }}
                          className={cn(
                            'flex w-[5rem] flex-col items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 transition-colors',
                            active ? 'bg-accent' : ''
                          )}
                        >
                          <span className={cn('flex h-9 w-9 items-center justify-center rounded-full', MENU_ICON_TONE.system)}>
                            <MenuIcon className="w-4 h-4" strokeWidth={1.5} />
                          </span>
                          <span className="text-sm font-medium text-foreground whitespace-nowrap">เมนู</span>
                        </button>
                      )}
                    </MenuItem>
                    <MenuItem>
                      {({ active }) => (
                        <button
                          onClick={() => { trigger('light'); onOpenOverview(); }}
                          className={cn(
                            'flex w-[5rem] flex-col items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 transition-colors',
                            active ? 'bg-accent' : ''
                          )}
                        >
                          <span className={cn('flex h-9 w-9 items-center justify-center rounded-full', MENU_ICON_TONE.jobs)}>
                            <LayoutDashboard className="w-4 h-4" strokeWidth={1.5} />
                          </span>
                          <span className="text-sm font-medium text-foreground whitespace-nowrap">ภาพรวม</span>
                        </button>
                      )}
                    </MenuItem>
                  </MenuItems>
                </Transition>
              </Menu>
            </div>

            <div className="flex items-center gap-1 min-w-0">
              {useDots ? (
                <div className="flex items-center min-w-0">
                  {/* จุด visual เล็กเท่าเดิม แต่ hit area สูง 44px (h-11) — แตะง่ายขึ้นโดยไม่บวมสายตา */}
                  {rooms.map((room, i) => (
                    <button
                      key={room.id}
                      onClick={() => {
                        if (i !== activeIndex) {
                          trigger('light');
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
                // >8 ห้อง: แถบเลื่อนบอกตำแหน่ง (ไม่ใช้ตัวเลข — เลข 1/9 อยู่ที่ avatar การ์ดแล้ว)
                // คงเส้นคงวากับกิ่งดอท: pager เป็น "ภาพ" เสมอ ไม่สลับไปเป็นเลข
                <div
                  className="relative h-2 w-16 rounded-full bg-muted-foreground/25 shrink-0"
                  aria-hidden
                >
                  <span
                    className="absolute top-0 h-2 w-5 rounded-full bg-primary transition-all duration-200"
                    style={{
                      left: `${(activeIndex / (rooms.length - 1)) * 100}%`,
                      transform: `translateX(${(activeIndex / (rooms.length - 1)) * -100}%)`,
                    }}
                  />
                </div>
              )}

              {/* + เพิ่ม — ปุ่มเดียวเลือก "เพิ่มสินค้า" (ห้องที่เปิดอยู่) หรือ "เพิ่มห้อง" (Design Probe).
                  เปิดเมนูขึ้นบนเพราะ pager อยู่ล่างจอ. ลอกแพทเทิร์น roomMenu (RoomCard). */}
              <Menu as="div" className="relative shrink-0">
                <MenuButton
                  aria-label="เพิ่ม"
                  className="group flex h-11 items-center justify-center px-1 outline-none"
                >
                  <span className="flex w-7 h-7 items-center justify-center rounded-full border border-dashed border-border text-muted-foreground transition-colors group-hover:border-foreground/40 group-hover:text-foreground group-active:scale-90 group-data-[open]:border-foreground/40 group-data-[open]:text-foreground">
                    <Plus className="w-4 h-4" strokeWidth={1.5} />
                  </span>
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
                  <MenuItems
                    anchor="top end"
                    className="z-50 flex gap-1 origin-bottom rounded-2xl bg-popover p-1.5 shadow-xl ring-1 ring-black/5 focus:outline-none border border-border/50 [--anchor-gap:0.5rem]"
                  >
                    {/* แถวเดียว: เพิ่มห้อง (ซ้าย) · เพิ่มสินค้า (ขวา) — แตะง่ายบนมือถือ.
                        ไอคอนไทล์ลงสีตามทะเบียน dataTones (EEERT): ห้อง=jobs(คราม) · สินค้า=material(ม่วง) */}
                    <MenuItem>
                      {({ active }) => (
                        <button
                          onClick={() => { trigger('medium'); addRoom(); }}
                          className={cn(
                            'flex w-[5.5rem] flex-col items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 transition-colors',
                            active ? 'bg-accent' : ''
                          )}
                        >
                          <span className={cn('flex h-9 w-9 items-center justify-center rounded-full', MENU_ICON_TONE.jobs)}>
                            <DoorOpen className="w-4 h-4" strokeWidth={1.5} />
                          </span>
                          <span className="text-sm font-medium text-foreground whitespace-nowrap">เพิ่มห้อง</span>
                        </button>
                      )}
                    </MenuItem>
                    <MenuItem>
                      {({ active }) => (
                        <button
                          onClick={() => { trigger('medium'); onAddItem(activeRoom.id); }}
                          className={cn(
                            'flex w-[5.5rem] flex-col items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 transition-colors',
                            active ? 'bg-accent' : ''
                          )}
                        >
                          <span className={cn('flex h-9 w-9 items-center justify-center rounded-full', MENU_ICON_TONE.material)}>
                            <Package className="w-4 h-4" strokeWidth={1.5} />
                          </span>
                          <span className="text-sm font-medium text-foreground whitespace-nowrap">เพิ่มสินค้า</span>
                        </button>
                      )}
                    </MenuItem>
                  </MenuItems>
                </Transition>
              </Menu>
            </div>

            <button
              onClick={navigateNext}
              disabled={!canNavigate}
              aria-label="ห้องถัดไป"
              className={cn(
                'inline-flex items-center justify-center h-11 w-11 rounded-full transition-all outline-none shrink-0',
                canNavigate
                  ? 'text-foreground hover:bg-muted active:scale-95'
                  : 'text-muted-foreground/30 cursor-not-allowed'
              )}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
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
