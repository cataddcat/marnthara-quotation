import { useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useCatalogStore } from '@/store/standalone/useCatalogStore';
import { InventoryItem } from '@/store/slices/InventorySlice';
import { categoryVault } from '@/lib/vault';

export interface HydratedInventoryItem extends InventoryItem {
  cost_per_yard: number;
  /** provenance — มีเฉพาะโหมด catalog (DB ภายนอก) */
  supplier?: string;
  captured_at?: string;
}

const EMPTY_ARRAY: InventoryItem[] = [];

/**
 * รายการ SKU + ทุน ต่อหมวด (สำหรับตัวเลือกรหัสในฟอร์ม + คลังวัสดุ)
 *
 * product master ย้ายไป DB ภายนอกแล้ว (useCatalogStore, HANDOFF §11.8):
 * - catalog เชื่อมจริง (status==='ready') → อ่าน SKU/ทุน จาก catalog แบบ READ-ONLY (readOnly=true)
 * - ไม่งั้น (local-only / ยังไม่เชื่อม DB) → fallback favorites + vault ใน store (แก้ไขได้)
 */
export const useInventory = (category: string) => {
  const catalogStatus = useCatalogStore((s) => s.status);
  const catalogEntries = useCatalogStore((s) => s.entries);

  // fallback source (local-only) — favorites/vault ไม่ persist แล้ว แต่ยังใช้รันไทม์ได้
  const favorites = useAppStore((state) => state.favorites[category] || EMPTY_ARRAY);
  const fabricCosts = useAppStore((state) => state.fabricCosts);
  const wallpaperCosts = useAppStore((state) => state.wallpaperCosts);
  const areaCosts = useAppStore((state) => state.areaCosts);
  const hardwareCosts = useAppStore((state) => state.hardwareCosts);

  const useCatalog = catalogStatus === 'ready';

  const items = useMemo(() => {
    if (useCatalog) {
      // DB-owned: SKU list จาก catalog (กรองตามหมวด) — id = code (unique ต่อหมวดตาม contract)
      return catalogEntries
        .filter((e) => e.category === category)
        .map(
          (e) =>
            ({
              id: e.code,
              code: e.code,
              default_price_per_m: e.sell_price ?? 0,
              note: e.note,
              brand: e.brand,
              model: e.model,
              color: e.color,
              variant: e.variant,
              cost_per_yard: e.cost ?? 0,
              supplier: e.supplier,
              captured_at: e.captured_at,
            }) as HydratedInventoryItem
        );
    }
    const vault = categoryVault(category);
    const costVault =
      vault === 'wallpaper'
        ? wallpaperCosts
        : vault === 'area'
          ? areaCosts
          : vault === 'hardware'
            ? hardwareCosts
            : fabricCosts;
    return favorites.map((item) => ({
      ...item,
      cost_per_yard: costVault[item.code] || 0,
    })) as HydratedInventoryItem[];
  }, [
    useCatalog,
    catalogEntries,
    favorites,
    fabricCosts,
    wallpaperCosts,
    areaCosts,
    hardwareCosts,
    category,
  ]);

  // READ-ONLY — product master = DB-owned (HANDOFF §11.8). แก้ทุน/SKU ที่เครื่องมือภายนอก ไม่ใช่ในแอป
  return {
    items,
    /** true = product master มาจาก DB (catalog เชื่อมจริง) */
    readOnly: useCatalog,
  };
};
