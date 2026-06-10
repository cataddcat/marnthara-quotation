// src/lib/pricing/PricingEngine.ts

import { ITEM_TYPES } from '@/config/enums';
import { ItemData } from '@/types';
import { PriceResult, PricingContext } from './types';

// Feature Strategies
import { CurtainStrategy } from '@/features/curtains/logic/CurtainStrategy';
import { WallpaperStrategy } from '@/features/wallpapers/logic/WallpaperStrategy';
import { RemovalStrategy } from '@/features/removal/logic/RemovalStrategy';
import { createAreaStrategy } from '@/features/shared/logic/AreaStrategy';
import { isSqmPriced } from '@/lib/vault';

// Strategies Instances — หน่วยราคาต่อประเภทอ่านจาก vault.ts (single source: มุ้งจีบ = ตร.ม.)
const WoodenBlindStrategy = createAreaStrategy({ name: 'มู่ลี่ไม้' });
const RollerBlindStrategy = createAreaStrategy({ name: 'ม่านม้วน' });
const VerticalBlindStrategy = createAreaStrategy({ name: 'ม่านปรับแสง' });
const AluminumBlindStrategy = createAreaStrategy({ name: 'มู่ลี่อลูมิเนียม' });
const PartitionStrategy = createAreaStrategy({ name: 'ฉากกั้นห้อง' });
const PleatedScreenStrategy = createAreaStrategy({
  name: 'มุ้งจีบ',
  pricePerSqm: isSqmPriced(ITEM_TYPES.PLEATED_SCREEN),
});

export const PricingEngine = {
  calculatePrice: (item: ItemData, context?: PricingContext): number => {
    const result = PricingEngine.calculateDetailedPrice(item, context).total;
    return Number.isFinite(result) ? result : 0;
  },

  calculateDetailedPrice: (item: ItemData, context?: PricingContext): PriceResult => {
    // Defensive check
    if (!item || !item.type) return { total: 0 };

    try {
      // ✅ Using Discriminated Unions: TypeScript knows exactly what 'item' is inside each case
      switch (item.type) {
        case ITEM_TYPES.CURTAIN: {
          // item is automatically narrowed to CurtainItemInput & { type: 'curtain' ... }
          return CurtainStrategy.calculate(item, context);
        }

        case ITEM_TYPES.WALLPAPER: {
          return WallpaperStrategy.calculate(item, context);
        }

        case ITEM_TYPES.WOODEN_BLIND: {
          return WoodenBlindStrategy.calculate(item, context);
        }

        case ITEM_TYPES.ROLLER_BLIND: {
          return RollerBlindStrategy.calculate(item, context);
        }

        case ITEM_TYPES.VERTICAL_BLIND: {
          return VerticalBlindStrategy.calculate(item, context);
        }

        case ITEM_TYPES.ALUMINUM_BLIND: {
          return AluminumBlindStrategy.calculate(item, context);
        }

        case ITEM_TYPES.PARTITION: {
          return PartitionStrategy.calculate(item, context);
        }

        case ITEM_TYPES.PLEATED_SCREEN: {
          return PleatedScreenStrategy.calculate(item, context);
        }

        case ITEM_TYPES.REMOVAL: {
          return RemovalStrategy.calculate(item, context);
        }

        default: {
          // Exhaustive check protection (optional but good practice)
          const _unreachable: never = item; 
          // ✅ แก้ไข: ส่ง _unreachable เข้าไปใน console.warn เพื่อให้ถือว่า "ถูกใช้งาน" (Used)
          console.warn(`[PricingEngine] ⚠️ Unknown item type detected:`, _unreachable);
          return { total: 0 };
        }
      }
    } catch (error) {
      console.error(`[PricingEngine] 💥 Critical Calculation Error:`, error);
      return { total: 0 };
    }
  },

  getItemSpecs: (item: ItemData): string[] => {
    if (!item || !item.type) return [];
    try {
      switch (item.type) {
        case ITEM_TYPES.CURTAIN: {
          return CurtainStrategy.getSpecs(item);
        }
        case ITEM_TYPES.WALLPAPER: {
          return WallpaperStrategy.getSpecs(item);
        }
        case ITEM_TYPES.WOODEN_BLIND: {
          return WoodenBlindStrategy.getSpecs(item);
        }
        case ITEM_TYPES.ROLLER_BLIND: {
          return RollerBlindStrategy.getSpecs(item);
        }
        case ITEM_TYPES.VERTICAL_BLIND: {
          return VerticalBlindStrategy.getSpecs(item);
        }
        case ITEM_TYPES.ALUMINUM_BLIND: {
          return AluminumBlindStrategy.getSpecs(item);
        }
        case ITEM_TYPES.PARTITION: {
          return PartitionStrategy.getSpecs(item);
        }
        case ITEM_TYPES.PLEATED_SCREEN: {
          return PleatedScreenStrategy.getSpecs(item);
        }
        case ITEM_TYPES.REMOVAL: {
          return RemovalStrategy.getSpecs(item);
        }
        default: {
          return [];
        }
      }
    } catch {
      return ['Error generating specs'];
    }
  },
};