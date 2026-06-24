import { useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { categoryVault } from '@/lib/vault';
import { normalizeCode } from '@/lib/codes';

/**
 * ฉาย "ทุน" จากฉบับร่างในเครื่อง (materialDrafts) เข้า runtime cost vault ของแอป (`state.*Costs`).
 * vault = "แหล่งเติมช่องว่าง" ตามหลักการ **คลังทับเมื่อมี · ของฉันเติมเมื่อคลังไม่มี · ออฟไลน์ใช้ของฉัน**:
 *   - ออฟไลน์ (catalog ยังไม่ ready) → CostEngine อ่าน vault ตรง ๆ → ใช้ทุนที่จด.
 *   - ออนไลน์ (ready) → CostEngine merge catalog ทับ vault ต่อ key (HANDOFF §11.9) → DB ชนะเมื่อรหัสซ้ำ,
 *     แต่รหัสที่ DB ไม่มี → ทุนที่จดใน vault เติมเข้าไป (ไม่ถูกทิ้งเงียบ ๆ).
 *
 * ฉายเสมอ (ไม่ early-return ตอน ready) เพราะ vault จำเป็นเป็น fallback per-key ของ merge ฝั่ง engine.
 * vault ไม่ persist (omitTransientState) → ฉายซ้ำทุกครั้งที่โหลด/ฉบับร่างเปลี่ยน (additive overlay).
 * mount ครั้งเดียวที่ราก (App).
 */
export const useMaterialDraftHydration = () => {
  const materialDrafts = useAppStore((s) => s.materialDrafts);

  useEffect(() => {
    const fabric: Record<string, number> = {};
    const wallpaper: Record<string, number> = {};
    const area: Record<string, number> = {};
    const hardware: Record<string, number> = {};

    for (const [category, codes] of Object.entries(materialDrafts)) {
      const vault = categoryVault(category);
      for (const d of Object.values(codes)) {
        if (typeof d.cost !== 'number' || d.cost <= 0) continue;
        const key = normalizeCode(d.code);
        if (vault === 'wallpaper') wallpaper[key] = d.cost;
        else if (vault === 'area') area[key] = d.cost;
        else if (vault === 'hardware') hardware[key] = d.cost;
        else fabric[key] = d.cost;
      }
    }

    const s = useAppStore.getState();
    if (Object.keys(fabric).length) s.batchUpdateFabricCosts(fabric);
    for (const [k, v] of Object.entries(wallpaper)) s.updateWallpaperCost(k, v);
    for (const [k, v] of Object.entries(area)) s.updateAreaCost(k, v);
    for (const [k, v] of Object.entries(hardware)) s.updateHardwareCost(k, v);
  }, [materialDrafts]);
};
