import { useMemo } from 'react';
import { ItemData } from '@/types';
import { CostEngine, CostBreakdown } from '@/lib/pricing/CostEngine';
import { useActiveCostMaps } from '@/hooks/useActiveCostMaps';

/**
 * วิเคราะห์ต้นทุน/กำไรของ "ทุกประเภทสินค้า" (generalize จาก useSmartPrice ที่ผูกกับผ้าม่าน)
 * คืน CostBreakdown (status profit|warning|loss|unknown) ให้ summary card เอาไปแสดงไฟจราจร
 *
 * คลังต้นทุน inject เป็น CostContext จาก useActiveCostMaps (memoized) — เปลี่ยนเมื่อ
 * vault/catalog เปลี่ยนจริงเท่านั้น ไม่ต้องมี hint selector + eslint-disable อีก
 */
export const useCostStatus = (item: ItemData | null): CostBreakdown | null => {
  const ctx = useActiveCostMaps();
  return useMemo(() => (item ? CostEngine.analyze(item, ctx) : null), [item, ctx]);
};
