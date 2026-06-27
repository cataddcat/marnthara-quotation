import { Fragment } from 'react';
import { Dialog, Transition, TransitionChild, DialogPanel, DialogTitle } from '@headlessui/react';
import { useNotificationStore } from '@/store/standalone/useNotificationStore';
import { Button } from '@/components/ui/Button';
import { AlertTriangle } from 'lucide-react';
import { useMobileBack } from '@/hooks/useMobileBack';

export const AlertDialog = () => {
  const { isOpen, title, description, variant, confirmLabel, cancelLabel, onConfirm, onCancel } =
    useNotificationStore((state) => state.alertConfig);
  const closeAlert = useNotificationStore((state) => state.closeAlert);

  const handleClose = (isConfirm: boolean) => {
    closeAlert();
    if (isConfirm) {
      onConfirm();
    } else {
      onCancel();
    }
  };

  // ปุ่ม Back มือถือ = ยกเลิก (ปิด confirm บนสุด ไม่ใช่เลเยอร์ที่อยู่ข้างหลัง)
  useMobileBack(isOpen, () => handleClose(false));

  return (
    <Transition show={isOpen} as={Fragment}>
      {/* [CRITICAL] z-[110] to be higher than Toast (100) and other Modals (50) */}
      <Dialog onClose={() => handleClose(false)} className="relative z-[110]">
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px]" />
        </TransitionChild>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <TransitionChild
              as={Fragment}
              enter="ease-ios duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className="w-full max-w-sm transform overflow-hidden rounded-xl border border-border bg-card p-6 text-left align-middle shadow-lg transition-all">
                <div className="flex items-center gap-4 mb-4">
                  {variant === 'destructive' && (
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-destructive" strokeWidth={1.5} />
                    </div>
                  )}
                  <div>
                    <DialogTitle as="h3" className="text-lg font-bold leading-6 text-foreground">
                      {title}
                    </DialogTitle>
                  </div>
                </div>

                <div className="mt-2">
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>

                <div className="mt-6 flex gap-3 justify-end">
                  <Button variant="outline" onClick={() => handleClose(false)}>
                    {cancelLabel}
                  </Button>
                  <Button
                    variant={variant === 'destructive' ? 'destructive' : 'primary'}
                    onClick={() => handleClose(true)}
                  >
                    {confirmLabel}
                  </Button>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};
