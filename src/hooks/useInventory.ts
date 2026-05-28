import { useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { InventoryItem } from '@/store/slices/InventorySlice';
import { FAVORITE_CATEGORIES } from '@/config/enums';

export interface HydratedInventoryItem extends InventoryItem {
  cost_per_yard: number;
}

const EMPTY_ARRAY: InventoryItem[] = [];

const AREA_CATS = new Set<string>([
  FAVORITE_CATEGORIES.WOODEN_BLIND,
  FAVORITE_CATEGORIES.ROLLER_BLIND,
  FAVORITE_CATEGORIES.VERTICAL_BLIND,
  FAVORITE_CATEGORIES.ALUMINUM_BLIND,
  FAVORITE_CATEGORIES.PARTITION,
  FAVORITE_CATEGORIES.PLEATED_SCREEN,
]);

export const useInventory = (category: string) => {
  const favorites = useAppStore((state) => state.favorites[category] || EMPTY_ARRAY);
  const fabricCosts = useAppStore((state) => state.fabricCosts);
  const wallpaperCosts = useAppStore((state) => state.wallpaperCosts);
  const areaCosts = useAppStore((state) => state.areaCosts);

  const addFavorite = useAppStore((state) => state.addFavorite);
  const updateFavorite = useAppStore((state) => state.updateFavorite);
  const removeFavorite = useAppStore((state) => state.removeFavorite);

  const items = useMemo(() => {
    const costVault =
      category === FAVORITE_CATEGORIES.WALLPAPER
        ? wallpaperCosts
        : AREA_CATS.has(category)
          ? areaCosts
          : fabricCosts;
    return favorites.map((item) => ({
      ...item,
      cost_per_yard: costVault[item.code] || 0,
    })) as HydratedInventoryItem[];
  }, [favorites, fabricCosts, wallpaperCosts, areaCosts, category]);

  return {
    items,
    addItem: (item: Omit<InventoryItem, 'id'>) => addFavorite(category, item),
    updateItem: (id: string, updates: Partial<InventoryItem>) =>
      updateFavorite(category, id, updates),
    removeItem: (id: string) => removeFavorite(category, id),
  };
};
