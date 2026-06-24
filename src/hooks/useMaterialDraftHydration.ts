import { useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useCatalogStore } from '@/store/useCatalogStore';
import { categoryVault } from '@/lib/vault';
import { normalizeCode } from '@/lib/codes';

/**
 * ฉาย "ทุน" จากฉบับร่างในเครื่อง (materialDrafts) เข้า runtime cost vault ของแอป
 * เฉพาะตอน "ออฟไลน์" (catalog ยังไม่ ready) — เพราะ CostEngine อ่าน state.fabricCosts/areaCosts/...
 * โดยตรงในโหมดนั้น (HANDOFF §11.8) → กำไร/ทุนคำนวณถูกโดยไม่ต้องแก้ CostEngine.
 *
 * vault ไม่ persist (omitTransientState) → เป็นการฉายซ้ำทุกครั้งที่โหลด/ฉบับร่างเปลี่ยน (additive overlay).
 * เมื่อ catalog === 'ready' จะข้าม — DB เป็นทุนหลักผ่าน path ของ engine เอง (ไม่ override ฉบับร่าง).
 * mount ครั้งเดียวที่ราก (App).
 */
export const useMaterialDraftHydration = () => {
  const ready = useCatalogStore((s) => s.status) === 'ready';
  const materialDrafts = useAppStore((s) => s.materialDrafts);

  useEffect(() => {
    if (ready) return;

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
  }, [ready, materialDrafts]);
};
