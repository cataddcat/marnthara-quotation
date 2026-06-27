import { useAppStore } from '@/store/useAppStore';
import { useCatalogStore } from '@/store/standalone/useCatalogStore';

/**
 * cost map สินค้าที่ "ใช้งานจริง" — หลักการ **คลังทับเมื่อมี · ของฉันเติมเมื่อคลังไม่มี · ออฟไลน์ใช้ของฉัน**
 * (HANDOFF §11.9). ออนไลน์ (status==='ready') merge ต่อ key: catalog (DB) ทับ vault; ออฟไลน์ = vault ล้วน.
 * `readOnly` = true เมื่อเชื่อม DB จริง → catalog list ในคลังวัสดุยังคงอ่านอย่างเดียว (drafts แก้ในโซนของตัวเอง).
 *
 * ตรรกะ merge เดียวกับ CostEngine — ให้คลังวัสดุ/สรุปวัสดุ แสดงทุนตรงกับที่ใช้คำนวณจริง.
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
    fabricCosts: ready ? { ...sFabric, ...cFabric } : sFabric,
    wallpaperCosts: ready ? { ...sWallpaper, ...cWallpaper } : sWallpaper,
    areaCosts: ready ? { ...sArea, ...cArea } : sArea,
    hardwareCosts: ready ? { ...sHardware, ...cHardware } : sHardware,
  };
};
