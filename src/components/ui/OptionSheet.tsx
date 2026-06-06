import React, { Fragment, useCallback } from 'react';
import { Check, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHaptic } from '@/hooks/useHaptic';
import { useIsMobile } from '@/hooks/useIsMobile';
import { Dialog, Transition, TransitionChild, DialogPanel, DialogTitle } from '@headlessui/react';

export interface OptionItem<T extends string | number = string> {
  label: string;
  value: T;
  icon?: React.ElementType;
  description?: string;
  disabled?: boolean;
}

interface OptionSheetProps<T extends string | number> {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  options: OptionItem<T>[];
  value?: T;
  onSelect: (value: T) => void;
  showCloseButton?: boolean;
  showDragIndicator?: boolean;
  maxHeight?: string;
}

export const OptionSheet = <T extends string | number>({
  isOpen,
  onClose,
  title,
  options,
  value,
  onSelect,
  showCloseButton = true,
  showDragIndicator = true,
  maxHeight = '85vh',
}: OptionSheetProps<T>) => {
  const { trigger } = useHaptic();
  const isMobile = useIsMobile();

  const handleSelect = useCallback(
    (val: T) => {
      // 1. สั่นตอบสนอง (Safe Trigger)
      trigger('selection');

      // 2. ส่งค่ากลับทันทีถ้าเลือกใหม่
      if (val !== value) {
        onSelect(val);
      }

      // 3. ปิด Sheet (หน่วงเวลานิดนึงให้ user เห็นว่าเลือกแล้ว)
      setTimeout(() => {
        onClose();
      }, 120);
    },
    [trigger, value, onSelect, onClose]
  );

  const handleClose = useCallback(() => {
    trigger('light');
    onClose();
  }, [trigger, onClose]);

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-50"
        onClose={handleClose}
        aria-labelledby="option-sheet-title"
      >
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
          <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px]" aria-hidden="true" />
        </TransitionChild>

        {/* Panel Container — bottom sheet on mobile, centered dialog on desktop */}
        <div
          className={cn(
            'fixed inset-0 flex justify-center pointer-events-none',
            isMobile ? 'items-end' : 'items-center'
          )}
        >
          <TransitionChild
            as={Fragment}
            enter="transform transition ease-ios duration-300"
            enterFrom={isMobile ? 'translate-y-full opacity-0' : 'opacity-0 scale-95'}
            enterTo={isMobile ? 'translate-y-0 opacity-100' : 'opacity-100 scale-100'}
            leave="transform transition ease-ios duration-200"
            leaveFrom={isMobile ? 'translate-y-0 opacity-100' : 'opacity-100 scale-100'}
            leaveTo={isMobile ? 'translate-y-full opacity-0' : 'opacity-0 scale-95'}
          >
            <DialogPanel
              className={cn(
                'relative w-full bg-card shadow-lg flex flex-col pointer-events-auto',
                isMobile ? 'rounded-t-2xl' : 'rounded-xl max-w-lg my-8'
              )}
              style={{ maxHeight }}
            >
              {/* Drag Indicator & Header */}
              <div className="sticky top-0 z-10 bg-card rounded-t-2xl border-b border-border/50">
                {showDragIndicator && isMobile && (
                  <div className="flex justify-center pt-3 pb-2">
                    <div className="w-12 h-1.5 rounded-full bg-muted-foreground/30" />
                  </div>
                )}

                <div className="px-5 pb-4 pt-1 flex items-center justify-between">
                  <DialogTitle
                    id="option-sheet-title"
                    className="text-lg font-bold text-foreground"
                  >
                    {title}
                  </DialogTitle>

                  {showCloseButton && (
                    <button
                      onClick={handleClose}
                      className="p-2 -mr-2 rounded-lg hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label="Close"
                    >
                      <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                  )}
                </div>
              </div>

              {/* Options List */}
              <div className="overflow-y-auto overscroll-contain px-4 pb-safe-bottom">
                <div className="py-1 space-y-2">
                  {options.map((option) => {
                    const isSelected = value === option.value;
                    const Icon = option.icon;
                    const isDisabled = option.disabled;

                    return (
                      <button
                        key={String(option.value)}
                        type="button"
                        onClick={() => !isDisabled && handleSelect(option.value)}
                        disabled={isDisabled}
                        className={cn(
                          'w-full flex items-center gap-3 p-4 rounded-xl transition-all duration-200',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card',
                          isSelected
                            ? 'bg-accent border border-border'
                            : 'bg-background border border-border hover:bg-muted/80',
                          isDisabled && 'opacity-50 cursor-not-allowed hover:bg-background'
                        )}
                        aria-current={isSelected ? 'true' : 'false'}
                        aria-disabled={isDisabled}
                      >
                        {/* Icon */}
                        {Icon && (
                          <div
                            className={cn(
                              'w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors',
                              isSelected
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground',
                              isDisabled && 'opacity-50'
                            )}
                          >
                            <Icon className="w-5 h-5" />
                          </div>
                        )}

                        {/* Content */}
                        <div className="flex-1 min-w-0 text-left">
                          <div
                            className={cn(
                              'font-semibold text-base truncate text-foreground',
                              isDisabled && 'text-muted-foreground'
                            )}
                          >
                            {option.label}
                          </div>

                          {option.description && (
                            <div
                              className={cn(
                                'text-sm text-muted-foreground mt-0.5 truncate',
                                isDisabled && 'opacity-70'
                              )}
                            >
                              {option.description}
                            </div>
                          )}
                        </div>

                        {/* Selection Indicator */}
                        <div className="flex-shrink-0 ml-2">
                          {isSelected ? (
                            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center animate-in zoom-in-50 duration-200">
                              <Check
                                className="w-3.5 h-3.5 text-primary-foreground"
                                strokeWidth={3}
                                aria-hidden="true"
                              />
                            </div>
                          ) : (
                            <ChevronRight
                              className="w-5 h-5 text-muted-foreground/40"
                              aria-hidden="true"
                            />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Safe Area Bottom Padding */}
                <div className="h-6" />
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
};
