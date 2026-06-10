import { useMemo } from 'react';
import { ItemData } from '@/types';
import { CostEngine, CostBreakdown } from '@/lib/pricing/CostEngine';
import { useAppStore } from '@/store/useAppStore';

/**
 * วิเคราะห์ต้นทุน/กำไรของ "ทุกประเภทสินค้า" (generalize จาก useSmartPrice ที่ผูกกับผ้าม่าน)
 * คืน CostBreakdown (status profit|warning|loss|unknown) ให้ summary card เอาไปแสดงไฟจราจร
 *
 * CostEngine.analyze() อ่านคลังต้นทุนผ่าน useAppStore.getState() เอง — costs ที่ select มาเป็น
 * cache-invalidation hint (เหมือน ProModeControl) ให้ recalc เมื่อค่าต้นทุนหลังบ้านเปลี่ยน
 */
export const useCostStatus = (item: ItemData | null): CostBreakdown | null => {
  const fabricCosts = useAppStore((s) => s.fabricCosts);
  const wallpaperCosts = useAppStore((s) => s.wallpaperCosts);
  const areaCosts = useAppStore((s) => s.areaCosts);
  const accessoryCosts = useAppStore((s) => s.accessoryCosts);
  const hardwareCosts = useAppStore((s) => s.hardwareCosts); // ทุนราง SKU — CostEngine ใช้ (กัน stale)
  const laborCosts = useAppStore((s) => s.laborCosts);
  const serviceCosts = useAppStore((s) => s.serviceCosts);

  return useMemo(
    () => (item ? CostEngine.analyze(item) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [item, fabricCosts, wallpaperCosts, areaCosts, accessoryCosts, hardwareCosts, laborCosts, serviceCosts]
  );
};
