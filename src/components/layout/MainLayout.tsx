import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useCalculations } from '@/hooks/useCalculations';
import { useHaptic } from '@/hooks/useHaptic';
import { Menu, LayoutDashboard, ChevronRight, Layers } from 'lucide-react';
import { fmtTH } from '@/utils/formatters';
import { cn } from '@/lib/utils';
import { SmartNavigator } from '@/components/features/SmartNavigator';

interface MainLayoutProps {
  children: React.ReactNode;
  onOpenMainMenu?: () => void;
  onOpenDiscount?: () => void;
  onOpenOverview?: () => void;
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
  activeRoomId,
  onNavigateRoom,
  viewMode,
  onSetViewMode,
}) => {
  const shopConfig = useAppStore((state) => state.shopConfig);
  const discount = useAppStore((state) => state.discount);

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
                <h1 className="text-lg font-bold tracking-tight text-foreground group-hover:text-primary transition-colors truncate max-w-[150px] sm:max-w-[220px]">
                  {shopConfig.name || 'Marnthara'}
                </h1>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-primary/50 transition-colors shrink-0" />
              </div>
              <span className="text-[11px] font-medium text-muted-foreground tracking-widest uppercase">
                Quotation
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
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Net
                </span>
              </div>
              <div
                className={cn(
                  'text-sm tabular-nums font-bold leading-none transition-colors',
                  hasDiscount || hasVat ? 'text-primary' : 'text-emerald-600 dark:text-emerald-400'
                )}
              >
                {fmtTH(finalTotal)}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="pt-[calc(3.5rem+env(safe-area-inset-top))] pb-[calc(5rem+env(safe-area-inset-bottom))] px-4 sm:px-6 space-y-4 max-w-3xl mx-auto overflow-x-hidden">
        {children}
      </main>

      {/* Floating Dock — wide horizontal capsule */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 mb-safe-bottom w-full max-w-[360px] px-4">
        <div className="flex items-center gap-1 p-1 rounded-full bg-card/95 backdrop-blur-xl shadow-lg border border-border/60">
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
        viewMode={viewMode}
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
}: {
  icon: React.ElementType;
  label: string;
  onClick?: () => void;
  hapticType?: 'light' | 'medium' | 'selection';
}) => {
  const { trigger } = useHaptic();

  return (
    <button
      onClick={() => {
        trigger(hapticType);
        onClick?.();
      }}
      aria-label={label}
      className="group flex flex-1 items-center justify-center gap-2 h-11 px-3 rounded-full transition-all duration-200 active:scale-[0.94] hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-inset"
    >
      <Icon
        className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors"
        strokeWidth={2}
      />
      <span className="text-[13px] font-semibold text-muted-foreground group-hover:text-primary tracking-tight">
        {label}
      </span>
    </button>
  );
};
