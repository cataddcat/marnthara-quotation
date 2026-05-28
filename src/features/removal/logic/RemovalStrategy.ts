import { RemovalItemInput } from '@/types';
import { toNum } from '@/utils/formatters';
import { PricingStrategy, PriceResult } from '@/lib/pricing/types';

export const RemovalStrategy: PricingStrategy<RemovalItemInput> = {
  /**
   * 1. Calculate: จำนวน x ราคาต่อจุด
   */
  calculate: (item): PriceResult => {
    // Override Price Logic (Priority สูงสุด)
    if (item.enable_set_price && toNum(item.set_price_override) > 0) {
      return { total: toNum(item.set_price_override) };
    }

    const quantity = toNum(item.quantity);
    const pricePerItem = toNum(item.price_per_item);

    // Safety Check
    if (quantity <= 0 || pricePerItem <= 0) {
      return { total: 0 };
    }

    const total = quantity * pricePerItem;

    return {
      total: Math.round(total * 100) / 100,
    };
  },

  /**
   * 2. Validate
   */
  validate: (item): string[] => {
    const errors: string[] = [];

    if (!item.description) {
      errors.push('กรุณาระบุรายละเอียดงาน');
    }

    // ถ้าไม่ได้เหมาจ่าย ต้องเช็คราคาต่อหน่วย
    if (!item.enable_set_price && toNum(item.price_per_item) <= 0) {
      errors.push('กรุณาระบุราคาต่อหน่วย');
    }

    return errors;
  },

  /**
   * 3. Get Specs
   */
  getSpecs: (item): string[] => {
    const specs = [];
    if (item.description) specs.push(item.description);

    const qty = toNum(item.quantity);
    if (qty > 0) specs.push(`จำนวน: ${qty} จุด/ชุด`);

    return specs;
  },
};
