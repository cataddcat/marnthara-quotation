import { StateCreator } from 'zustand';
import { AppState } from '../useAppStore';
import { ShopConfig, Discount } from '@/types';
import { DEFAULT_SHOP_CONFIG } from '@/config/constants';

export interface ShopProfileSlice {
  shopConfig: ShopConfig;
  discount: Discount;
  setDiscount: (discount: Discount) => void;
  updateShopConfig: (data: Partial<ShopConfig>) => void;
  updateLogo: (base64: string) => void;
}

export const createShopProfileSlice: StateCreator<
  AppState,
  [['zustand/persist', unknown], ['temporal', unknown]],
  [],
  ShopProfileSlice
> = (set) => ({
  shopConfig: DEFAULT_SHOP_CONFIG,
  discount: { type: 'amount', value: 0, is_enabled: false },
  setDiscount: (discount) => set({ discount }),
  updateShopConfig: (data) =>
    set((state) => ({
      shopConfig: { ...state.shopConfig, ...data },
    })),
  updateLogo: (base64) =>
    set((state) => ({
      shopConfig: { ...state.shopConfig, logoUrl: base64 },
    })),
});
