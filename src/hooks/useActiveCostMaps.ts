import { useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useCatalogStore } from '@/store/standalone/useCatalogStore';
import { buildCostContext, type CostContext } from '@/lib/pricing/CostEngine';

/**
 * cost map สินค้าที่ "ใช้งานจริง" — กฎ merge อยู่ที่ `buildCostContext` (จุดเดียว, HANDOFF §11.9)
 * hook นี้แค่ select จาก store ทั้งสองแล้วประกอบเป็น `CostContext` สำหรับ UI + `CostEngine.analyze`.
 * `readOnly` = true เมื่อเชื่อม DB จริง → catalog list ในคลังวัสดุยังคงอ่านอย่างเดียว.
 *
 * memo ตาม refs ของ vault — คืน object เดิมตราบใดที่คลังไม่เปลี่ยน (เดิมสร้าง object ใหม่ทุก render
 * ทำให้ dependency ปลายทาง invalidate ฟรี ๆ)
 */
export const useActiveCostMaps = (): CostContext & { readOnly: boolean } => {
  const status = useCatalogStore((s) => s.status);
  const cFabric = useCatalogStore((s) => s.fabricCosts);
  const cWallpaper = useCatalogStore((s) => s.wallpaperCosts);
  const cArea = useCatalogStore((s) => s.areaCosts);
  const cHardware = useCatalogStore((s) => s.hardwareCosts);

  const sFabric = useAppStore((s) => s.fabricCosts);
  const sWallpaper = useAppStore((s) => s.wallpaperCosts);
  const sArea = useAppStore((s) => s.areaCosts);
  const sHardware = useAppStore((s) => s.hardwareCosts);
  const laborCosts = useAppStore((s) => s.laborCosts);
  const serviceCosts = useAppStore((s) => s.serviceCosts);
  const accessoryCosts = useAppStore((s) => s.accessoryCosts);
  const costInclude = useAppStore((s) => s.costInclude);

  return useMemo(
    () => ({
      readOnly: status === 'ready',
      ...buildCostContext(
        {
          fabricCosts: sFabric,
          wallpaperCosts: sWallpaper,
          areaCosts: sArea,
          hardwareCosts: sHardware,
          laborCosts,
          serviceCosts,
          accessoryCosts,
          costInclude,
        },
        {
          status,
          fabricCosts: cFabric,
          wallpaperCosts: cWallpaper,
          areaCosts: cArea,
          hardwareCosts: cHardware,
        }
      ),
    }),
    [
      status,
      cFabric,
      cWallpaper,
      cArea,
      cHardware,
      sFabric,
      sWallpaper,
      sArea,
      sHardware,
      laborCosts,
      serviceCosts,
      accessoryCosts,
      costInclude,
    ]
  );
};
