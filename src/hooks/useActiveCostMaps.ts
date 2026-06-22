import { useAppStore } from '@/store/useAppStore';
import { useCatalogStore } from '@/store/useCatalogStore';

/**
 * cost map สินค้าที่ "ใช้งานจริง" — catalog (DB ภายนอก) เมื่อเชื่อมจริง (status==='ready'),
 * ไม่งั้น fallback vault ในแอป. `readOnly` = true เมื่อมาจาก DB → UI ควรซ่อนการแก้ทุน.
 *
 * ตรรกะเดียวกับ CostEngine (HANDOFF §11.8) — ให้คลังวัสดุ/สรุปวัสดุ แสดงทุนตรงกับที่ใช้คำนวณจริง
 */
export const useActiveCostMaps = () => {
  const ready = useCatalogStore((s) => s.status) === 'ready';

  const cFabric = useCatalogStore((s) => s.fabricCosts);
  const cWallpaper = useCatalogStore((s) => s.wallpaperCosts);
  const cArea = useCatalogStore((s) => s.areaCosts);
  const cHardware = useCatalogStore((s) => s.hardwareCosts);

  const sFabric = useAppStore((s) => s.fabricCosts);
  const sWallpaper = useAppStore((s) => s.wallpaperCosts);
  const sArea = useAppStore((s) => s.areaCosts);
  const sHardware = useAppStore((s) => s.hardwareCosts);

  return {
    readOnly: ready,
    fabricCosts: ready ? cFabric : sFabric,
    wallpaperCosts: ready ? cWallpaper : sWallpaper,
    areaCosts: ready ? cArea : sArea,
    hardwareCosts: ready ? cHardware : sHardware,
  };
};
