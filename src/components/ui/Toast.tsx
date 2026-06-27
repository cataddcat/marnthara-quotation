import React from 'react';
import { createPortal } from 'react-dom';
import { useNotificationStore, ToastMessage } from '@/store/standalone/useNotificationStore';
import { Check, AlertCircle, Info, AlertTriangle } from 'lucide-react'; // [FIXED] Removed X
import { Transition } from '@headlessui/react';
import { cn } from '@/lib/utils';

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void }> = ({
  toast,
  onDismiss,
}) => {
  // [UI] ใช้สี Icon ที่สว่างขึ้นเพื่อให้ตัดกับพื้นหลังสีดำ
  const icons = {
    success: (
      <div className="bg-success rounded-full p-1">
        <Check className="w-3 h-3 text-white" strokeWidth={4} />
      </div>
    ),
    error: <AlertCircle className="w-5 h-5 text-destructive" />,
    warning: <AlertTriangle className="w-5 h-5 text-warning" />,
    info: <Info className="w-5 h-5 text-info" />,
  };

  return (
    <Transition
      show={true}
      appear={true}
      enter="transform ease-out duration-300 transition"
      enterFrom="translate-y-[-150%] opacity-0 scale-90"
      enterTo="translate-y-0 opacity-100 scale-100"
      leave="transition ease-in duration-200"
      leaveFrom="opacity-100 scale-100"
      leaveTo="opacity-0 scale-95"
    >
      {/* [UI] Capsule Design: Black bg, rounded-full, centered content */}
      <div
        className={cn(
          'pointer-events-auto flex items-center gap-3 px-4 py-3 shadow-lg mb-3 cursor-pointer select-none',
          // [THEME CHANGE] bg-[#1A1A1A]/95 -> bg-primary/95 (Uses theme color) | border-white/10 -> border-primary-foreground/10
          'bg-primary/95 backdrop-blur-md border border-primary-foreground/10', // Dark Glass via Semantic
          'rounded-full min-w-[200px] max-w-[90vw]', // Capsule Shape
          // [THEME CHANGE] text-white -> text-primary-foreground
          'text-primary-foreground'
        )}
        onClick={() => onDismiss(toast.id)}
      >
        <div className="shrink-0 flex items-center">{icons[toast.type]}</div>

        <div className="flex-1 min-w-0 text-center sm:text-left mr-2">
          <p className="text-sm font-semibold leading-snug">{toast.title}</p>
          {toast.message && (
            // [THEME CHANGE] text-white/70 -> text-primary-foreground/70
            <p className="text-[12px] text-primary-foreground/70 mt-0.5 truncate">
              {toast.message}
            </p>
          )}
        </div>
      </div>
    </Transition>
  );
};

export const ToastContainer = () => {
  const toasts = useNotificationStore((state) => state.toasts);
  const removeToast = useNotificationStore((state) => state.removeToast);

  if (toasts.length === 0) return null;

  // [Layout] Center Top Position
  return createPortal(
    <div className="fixed top-safe-top pt-3 left-0 right-0 z-[100] flex flex-col items-center pointer-events-none px-4">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={removeToast} />
      ))}
    </div>,
    document.body
  );
};
