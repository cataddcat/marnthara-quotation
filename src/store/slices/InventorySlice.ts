import { StateCreator } from 'zustand';
import { AppState } from '../useAppStore';
import { categoryVault } from '@/lib/vault';

// [REFACTOR] Renamed from FavoriteItem to InventoryItem
export interface InventoryItem {
  id: string;
  code: string;
  default_price_per_m: number;
  cost_per_yard?: number; // Legacy support (deprecated)
  note?: string;
}

export type InventoryState = Record<string, InventoryItem[]>;

// [REFACTOR] Renamed to InventorySlice
export interface InventorySlice {
  favorites: InventoryState; // Keeping 'favorites' key for now to support legacy UI

  addFavorite: (category: string, item: Omit<InventoryItem, 'id'>) => void;
  removeFavorite: (category: string, favId: string) => void;
  updateFavorite: (category: string, favId: string, updates: Partial<InventoryItem>) => void;
  importFavorites: (jsonString: string) => boolean;
}

function routeCostToVault(get: () => AppState, category: string, code: string, cost: number): void {
  if (!cost || cost <= 0) return;
  const vault = categoryVault(category);
  if (vault === 'wallpaper') {
    get().updateWallpaperCost(code, cost);
  } else if (vault === 'area') {
    get().updateAreaCost(code, cost);
  } else {
    get().updateFabricCost(code, cost);
  }
}

const generateId = () => Math.random().toString(36).substring(2, 9);

export const createInventorySlice: StateCreator<
  AppState,
  [['zustand/persist', unknown], ['temporal', unknown]],
  [],
  InventorySlice
> = (set, get) => ({
  favorites: {},

  addFavorite: (category, item) => {
    if (item.cost_per_yard && item.cost_per_yard > 0) {
      routeCostToVault(get, category, item.code, item.cost_per_yard);
    }

    const cleanItem = { ...item };
    delete cleanItem.cost_per_yard;

    set((state) => ({
      favorites: {
        ...state.favorites,
        [category]: [...(state.favorites[category] || []), { ...cleanItem, id: generateId() }],
      },
    }));
  },

  removeFavorite: (category, favId) =>
    set((state) => ({
      favorites: {
        ...state.favorites,
        [category]: (state.favorites[category] || []).filter((f) => f.id !== favId),
      },
    })),

  updateFavorite: (category, favId, updates) => {
    if (updates.cost_per_yard && updates.cost_per_yard > 0 && updates.code) {
      routeCostToVault(get, category, updates.code, updates.cost_per_yard);
      delete updates.cost_per_yard;
    }

    set((state) => ({
      favorites: {
        ...state.favorites,
        [category]: (state.favorites[category] || []).map((f) =>
          f.id === favId ? { ...f, ...updates } : f
        ),
      },
    }));
  },

  importFavorites: (jsonString) => {
    try {
      let data;
      const cleanInput = jsonString.trim();
      try {
        data = JSON.parse(cleanInput);
      } catch {
        try {
          const decoded = decodeURIComponent(escape(atob(cleanInput)));
          data = JSON.parse(decoded);
        } catch {
          return false;
        }
      }

      const payload = data.favorites ? data.favorites : data;
      if (typeof payload !== 'object' || payload === null) return false;

      const newFavorites = { ...payload };

      // Route costs to the correct vault per category
      Object.entries(newFavorites).forEach(([category, items]) => {
        if (Array.isArray(items)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          items.forEach((item: any) => {
            if (item.cost_per_yard && item.cost_per_yard > 0) {
              routeCostToVault(get, category, item.code, item.cost_per_yard);
              delete item.cost_per_yard;
            }
          });
        }
      });

      set((state) => ({
        favorites: { ...state.favorites, ...newFavorites },
      }));
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  },
});
