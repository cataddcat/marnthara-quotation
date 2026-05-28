import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface UIState {
  // Toasts
  toasts: ToastMessage[];
  addToast: (type: ToastType, title: string, message?: string) => void;
  removeToast: (id: string) => void;

  // Alert Dialog State
  alertConfig: {
    isOpen: boolean;
    title: string;
    description: string;
    variant: 'default' | 'destructive';
    confirmLabel: string;
    cancelLabel: string;
    onConfirm: () => void;
    onCancel: () => void;
  };
  openAlert: (config: Partial<UIState['alertConfig']>) => void;
  closeAlert: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  // --- Toast Logic ---
  toasts: [],
  addToast: (type, title, message) => {
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({
      toasts: [...state.toasts, { id, type, title, message }],
    }));

    // Auto dismiss
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 3000);
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  // --- Alert Dialog Logic ---
  alertConfig: {
    isOpen: false,
    title: '',
    description: '',
    variant: 'default',
    confirmLabel: 'ตกลง',
    cancelLabel: 'ยกเลิก',
    onConfirm: () => {},
    onCancel: () => {},
  },
  openAlert: (config) =>
    set((state) => ({
      alertConfig: { ...state.alertConfig, ...config, isOpen: true },
    })),
  closeAlert: () =>
    set((state) => ({
      alertConfig: { ...state.alertConfig, isOpen: false },
    })),
}));
