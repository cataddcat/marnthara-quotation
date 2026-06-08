import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useCalculations } from '@/hooks/useCalculations';
import { useHaptic } from '@/hooks/useHaptic';
import { Menu, LayoutDashboard, ChevronRight, Layers, Home } from 'lucide-react';
import { fmtTH } from '@/utils/formatters';
import { cn } from '@/lib/utils';
import { useExperienceMode } from '@/hooks/useExperienceMode';
import { SmartNavigator } from '@/components/features/SmartNavigator';

interface MainLayoutProps {
  children: React.ReactNode;
  onOpenMainMenu?: () => void;
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
  const { isLite } = useExperienceMode();

  // Full tier + overview → กว้างพอสำหรับแดชบอร์ดหลายคอลัมน์
  const wideContent = !isLite && viewMode === 'overview';

  const { finalTotal } = useCalculations();
  const { trigger } = useHaptic();
  const [scrolled, setScrolled] = useState(false);
  const [isSmartNavOpen, setIsSmartNavOpen] = useState(false);

  const hasDiscount = discount.is_enabled && discount.value > 0;
  const hasVat = shopConfig.baseVatRate > 0;

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
          <div className="max-w-3xl mx-auto h-14 px-6 flex items-center justify-between">
            {/* Left: Logo / Brand */}
            <button
              className="flex flex-col items-start justify-center text-left group active:scale-95 transition-transform outline-none min-h-[44px]"
              onClick={() => {
                trigger('light');
                onOpenMainMenu?.();
              }}
            >
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-foreground group-hover:text-muted-foreground transition-colors truncate max-w-[150px] sm:max-w-[220px]">
                  {shopConfig.name || 'ม่านธารา'}
                </h1>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 transition-colors shrink-0" strokeWidth={1.5} />
              </div>
              <span className="text-xs font-medium text-muted-foreground tracking-wide">
                ผ้าม่าน & ของตกแต่ง
              </span>
            </button>

            {/* Right: Price Badge */}
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
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main
        className={cn(
          'pt-[calc(3.5rem+env(safe-area-inset-top))] pb-[calc(5rem+env(safe-area-inset-bottom))] px-4 sm:px-6 space-y-4 mx-auto overflow-x-hidden transition-[max-width] duration-300',
          wideContent ? 'max-w-6xl' : 'max-w-3xl'
        )}
      >
        {children}
      </main>

      {/* Floating Dock — wide horizontal capsule */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 mb-safe-bottom w-full max-w-[440px] px-4">
        <div className="flex items-center gap-1 p-1 rounded-full bg-card/95 backdrop-blur-xl shadow-md border border-border/60">
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
          'text-[12px] font-semibold tracking-tight whitespace-nowrap transition-colors',
          active ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'
        )}
      >
        {label}
      </span>
    </button>
  );
};
