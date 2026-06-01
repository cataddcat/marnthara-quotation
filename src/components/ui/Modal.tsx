import React, { Fragment, useMemo } from 'react';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { Drawer } from 'vaul';
import { X, ChevronLeft } from 'lucide-react'; // เพิ่ม ChevronLeft
import { cn } from '@/lib/utils';
import { useMobileBack } from '@/hooks/useMobileBack';
import { useIsMobile } from '@/hooks/useIsMobile'; // ✅ ต้องมี hook นี้

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
  const isMobile = useIsMobile();

  // 🧠 Smart Adaptive Logic:
  // ถ้าไม่ใช่ Mobile ให้เปลี่ยน Fullscreen/Drawer เป็น Center ให้หมด (เพื่อความสวยงามบนจอใหญ่)
  const effectiveVariant = useMemo(() => {
    if (!isMobile && (variant === 'fullscreen' || variant === 'drawer')) {
      return 'center';
    }
    return variant;
  }, [isMobile, variant]);

  // --- 1. DRAWER (Mobile Bottom Sheet) ---
  if (effectiveVariant === 'drawer') {
    return (
      <Drawer.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-[50]" />
          <Drawer.Content className="bg-card flex flex-col rounded-t-[20px] h-[96%] mt-24 fixed bottom-0 left-0 right-0 z-[51] outline-none max-w-md mx-auto">
             {/* Handle Bar */}
            <div className="p-4 bg-card rounded-t-[20px] shrink-0 border-b border-border/50">
              <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-muted mb-4" />
              <Drawer.Title className="text-lg font-bold text-center">{title}</Drawer.Title>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {children}
            </div>
            {footer && (
              <div className="p-4 border-t border-border mt-auto pb-safe-area bg-card">
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
          <div className={cn(
            "flex min-h-full items-center justify-center p-0 text-center",
            !isFullscreen && "sm:p-4" // ถ้าไม่ใช่ Fullscreen ให้มี padding รอบๆ บนจอใหญ่
          )}>
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
                    : `w-full ${maxWidthClass} rounded-2xl my-4 border border-border/50 max-h-[90vh]` // 🖥️ Desktop Card Logic
                )}
              >
                {/* Header */}
                <div className={cn(
                  "flex items-center justify-between px-4 py-3 border-b border-border/50 shrink-0 bg-background/80 backdrop-blur z-10",
                  isFullscreen && "pt-safe-top" // Safe Area for notch
                )}>
                  <div className="flex items-center gap-2 flex-1">
                    {/* ปุ่ม Back สำหรับ Fullscreen Mobile */}
                    {isFullscreen && isMobile && (
                      <button onClick={onClose} aria-label="ย้อนกลับ" className="-ml-2 p-2 mr-1">
                        <ChevronLeft className="w-6 h-6 text-primary" />
                      </button>
                    )}
                    <div>
                      <DialogTitle as="h3" className="text-lg font-bold leading-6 text-foreground">
                        {title}
                      </DialogTitle>
                      {description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                      )}
                    </div>
                  </div>

                  {headerAction && (
                    <div className="flex items-center mr-1">
                      {headerAction}
                    </div>
                  )}

                  {/* ปุ่ม X (แสดงเสมอถ้าไม่ใช่ Mobile Fullscreen หรือถ้าต้องการปุ่มปิดขวาบน) */}
                  {(!isFullscreen || !isMobile) && (
                    <button
                      onClick={onClose}
                      aria-label="ปิด"
                      className="p-2 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors active:scale-95 outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>

                {/* Content Container - Scrollable */}
                <div className={cn(
                  'flex-1 overflow-y-auto overscroll-contain bg-background/50',
                  isFullscreen ? 'p-4' : 'p-6'
                )}>
                  {/* min-h-full when fullscreen lets children use flex-col + flex-1 spacer tricks */}
                  <div className={cn("mx-auto w-full", isFullscreen && "min-h-full")}>
                     {children}
                  </div>
                </div>

                {/* Footer (Fixed at bottom logic) */}
                {footer && (
                  <div className={cn(
                    'shrink-0 px-4 py-3 border-t border-border bg-background z-20',
                    isFullscreen && 'pb-safe-bottom'
                  )}>
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