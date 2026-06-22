import { StateCreator } from 'zustand';
import { z } from 'zod';
import { AppState } from '../useAppStore';
import { categoryVault, CATALOG_CATEGORIES } from '@/lib/vault';
import { normalizeCode } from '@/lib/codes';
import { newUuid } from '@/lib/id';
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
  // ── v2 SKU identity (catalog: ผ้า/ราง/ฮาร์ดแวร์ ที่มีหลายยี่ห้อ/รุ่น/สี) ──
  brand?: string;
  model?: string;
  color?: string;
  variant?: string;
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
  // เขียน vault ด้วยรหัส normalize เสมอ (src/lib/codes.ts) — ให้ตรงกับ importCatalog
  // ฝั่งอ่าน (CostEngine) ใช้ vaultLookup ซึ่ง fallback หา key normalize อยู่แล้ว
  const key = normalizeCode(code);
  const vault = categoryVault(category);
  if (vault === 'wallpaper') {
    get().updateWallpaperCost(key, cost);
  } else if (vault === 'area') {
    get().updateAreaCost(key, cost);
  } else if (vault === 'hardware') {
    get().updateHardwareCost(key, cost);
  } else {
    get().updateFabricCost(key, cost);
  }
}

const generateId = () => newUuid();

// payload คลังผ้า: category → รายการที่อย่างน้อยต้องมี code (ฟิลด์อื่นคงไว้แบบ loose)
// — กันไฟล์ผิดรูป (เช่น category เป็น object/ราคาเป็น array) ทำคลัง/UI พังเงียบ ๆ
const FavoritesPayloadSchema = z.record(
  z.string(),
  z.array(
    z.looseObject({
      id: z.string().optional(),
      code: z.string(),
      default_price_per_m: z.number().optional(),
      cost_per_yard: z.number().optional(),
    })
  )
);

export const createInventorySlice: StateCreator<
  AppState,
  [['zustand/persist', unknown], ['temporal', unknown]],
  [],
  InventorySlice
> = (set, get) => ({
  favorites: {},

  // ⚠️ product master (favorites + importCatalog/exportCatalog) = DB-owned (Firestore catalog,
  // HANDOFF §11.8). ไม่ persist/sync แล้ว + ไม่มี UI เรียก — คงเมธอดไว้เพื่อเทสต์/รันไทม์ชั่วคราว.
  // แก้ทุน/SKU จริง = เครื่องมือภายนอกเขียนลง DB. อย่าผูก UI แก้ไขกลับเข้ามา.
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
    // copy ก่อน — ไม่ mutate อาร์กิวเมนต์ของ caller (delete cost_per_yard เดิมเป็น side effect)
    const clean = { ...updates };
    if (clean.cost_per_yard && clean.cost_per_yard > 0 && clean.code) {
      routeCostToVault(get, category, clean.code, clean.cost_per_yard);
      delete clean.cost_per_yard;
    }

    set((state) => ({
      favorites: {
        ...state.favorites,
        [category]: (state.favorites[category] || []).map((f) =>
          f.id === favId ? { ...f, ...clean } : f
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

      // validate รูปร่าง (zod) — ปฏิเสธทั้งไฟล์เมื่อผิด แทนการ spread ของผิดรูปลง state
      const checked = FavoritesPayloadSchema.safeParse(payload);
      if (!checked.success) return false;

      const newFavorites: InventoryState = {};
      Object.entries(checked.data).forEach(([category, items]) => {
        newFavorites[category] = items.map((item) => {
          // Route costs to the correct vault per category
          if (item.cost_per_yard && item.cost_per_yard > 0) {
            routeCostToVault(get, category, item.code, item.cost_per_yard);
          }
          const rest = { ...item };
          delete rest.cost_per_yard;
          // เติม id/ราคา default ให้รายการที่ขาด (ปุ่มแก้/ลบใน UI อ้างด้วย id)
          return {
            default_price_per_m: 0,
            ...rest,
            id: item.id ?? generateId(),
          } as InventoryItem;
        });
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
      const hardwareCosts = { ...state.hardwareCosts };

      for (const e of entries) {
        const code = normalizeCode(e.code);

        // 1) ทุน → vault ตาม category
        if (typeof e.cost === 'number' && e.cost > 0) {
          const vault = categoryVault(e.category);
          if (vault === 'wallpaper') wallpaperCosts[code] = e.cost;
          else if (vault === 'area') areaCosts[code] = e.cost;
          else if (vault === 'hardware') hardwareCosts[code] = e.cost;
          else fabricCosts[code] = e.cost;
        }

        // 2) inventory upsert (by code ภายใน category) + SKU identity (brand/model/color/variant)
        const list = favorites[e.category] ? [...favorites[e.category]] : [];
        const idx = list.findIndex((f) => f.code.toUpperCase() === code);
        const sell = e.sell_price ?? 0;
        const sku = { brand: e.brand, model: e.model, color: e.color, variant: e.variant };
        if (idx >= 0) {
          list[idx] = {
            ...list[idx],
            ...sku,
            default_price_per_m: sell > 0 ? sell : list[idx].default_price_per_m,
            note: e.note ?? list[idx].note,
          };
        } else {
          list.push({ id: generateId(), code, default_price_per_m: sell, note: e.note, ...sku });
        }
        favorites[e.category] = list;
      }

      return { favorites, fabricCosts, wallpaperCosts, areaCosts, hardwareCosts };
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
            : cat.vault === 'hardware'
              ? state.hardwareCosts
              : state.fabricCosts;

      for (const item of items) {
        const cost = costVault[item.code] ?? 0;
        entries.push({
          code: item.code,
          category: cat.id,
          ...(cost > 0 ? { cost } : {}),
          ...(item.default_price_per_m > 0 ? { sell_price: item.default_price_per_m } : {}),
          unit: cat.costUnit,
          ...(item.brand ? { brand: item.brand } : {}),
          ...(item.model ? { model: item.model } : {}),
          ...(item.color ? { color: item.color } : {}),
          ...(item.variant ? { variant: item.variant } : {}),
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
