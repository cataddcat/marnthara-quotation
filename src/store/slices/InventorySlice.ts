import { StateCreator } from 'zustand';
import { AppState } from '../useAppStore';
import { categoryVault, CATALOG_CATEGORIES } from '@/lib/vault';
import {
  CatalogContractSchema,
  CATALOG_CONTRACT_MAGIC,
  CATALOG_CONTRACT_VERSION,
  type CatalogContract,
  type CatalogEntry,
  type CatalogImportResult,
} from '@/lib/catalog/contract';

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

  // ── Catalog Contract (สินค้าวัสดุ จากระบบภายนอก) ──
  /** นำเข้าตาม Marnthara Catalog Contract — upsert inventory ตาม code + route cost เข้า vault */
  importCatalog: (payload: unknown) => CatalogImportResult;
  /** ส่งออก inventory ปัจจุบัน (+ ต้นทุน) เป็น Catalog Contract JSON */
  exportCatalog: () => string;
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

  // ── Catalog Contract ───────────────────────────────────────────────────────

  importCatalog: (payload) => {
    const parsed = CatalogContractSchema.safeParse(payload);
    if (!parsed.success) {
      return {
        ok: false,
        imported: 0,
        skipped: 0,
        errors: parsed.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`),
      };
    }

    const { entries } = parsed.data;

    // Atomic: upsert inventory (merge-by-code กันซ้ำตอน re-import) + route cost เข้า vault — set ครั้งเดียว
    set((state) => {
      const favorites = { ...state.favorites };
      const fabricCosts = { ...state.fabricCosts };
      const wallpaperCosts = { ...state.wallpaperCosts };
      const areaCosts = { ...state.areaCosts };

      for (const e of entries) {
        const code = e.code.trim().toUpperCase();

        // 1) ทุน → vault ตาม category
        if (typeof e.cost === 'number' && e.cost > 0) {
          const vault = categoryVault(e.category);
          if (vault === 'wallpaper') wallpaperCosts[code] = e.cost;
          else if (vault === 'area') areaCosts[code] = e.cost;
          else fabricCosts[code] = e.cost;
        }

        // 2) inventory upsert (by code ภายใน category)
        const list = favorites[e.category] ? [...favorites[e.category]] : [];
        const idx = list.findIndex((f) => f.code.toUpperCase() === code);
        const sell = e.sell_price ?? 0;
        if (idx >= 0) {
          list[idx] = {
            ...list[idx],
            default_price_per_m: sell > 0 ? sell : list[idx].default_price_per_m,
            note: e.note ?? list[idx].note,
          };
        } else {
          list.push({ id: generateId(), code, default_price_per_m: sell, note: e.note });
        }
        favorites[e.category] = list;
      }

      return { favorites, fabricCosts, wallpaperCosts, areaCosts };
    });

    return { ok: true, imported: entries.length, skipped: 0, errors: [] };
  },

  exportCatalog: () => {
    const state = get();
    const entries: CatalogEntry[] = [];

    for (const cat of CATALOG_CATEGORIES) {
      const items = state.favorites[cat.id] || [];
      const costVault =
        cat.vault === 'wallpaper'
          ? state.wallpaperCosts
          : cat.vault === 'area'
            ? state.areaCosts
            : state.fabricCosts;

      for (const item of items) {
        const cost = costVault[item.code] ?? 0;
        entries.push({
          code: item.code,
          category: cat.id,
          ...(cost > 0 ? { cost } : {}),
          ...(item.default_price_per_m > 0 ? { sell_price: item.default_price_per_m } : {}),
          unit: cat.costUnit,
          ...(item.note ? { note: item.note } : {}),
        });
      }
    }

    const contract: CatalogContract = {
      contract: CATALOG_CONTRACT_MAGIC,
      version: CATALOG_CONTRACT_VERSION,
      generated_at: new Date().toISOString(),
      source: 'marnthara-app',
      entries,
    };
    return JSON.stringify(contract, null, 2);
  },
});
