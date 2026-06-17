import React, { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useUIStore } from '@/store/useUIStore';
import { useCalculations } from '@/hooks/useCalculations';
import { useHaptic } from '@/hooks/useHaptic';
import {
  Menu,
  LayoutDashboard,
  ChevronRight,
  Layers,
  Home,
  HardHat,
  ClipboardList,
  User,
} from 'lucide-react';
import { fmtTH } from '@/utils/formatters';
import { cn } from '@/lib/utils';
import { useExperienceMode } from '@/hooks/useExperienceMode';
import { useSyncStatus } from '@/hooks/useSyncStatus';
import { isItemIncomplete } from '@/lib/item-status';
import { SmartNavigator } from '@/components/features/SmartNavigator';

interface MainLayoutProps {
  children: React.ReactNode;
  onOpenMainMenu?: () => void;
  onOpenJobs?: () => void;
  onOpenDiscount?: () => void;
  onOpenOverview?: () => void;
  onGoHome?: () => void;
  activeRoomId: string | null;
  onNavigateRoom: (roomId: string) => void;
  viewMode: 'focus' | 'overview';
  onSetViewMode: (mode: 'focus' | 'overview') => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  onOpenMainMenu,
  onOpenJobs,
  onOpenDiscount,
  onOpenOverview,
  onGoHome,
  activeRoomId,
  onNavigateRoom,
  viewMode,
  onSetViewMode,
}) => {
  const shopConfig = useAppStore((state) => state.shopConfig);
  const discount = useAppStore((state) => state.discount);
  const rooms = useAppStore((state) => state.rooms);
  const customerName = useAppStore((state) => state.customer.name);
  const sync = useSyncStatus();
  const addToast = useUIStore((s) => s.addToast);
  const { isField, isDetail, canSwitch, setMode } = useExperienceMode();

  // โหมดละเอียด + overview → กว้างพอสำหรับ sidebar ดัชนีห้อง (240px) + แดชบอร์ดหลายคอลัมน์
  const wideContent = isDetail && viewMode === 'overview';

  const { finalTotal } = useCalculations();
  const { trigger } = useHaptic();
  const [scrolled, setScrolled] = useState(false);
  const [isSmartNavOpen, setIsSmartNavOpen] = useState(false);

  const hasDiscount = discount.is_enabled && discount.value > 0;
  const hasVat = shopConfig.baseVatRate > 0;

  // KPI หน้างาน — จุดวัดทั้งหมด + ค้าง (แทน Net ซึ่งเป็น KPI ของโหมดละเอียด)
  const fieldStatus = useMemo(() => {
    let total = 0;
    let incomplete = 0;
    rooms.forEach((room) => {
      if (room.is_suspended) return;
      room.items.forEach((item) => {
        if (item.is_suspended) return;
        total += 1;
        if (isItemIncomplete(item)) incomplete += 1;
      });
    });
    return { total, incomplete };
  }, [rooms]);

  // สลับโหมดงาน 1 แตะ — haptic + toast ยืนยันโหมดใหม่
  const handleToggleMode = () => {
    const next = isField ? 'detail' : 'field';
    trigger('medium');
    setMode(next);
    addToast(
      'info',
      next === 'field' ? 'โหมดหน้างาน' : 'โหมดละเอียด',
      next === 'field' ? 'วัดไว จดให้ครบ — ซ่อนทุน/ส่วนต่าง' : 'ราคา · ทุน/ส่วนต่าง · จัดเรียงห้อง'
    );
  };

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="relative min-h-[100dvh] bg-background text-foreground">
      {/* iOS Status Bar Backdrop */}
      <div className="fixed top-0 left-0 right-0 z-50 h-safe-top bg-background/80 backdrop-blur-md border-b border-transparent transition-all duration-300" />

      {/* App Header */}
      <header className="fixed top-0 left-0 right-0 z-40 pt-safe-top transition-all duration-300">
        <div
          className={cn(
            'bg-background/80 backdrop-blur-md border-b border-border/50 transition-all duration-500',
            scrolled ? 'shadow-sm' : ''
          )}
        >
          <div className="max-w-3xl mx-auto h-14 px-4 sm:px-6 flex items-center justify-between">
            {/* Left: Logo / Brand (→ เมนู) + ชื่อลูกค้างานปัจจุบัน (→ สลับงาน) */}
            <div className="flex flex-col items-start justify-center min-w-0">
              <button
                className="flex items-center gap-2 group active:scale-95 transition-transform outline-none"
                onClick={() => {
                  trigger('light');
                  onOpenMainMenu?.();
                }}
              >
                <h1 className="text-base sm:text-lg font-bold text-foreground group-hover:text-muted-foreground transition-colors truncate max-w-[120px] sm:max-w-[220px]">
                  {shopConfig.name || 'ม่านธารา'}
                </h1>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 transition-colors shrink-0" strokeWidth={1.5} />
              </button>
              {/* ชื่อลูกค้างานปัจจุบัน — แตะเพื่อเปิด "งานทั้งหมด" (สลับงาน) */}
              <button
                onClick={() => {
                  trigger('selection');
                  onOpenJobs?.();
                }}
                aria-label="สลับงาน / ดูงานทั้งหมด"
                className="flex items-center gap-1 mt-0.5 text-xs font-medium text-muted-foreground hover:text-foreground active:scale-95 transition-colors max-w-[160px] sm:max-w-[280px] outline-none"
              >
                {!sync.hidden && (
                  <span
                    className={cn('w-1.5 h-1.5 rounded-full shrink-0', sync.dotClass)}
                    title={sync.label}
                  />
                )}
                <User className="w-3 h-3 shrink-0" strokeWidth={1.5} />
                <span className="truncate">{customerName || 'งานใหม่'}</span>
                <ChevronRight className="w-3 h-3 text-muted-foreground/40 shrink-0" strokeWidth={1.5} />
              </button>
            </div>

            {/* Right: จอแคบ = แคปซูลสถานะรวม (โหมด | KPI ของโหมด — หน่วยเดียว ลด 3 ก้อนเหลือ 2)
                · Desktop = Net badge 2 บรรทัดเดิม */}
            {canSwitch ? (
              <div className="flex items-stretch h-11 rounded-full border border-border/70 bg-card/60 overflow-hidden shrink-0">
                {/* ช่องซ้าย: สวิตช์โหมด (tint = สถานะ) */}
                <button
                  onClick={handleToggleMode}
                  aria-label={isField ? 'สลับเป็นโหมดละเอียด' : 'สลับเป็นโหมดหน้างาน'}
                  className={cn(
                    'flex items-center justify-center gap-1.5 min-w-11 pl-3 pr-2.5 transition-colors active:opacity-80',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                    isField
                      ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                      : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400'
                  )}
                >
                  {isField ? (
                    <HardHat className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                  ) : (
                    <ClipboardList className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                  )}
                  {/* จอแคบมาก (<380px) เหลือไอคอน+สีบอกโหมด — toast ยืนยันตอนสลับ */}
                  <span className="hidden min-[380px]:inline whitespace-nowrap text-xs font-bold">
                    {isField ? 'หน้างาน' : 'ละเอียด'}
                  </span>
                </button>

                {/* ช่องขวา: KPI ของโหมด — บรรทัดเดียว (field: จุดวัด→ลิ้นชักห้อง · detail: Net→ส่วนลด) */}
                <button
                  onClick={() => {
                    trigger('selection');
                    if (isField) setIsSmartNavOpen(true);
                    else onOpenDiscount?.();
                  }}
                  aria-label={isField ? 'ดูห้องทั้งหมด / จุดที่ค้าง' : 'ส่วนลดท้ายบิล'}
                  className="flex items-center gap-1.5 border-l border-border/70 pl-2.5 pr-3 transition-colors hover:bg-muted/50 active:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                >
                  {isField ? (
                    <span className="text-sm font-bold leading-none whitespace-nowrap">
                      <span className="font-mono tabular-nums text-foreground">
                        {fieldStatus.total}
                      </span>
                      <span className="text-foreground"> จุด</span>
                      {fieldStatus.incomplete > 0 ? (
                        <span className="text-amber-600 dark:text-amber-400">
                          {' '}
                          · ค้าง{' '}
                          <span className="font-mono tabular-nums">{fieldStatus.incomplete}</span>
                        </span>
                      ) : fieldStatus.total > 0 ? (
                        <span className="text-emerald-600 dark:text-emerald-400"> · ครบ</span>
                      ) : null}
                    </span>
                  ) : (
                    <>
                      {(hasDiscount || hasVat) && (
                        <span className="flex gap-0.5">
                          {hasDiscount && (
                            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                          )}
                          {hasVat && <span className="w-1.5 h-1.5 rounded-full bg-info" />}
                        </span>
                      )}
                      <span className="text-xs font-bold text-muted-foreground">Net</span>
                      <span
                        className={cn(
                          'font-mono tabular-nums text-sm font-bold leading-none whitespace-nowrap',
                          hasDiscount || hasVat
                            ? 'text-foreground'
                            : 'text-emerald-700 dark:text-emerald-400'
                        )}
                      >
                        {fmtTH(finalTotal)}
                      </span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              /* Desktop: Net badge เดิม — แตะเปิดส่วนลด */
              <div
                className="flex flex-col items-end justify-center cursor-pointer active:scale-95 transition-transform outline-none min-h-[44px]"
                onClick={() => {
                  trigger('selection');
                  onOpenDiscount?.();
                }}
              >
                <div className="flex items-center gap-1.5">
                  <div className="flex gap-0.5">
                    {hasDiscount && (
                      <span className="w-1.5 h-1.5 rounded-full bg-success shadow-[0_0_6px_rgba(var(--color-success),0.5)] animate-pulse" />
                    )}
                    {hasVat && (
                      <span className="w-1.5 h-1.5 rounded-full bg-info shadow-[0_0_6px_rgba(var(--color-info),0.5)]" />
                    )}
                  </div>
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Net
                  </span>
                </div>
                <div
                  className={cn(
                    'text-sm font-mono tabular-nums font-bold leading-none transition-colors',
                    hasDiscount || hasVat
                      ? 'text-foreground'
                      : 'text-emerald-700 dark:text-emerald-400'
                  )}
                >
                  {fmtTH(finalTotal)}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main
        className={cn(
          // overflow-x-clip (ไม่ใช่ hidden) — ตัด slide-in animation ที่ล้นจอเหมือนกัน แต่ไม่สร้าง
          // scroll container ที่ทำให้ position:sticky ของ OverviewSidebar ตาย
          'pt-[var(--content-top)] pb-[calc(5rem+var(--safe-bottom))] px-4 sm:px-6 space-y-4 mx-auto overflow-x-clip transition-[max-width] duration-300',
          wideContent ? 'max-w-7xl' : 'max-w-3xl'
        )}
      >
        {children}
      </main>

      {/* Floating Dock — wide horizontal capsule */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 mb-safe-bottom w-full max-w-[440px] px-4">
        <div className="flex items-center gap-1 p-1 rounded-full bg-card/95 backdrop-blur-xl shadow-lg border border-border">
          <DockPill
            icon={Home}
            label="หน้าหลัก"
            hapticType="medium"
            onClick={onGoHome}
          />
          <DockPill
            icon={Layers}
            label="ห้อง"
            hapticType="medium"
            onClick={() => setIsSmartNavOpen(true)}
          />
          <DockPill
            icon={LayoutDashboard}
            label="ภาพรวม"
            onClick={onOpenOverview}
            active={wideContent}
          />
          <DockPill
            icon={Menu}
            label="เมนู"
            onClick={onOpenMainMenu}
          />
        </div>
      </div>

      <SmartNavigator
        isOpen={isSmartNavOpen}
        onClose={() => setIsSmartNavOpen(false)}
        activeRoomId={activeRoomId}
        onNavigate={onNavigateRoom}
        onSetViewMode={onSetViewMode}
      />
    </div>
  );
};

const DockPill = ({
  icon: Icon,
  label,
  onClick,
  hapticType = 'light',
  active = false,
}: {
  icon: React.ElementType;
  label: string;
  onClick?: () => void;
  hapticType?: 'light' | 'medium' | 'selection';
  active?: boolean;
}) => {
  const { trigger } = useHaptic();

  return (
    <button
      onClick={() => {
        trigger(hapticType);
        onClick?.();
      }}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        'group flex flex-1 min-w-0 items-center justify-center gap-1.5 h-11 px-2 rounded-full transition-all duration-200 active:scale-[0.94] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
        active ? 'bg-muted' : 'hover:bg-muted'
      )}
    >
      <Icon
        className={cn(
          'w-4 h-4 shrink-0 transition-colors',
          active ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'
        )}
        strokeWidth={1.5}
      />
      <span
        className={cn(
          'text-xs font-semibold whitespace-nowrap transition-colors',
          active ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'
        )}
      >
        {label}
      </span>
    </button>
  );
};
