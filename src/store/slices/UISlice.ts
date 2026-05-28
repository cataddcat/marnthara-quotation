import { StateCreator } from 'zustand';
import { AppState } from '../useAppStore';

// [REFACTOR] Consolidated UI types
export type ModalType =
  | 'item'
  | 'costDashboard'
  | 'customer'
  | 'pdf'
  | 'shopSettings'
  | 'discount'
  | 'data'
  | 'lookbook'
  | 'projectOverview'
  | 'roomDefaults'
  | 'mainMenu'
  | 'productionSettings'
  | 'formulaStudio'
  | 'materialSummary';

interface ModalSnapshot {
  type: ModalType;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props: Record<string, any>;
}

export interface UISlice {
  activeModal: ModalType | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  modalProps: Record<string, any>;
  modalStack: ModalSnapshot[];

  // Actions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  openModal: (type: ModalType, props?: Record<string, any>) => void;
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
  modalProps: {},
  modalStack: [],

  openModal: (type, props = {}) =>
    set((state) => {
      if (state.activeModal && state.activeModal !== type) {
        return {
          modalStack: [...state.modalStack, { type: state.activeModal, props: state.modalProps }],
          activeModal: type,
          modalProps: props,
        };
      }
      return { activeModal: type, modalProps: props };
    }),

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
      return { activeModal: null, modalProps: {} };
    }),

  closeAllModals: () => set({ activeModal: null, modalProps: {}, modalStack: [] }),
});
