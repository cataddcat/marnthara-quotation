import { useNotificationStore } from '@/store/standalone/useNotificationStore';

interface ConfirmOptions {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
}

export const useConfirm = () => {
  const openAlert = useNotificationStore((state) => state.openAlert);

  const confirm = (options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      openAlert({
        ...options,
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });
  };

  return { confirm };
};
