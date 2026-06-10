import { WallpaperItemInput } from '@/types';
import { toNum } from '@/utils/formatters';
import { PricingStrategy, PriceResult, PricingContext } from '@/lib/pricing/types';
import { FORMULAS } from '@/config/formulas';

export const WallpaperStrategy: PricingStrategy<WallpaperItemInput> = {
  /**
   * 1. Calculate: คำนวณราคาวอลเปเปอร์ (จำนวนม้วน x ราคา)
   */
  calculate: (item, context?: PricingContext): PriceResult => {
    // Priority 1: ราคาเหมา (Override Logic) — มาก่อนเช็คขนาด ให้พฤติกรรมเหมือน
    // curtain/area ทุกประเภท (เดิมวอลเปเปอร์เช็คขนาดก่อน → เหมาแล้วแต่ไม่ใส่ขนาด = ราคา 0)
    if (item.enable_set_price && toNum(item.set_price_override) > 0) {
      return { total: toNum(item.set_price_override) };
    }

    // รวมความกว้างทุกผนัง
    const widthTotal = item.widths.reduce((sum, w) => sum + toNum(w), 0);
    const height = toNum(item.height_m);

    // Safety Check
    if (widthTotal <= 0 || height <= 0) {
      return { total: 0, breakdown: {} };
    }

    // Use injected formulas (test/worker) or compile-time FORMULAS
    const formulas = context?.formulas ?? FORMULAS;
    const config = formulas.wallpaper;

    // 1. คำนวณความยาวต่อแผ่นที่ต้องตัด (สูง + เผื่อ)
    const cutLength = height + config.waste_margin; // ex: 2.5 + 0.1 = 2.6

    // 2. คำนวณ Capacity: 1 ม้วนตัดได้กี่แผ่น (ปัดลง)
    // ex: 10 / 2.6 = 3.84 -> 3 แผ่น
    const stripsPerRoll = Math.floor(config.roll_length / cutLength);

    let rolls: number;
    let warning: string | undefined;
    if (stripsPerRoll > 0) {
      // 3. คำนวณ Demand: ต้องใช้กี่แผ่น (ปัดขึ้น)
      // ex: กว้าง 2.0 / 0.53 = 3.77 -> 4 แผ่น
      const totalStripsNeeded = Math.ceil(widthTotal / config.roll_width);

      // 4. สรุปจำนวนม้วน
      rolls = Math.ceil(totalStripsNeeded / stripsPerRoll);
    } else {
      // กรณีผนังสูงเกินความยาวม้วน — แจ้ง warning ขึ้นไปให้ UI แสดง
      rolls = 0;
      warning = 'height_exceeds_roll';
    }

    const pricePerRoll = toNum(item.price_per_roll);
    const installCostPerRoll = toNum(item.install_cost_per_roll);

    // คำนวณยอดเงิน
    const materialPrice = rolls * pricePerRoll;
    const laborPrice = rolls * installCostPerRoll;

    // ปัดเศษ 2 ตำแหน่ง (override คืนค่าไปแล้วที่ Priority 1 ด้านบน)
    const total = Math.round((materialPrice + laborPrice) * 100) / 100;

    return {
      total,
      breakdown: {
        rolls,
        materialPrice,
        laborPrice,
        totalWidth: widthTotal,
      },
      ...(warning ? { warning } : {}),
    };
  },

  /**
   * 2. Validate: ตรวจสอบข้อมูล
   */
  validate: (item): string[] => {
    const errors: string[] = [];

    // เช็คความกว้างรวม
    const widthTotal = item.widths.reduce((sum, w) => sum + toNum(w), 0);
    if (widthTotal <= 0) {
      errors.push('กรุณาระบุความกว้างผนังอย่างน้อย 1 ด้าน');
    }

    if (toNum(item.height_m) <= 0) {
      errors.push('กรุณาระบุความสูงผนัง');
    }

    if (!item.wallpaper_code) {
      errors.push('กรุณาระบุรหัสวอลเปเปอร์');
    }

    return errors;
  },

  /**
   * 3. Get Specs: สเปคสินค้า
   */
  getSpecs: (item): string[] => {
    const widthTotal = item.widths.reduce((sum, w) => sum + toNum(w), 0);
    const specs = [`พื้นที่: กว้างรวม ${widthTotal.toFixed(2)} ม. x สูง ${item.height_m} ม.`];

    if (item.wallpaper_code) {
      specs.push(`รหัส: ${item.wallpaper_code}`);
    }

    // ใช้ค่าจาก compile-time FORMULAS (specs preview ไม่รับ context)
    const config = FORMULAS.wallpaper;
    const height = toNum(item.height_m);
    
    let rolls = 0;
    if (height > 0 && widthTotal > 0) {
      const cutLength = height + config.waste_margin;
      const stripsPerRoll = Math.floor(config.roll_length / cutLength);
      
      if (stripsPerRoll > 0) {
        const totalStripsNeeded = Math.ceil(widthTotal / config.roll_width);
        rolls = Math.ceil(totalStripsNeeded / stripsPerRoll);
      }
    }
    
    specs.push(`ใช้: ${rolls} ม้วน (โดยประมาณ)`);

    return specs;
  },
};