import React, { Fragment, useMemo, useState } from 'react';
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Description,
  Transition,
  TransitionChild,
} from '@headlessui/react';
import { Drawer } from 'vaul';
import { X, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { useMobileBack } from '@/hooks/useMobileBack';
import { useExperienceMode } from '@/hooks/useExperienceMode';

export type ModalVariant = 'center' | 'fullscreen' | 'drawer';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  headerAction?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
  variant?: ModalVariant;
  description?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  headerAction,
  maxWidth = 'lg',
  variant = 'center',
  description,
}) => {
  useMobileBack(isOpen, onClose);
  // Tier มาจาก single source (device + persisted override) — เคารพ override ของผู้ใช้
  // แทนการอ่านความกว้างจอตรง ๆ (เดิม useIsMobile) ตาม HANDOFF §10
  const { isLite } = useExperienceMode();

  // หัวเรื่องแบบ "รับรู้การเลื่อน" (Geist §1.7 borders-over-shadows): หัวเรื่องแบนสนิทเมื่ออยู่บนสุด
  // และมีเส้นคั่นโผล่ขึ้นเมื่อเนื้อหาเลื่อน → บอกผู้ใช้ว่ายังมีต่อด้านบน (ใช้กับทุก modal ผ่าน chrome กลาง)
  const [scrolled, setScrolled] = useState(false);
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const next = e.currentTarget.scrollTop > 4;
    setScrolled((prev) => (prev === next ? prev : next));
  };

  // 🧠 Smart Adaptive Logic:
  // Full tier (เดสก์ท็อป หรือ override=full บนมือถือ) → เปลี่ยน Fullscreen/Drawer เป็น Center ให้หมด
  const effectiveVariant = useMemo(() => {
    if (!isLite && (variant === 'fullscreen' || variant === 'drawer')) {
      return 'center';
    }
    return variant;
  }, [isLite, variant]);

  // --- 1. DRAWER (Mobile Bottom Sheet) ---
  if (effectiveVariant === 'drawer') {
    return (
      <Drawer.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-50" />
          <Drawer.Content className="bg-card flex flex-col rounded-t-[20px] h-[96%] mt-24 fixed bottom-0 left-0 right-0 z-[51] outline-none max-w-md mx-auto">
            {/* Handle Bar + Header */}
            <div
              className={cn(
                'bg-card rounded-t-[20px] shrink-0 border-b transition-colors',
                scrolled ? 'border-border/50' : 'border-transparent'
              )}
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-12 h-1.5 rounded-full bg-muted" />
              </div>
              {/* แถวหัวเรื่อง — title/description กึ่งกลาง + (headerAction) + ปุ่มปิดที่มองเห็น
                  NN/g: ปิดได้ชัดเจนไม่ต้องเดาว่าปัดลง · description ผูก aria ผ่าน Drawer.Description */}
              <div className="relative flex flex-col items-center justify-center px-12 pb-3 pt-1">
                <Drawer.Title className="max-w-full text-base font-bold text-center text-foreground truncate">
                  {title}
                </Drawer.Title>
                {description && (
                  <Drawer.Description className="max-w-full text-xs text-muted-foreground text-center mt-0.5 truncate">
                    {description}
                  </Drawer.Description>
                )}
                <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-1">
                  {headerAction}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    aria-label="ปิด"
                    className="h-11 w-11 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4" onScroll={handleScroll}>
              {children}
            </div>
            {footer && (
              <div className="p-4 border-t border-border mt-auto pb-safe-bottom bg-card">
                {footer}
              </div>
            )}
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    );
  }

  // --- 2. DIALOG (Center & Fullscreen) ---
  const maxWidthClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
  }[maxWidth];

  const isFullscreen = effectiveVariant === 'fullscreen';

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
        {/* Backdrop */}
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </TransitionChild>

        <div className="fixed inset-0 overflow-y-auto">
          <div
            className={cn(
              'flex min-h-full items-center justify-center p-0 text-center',
              !isFullscreen && 'sm:p-4' // ถ้าไม่ใช่ Fullscreen ให้มี padding รอบๆ บนจอใหญ่
            )}
          >
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95 translate-y-4 sm:translate-y-0"
              enterTo="opacity-100 scale-100 translate-y-0"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100 translate-y-0"
              leaveTo="opacity-0 scale-95 translate-y-4 sm:translate-y-0"
            >
              <DialogPanel
                className={cn(
                  'relative transform overflow-hidden bg-card text-left align-middle shadow-2xl transition-all flex flex-col',
                  // 📱 Mobile Fullscreen Logic
                  isFullscreen
                    ? 'w-full h-[100dvh] rounded-none'
                    : `w-full ${maxWidthClass} rounded-xl my-4 border border-border/50 max-h-[90vh]` // 🖥️ Desktop Card Logic
                )}
              >
                {/* Header — title 16px; ปุ่มมี hit area 44px (HIG) padding กระชับให้หัวเรื่องไม่สูงเกิน */}
                <div
                  className={cn(
                    'flex items-center justify-between gap-2 px-4 py-2.5 border-b shrink-0 bg-card/95 backdrop-blur z-10 transition-colors',
                    scrolled ? 'border-border' : 'border-transparent',
                    isFullscreen && 'pt-safe-top' // Safe Area for notch
                  )}
                >
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    {/* ปุ่ม Back สำหรับ Fullscreen (Lite tier) — hit area ≥44px + hover/active/focus-visible */}
                    {isFullscreen && isLite && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        aria-label="ย้อนกลับ"
                        className="-ml-2 h-11 w-11 shrink-0 rounded-full text-foreground"
                      >
                        <ChevronLeft className="h-6 w-6" />
                      </Button>
                    )}
                    <div className="min-w-0">
                      <DialogTitle
                        as="h3"
                        className="text-base font-bold leading-tight text-foreground truncate"
                      >
                        {title}
                      </DialogTitle>
                      {description && (
                        <Description
                          as="p"
                          className="text-xs text-muted-foreground mt-0.5 truncate"
                        >
                          {description}
                        </Description>
                      )}
                    </div>
                  </div>

                  {headerAction && <div className="flex items-center shrink-0">{headerAction}</div>}

                  {/* ปุ่ม X — แสดงเมื่อไม่ใช่ Fullscreen แบบ Lite (กรณีนั้นใช้ปุ่ม Back แทน) */}
                  {(!isFullscreen || !isLite) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onClose}
                      aria-label="ปิด"
                      className="h-11 w-11 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  )}
                </div>

                {/* Content Container - Scrollable — padding กระชับ (p-4) สม่ำเสมอกับ ItemCard */}
                <div
                  className="flex-1 overflow-y-auto overscroll-contain bg-background/50 p-4"
                  onScroll={handleScroll}
                >
                  {/* min-h-full when fullscreen lets children use flex-col + flex-1 spacer tricks */}
                  <div className={cn('mx-auto w-full', isFullscreen && 'min-h-full')}>
                    {children}
                  </div>
                </div>

                {/* Footer (Fixed at bottom logic) */}
                {footer && (
                  <div
                    className={cn(
                      'shrink-0 px-4 py-3 border-t border-border bg-background z-20',
                      isFullscreen && 'pb-safe-bottom'
                    )}
                  >
                    {footer}
                  </div>
                )}
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};
