import { StateCreator } from 'zustand';
import type { ItemData } from '@/types';
import type { ItemTypeKey } from '@/config/enums';
import { AppState } from '../useAppStore';

// ─────────────────────────────────────────────────────────────────────────────
// ModalPropsMap — กำหนด shape ของ props สำหรับแต่ละ modal type
// undefined = modal นั้นไม่รับ props ผ่าน store (อาจส่ง callbacks ผ่าน React JSX แทน)
// ─────────────────────────────────────────────────────────────────────────────
export type ModalPropsMap = {
  item: {
    roomId?: string;
    itemId?: string;
    itemType?: ItemTypeKey;
    initialData?: Partial<ItemData>;
    mode?: 'add' | 'edit';
  };
  roomDefaults: {
    roomId: string | null;
  };
  materialSummary: {
    initialTab?: string;
    initialCategory?: string;
  };
  projectOverview: {
    onNavigateToRoom?: (roomId: string) => void;
  };

  // Modals ที่ไม่รับ props ผ่าน store
  costDashboard: undefined;
  customer: undefined;
  pdf: undefined;
  shopSettings: undefined;
  discount: undefined;
  data: undefined;
  lookbook: undefined;
  mainMenu: undefined;
  productionSettings: undefined;
  formulaStudio: undefined;
};

export type ModalType = keyof ModalPropsMap;

// Discriminated union ของ snapshot — TypeScript narrow ได้จาก field `type`
export type ModalSnapshot = {
  [K in ModalType]: ModalPropsMap[K] extends undefined
    ? { type: K; props?: undefined }
    : { type: K; props: ModalPropsMap[K] };
}[ModalType];

// openModal signature: ถ้า modal มี props ในแผนที่ ต้องส่ง props; ถ้าไม่มี ห้ามส่ง
type OpenModalArgs<K extends ModalType> = ModalPropsMap[K] extends undefined
  ? [type: K]
  : [type: K, props: ModalPropsMap[K]];

export type OpenModalFn = <K extends ModalType>(...args: OpenModalArgs<K>) => void;

// Helper สำหรับ ModalManager: narrow modalProps ตาม activeModal
export const modalPropsAs = <K extends ModalType>(
  activeModal: ModalType | null,
  modalProps: ModalPropsMap[ModalType] | undefined,
  type: K
): ModalPropsMap[K] | undefined =>
  activeModal === type ? (modalProps as ModalPropsMap[K]) : undefined;

export interface UISlice {
  activeModal: ModalType | null;
  modalProps: ModalPropsMap[ModalType] | undefined;
  modalStack: ModalSnapshot[];

  openModal: OpenModalFn;
  closeModal: () => void;
  closeAllModals: () => void;
}

export const createUISlice: StateCreator<
  AppState,
  [['zustand/persist', unknown], ['temporal', unknown]],
  [],
  UISlice
> = (set) => ({
  activeModal: null,
  modalProps: undefined,
  modalStack: [],

  openModal: ((type, props) =>
    set((state) => {
      // snapshot ของ modal ปัจจุบัน — cast เพราะ TypeScript ไม่ narrow runtime tuple ได้
      const snapshot = {
        type: state.activeModal,
        props: state.modalProps,
      } as ModalSnapshot;

      if (state.activeModal && state.activeModal !== type) {
        return {
          modalStack: [...state.modalStack, snapshot],
          activeModal: type,
          modalProps: props,
        };
      }
      return { activeModal: type, modalProps: props };
    })) as OpenModalFn,

  closeModal: () =>
    set((state) => {
      if (state.modalStack.length > 0) {
        const prev = state.modalStack[state.modalStack.length - 1];
        const newStack = state.modalStack.slice(0, -1);
        return {
          activeModal: prev.type,
          modalProps: prev.props,
          modalStack: newStack,
        };
      }
      return { activeModal: null, modalProps: undefined };
    }),

  closeAllModals: () =>
    set({ activeModal: null, modalProps: undefined, modalStack: [] }),
});
