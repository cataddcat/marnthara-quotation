import { useMemo } from 'react';
import { CurtainItemInput, ItemData } from '@/types';
import { CostEngine } from '@/lib/pricing/CostEngine'; // ✅ Corrected Path
import { ITEM_TYPES } from '@/config/enums';

export const useSmartPrice = (formData: CurtainItemInput) => {
  // Field-level deps จงใจ — recalculate เฉพาะเมื่อ field ที่กระทบราคาเปลี่ยน
  // ไม่ใช้ formData (whole object) เพื่อ skip re-calc เมื่อ field อื่นที่ไม่กระทบ (เช่น notes) เปลี่ยน
  const analysis = useMemo(
    () => {
      // แปลง FormData ให้เป็น ItemData ชั่วคราวเพื่อส่งเข้า Engine
      const tempItem: ItemData = {
        ...formData,
        type: ITEM_TYPES.CURTAIN,
        id: 'temp_analysis',
      };

      return CostEngine.analyze(tempItem);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      formData.width_m,
      formData.height_m,
      formData.style,
      formData.code,
      formData.sheer_code,
      formData.price_per_m_raw, // ถ้า User แก้ราคา -> คำนวณกำไรใหม่ทันที
      formData.sheer_price_per_m,
      formData.enable_set_price,
      formData.set_price_override,
    ]
  );

  return analysis;
};