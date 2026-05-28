// src/lib/pricing/CostEngine.ts

import { useAppStore } from '@/store/useAppStore';
import { ItemData } from '@/types';
import { PricingEngine } from '@/lib/pricing/PricingEngine';
import { 
  isCurtainItem, 
  isWallpaperItem, 
  isAreaItem, 
  isRemovalItem 
} from '@/lib/type-guards';
import { toNum } from '@/utils/formatters';

export interface CostBreakdown {
  totalCost: number;
  sellingPrice: number;
  profitAmount: number;
  marginPercent: number;
  status: 'profit' | 'warning' | 'loss' | 'unknown';
  
  // รายละเอียดต้นทุน (Optional)
  fabricCost?: number;
  sheerCost?: number;
  railCost?: number;     // ค่าราง
  laborCost?: number;    // ค่าแรง
  accCost?: number;      // อุปกรณ์อื่นๆ
  
  isLaborMinApplied?: boolean; // ✅ NEW: บอกว่ามีการใช้ค่าแรงขั้นต่ำหรือไม่
  usedQuantity: number;  // จำนวนที่ใช้ (หลา/ม้วน/ตร.ล./ชิ้น)
  unit: string;          // หน่วย (หลา/ม้วน/ตร.ล./ชิ้น)
}

export const CostEngine = {
  analyze: (item: ItemData): CostBreakdown => {
    // 1. ดึงคลังข้อมูลต้นทุน (Vault)
    const state = useAppStore.getState();
    const { fabricCosts, accessoryCosts, laborCosts } = state;

    // 2. ให้ PricingEngine คำนวณราคาขายและปริมาณที่ต้องใช้มาให้
    // (รองรับ Manual Override ราคาขายมาแล้วจาก PricingEngine)
    const { total: sellingPrice, breakdown } = PricingEngine.calculateDetailedPrice(item);

    let totalCost = 0;
    let fabricCost = 0;
    let sheerCost = 0;
    let railCost = 0;
    let laborCost = 0;
    let accCost = 0;
    let isLaborMinApplied = false; // ✅ NEW: เก็บสถานะว่ามีการใช้ค่าแรงขั้นต่ำหรือไม่
    
    let usedQuantity = 0;
    let unit = 'หน่วย';
    let hasMissingCost = false;

    // ==========================================
    // 🧵 CASE 1: ผ้าม่าน (Curtain)
    // ==========================================
    if (isCurtainItem(item)) {
        unit = 'หลา';
        const width = toNum(item.width_m);

        // A. ต้นทุนผ้าทึบ (Fabric)
        if (breakdown?.fabricYards && breakdown.fabricYards > 0) {
           const usedYards = breakdown.fabricYards;
           usedQuantity += usedYards;

           if (item.code) {
             // Priority 1: Vault lookup by code
             const costPerYard = fabricCosts[item.code] || 0;
             if (costPerYard === 0) hasMissingCost = true;
             fabricCost = usedYards * costPerYard;
           } else if (toNum(item.price_sqyd) > 0) {
             // Priority 2: ต้นทุน/หลาที่กรอกในฟอร์มโดยตรง
             fabricCost = usedYards * toNum(item.price_sqyd);
           } else if (item._cost_fabric && item._cost_fabric > 0) {
             // Priority 3: Pro Mode — ต้นทุนรวมผ้าทึบ
             fabricCost = item._cost_fabric;
           } else {
             hasMissingCost = true;
           }
        }

        // B. ต้นทุนผ้าโปร่ง (Sheer) — เฉพาะ layer mode ทึบ+โปร่ง (DOUBLE)
        if (breakdown?.sheerYards && breakdown.sheerYards > 0) {
           const sheerYards = breakdown.sheerYards;
           const sheerCode = item.sheer_code;

           if (sheerCode) {
             // Priority 1: Vault lookup by sheer code
             const sheerCostPerYard = fabricCosts[sheerCode] || 0;
             if (sheerCostPerYard === 0) hasMissingCost = true;
             sheerCost = sheerYards * sheerCostPerYard;
           } else if (toNum(item.sheer_price_sqyd) > 0) {
             // Priority 2: ต้นทุนโปร่ง/หลาที่กรอกในฟอร์มโดยตรง
             sheerCost = sheerYards * toNum(item.sheer_price_sqyd);
           } else if (item._cost_sheer && item._cost_sheer > 0) {
             // Priority 3: Pro Mode — ต้นทุนรวมผ้าโปร่ง
             sheerCost = item._cost_sheer;
           } else {
             // ม่านมีชั้นโปร่งแต่ไม่มีข้อมูลต้นทุนเลย
             hasMissingCost = true;
           }
        }

        // C. ต้นทุนราง (Rail)
        // Map ชื่อ Style ให้ตรงกับ Key ใน accessoryCosts
        let railKey = 'rail_standard'; 
        if (item.style === 'ลอน') railKey = 'rail_wave';
        else if (item.style === 'จีบ') railKey = 'rail_pleated';
        else if (item.style === 'ตาไก่') railKey = 'rail_eyelet';
        else if (item.style === 'พับ') railKey = 'rail_roman';
        else if (item.style === 'หลุยส์') railKey = 'rail_louis';
        else if (item.style === 'แป๊บ') railKey = 'rail_rod';
        
        const costPerMeterRail = accessoryCosts[railKey] || 0;
        railCost = width * costPerMeterRail;

        // D. ต้นทุนค่าแรง (Labor)
        const laborKey = item.style;
        const laborData = laborCosts[laborKey];

        const calcLaborAmount = (
          data: typeof laborData,
          yards: number
        ): number => {
          if (!data) return 0;
          if (data.unit === 'sqm') {
            const height = toNum(item.height_m);
            return (width * height) * data.rate;
          }
          if (data.unit === 'yard') {
            // คิดต่อหลาผ้าที่ใช้จริง (จาก CurtainStrategy)
            return yards * data.rate;
          }
          // 'meter' — ต่อเมตรความกว้างหน้าต่าง
          return width * data.rate;
        };

        if (laborData) {
          const fabricYards = breakdown?.fabricYards || 0;
          let currentLabor = calcLaborAmount(laborData, fabricYards);

          if (laborData.min_price && currentLabor < laborData.min_price) {
            isLaborMinApplied = true;
            currentLabor = laborData.min_price;
          }
          laborCost = currentLabor;
        }

        // D2. ค่าแรงเย็บผ้าโปร่ง — เฉพาะ ทึบ+โปร่ง (DOUBLE layer)
        // คิดแยกต่างหากเพราะต้องเย็บผ้าอีก 1 ชั้น
        const sheerYardsForLabor = breakdown?.sheerYards || 0;
        if (sheerYardsForLabor > 0) {
          const sheerLaborData = laborCosts['ผ้าโปร่ง'];
          if (sheerLaborData) {
            let sheerLabor = calcLaborAmount(sheerLaborData, sheerYardsForLabor);
            if (sheerLaborData.min_price && sheerLabor < sheerLaborData.min_price) {
              sheerLabor = sheerLaborData.min_price;
            }
            laborCost += sheerLabor;
          }
        }

        // รวมต้นทุนทั้งหมด
        totalCost = fabricCost + sheerCost + railCost + laborCost;
    }

    // ==========================================
    // 🧱 CASE 2: วอลเปเปอร์ (Wallpaper)
    // ==========================================
    else if (isWallpaperItem(item)) {
        unit = 'ม้วน';
        // ใช้จำนวนม้วนที่คำนวณได้จาก Strategy
        if (breakdown?.rolls) {
             const rolls = breakdown.rolls;
             usedQuantity = rolls;
             
             const code = item.wallpaper_code; 
             const cost = code ? (fabricCosts[code] || 0) : 0;
             if (code && cost === 0) hasMissingCost = true;
             
             fabricCost = rolls * cost;
             totalCost = fabricCost;
        }
    }

    // ==========================================
    // 🪟 CASE 3: มู่ลี่ / ฉาก / มุ้ง (Area Items)
    // ==========================================
    else if (isAreaItem(item)) {
        unit = 'ตร.ล.';
        // ใช้พื้นที่ (ตร.ล.) เป็นตัวคูณต้นทุน
        if (breakdown?.areaSqyd) {
            usedQuantity = breakdown.areaSqyd;
            
            const code = item.code;
            // สมมติ: มู่ลี่ใช้ต้นทุนต่อ ตร.ล. ที่เก็บใน fabricCosts (หรือจะแยก accessoryCosts ก็ได้)
            const cost = code ? (fabricCosts[code] || 0) : 0;
            if (code && cost === 0) hasMissingCost = true;

            fabricCost = usedQuantity * cost;
            totalCost = fabricCost;
        }
    }

    // ==========================================
    // 🛠️ CASE 4: รื้อถอน / บริการ (Removal / Service)
    // ==========================================
    else if (isRemovalItem(item)) {
        unit = 'จุด';
        usedQuantity = toNum(item.quantity);
        // สำหรับงานบริการ ต้นทุนอาจจะเป็นค่าแรง หรือ 0 (กำไร 100%)
        // หากต้องการใส่ต้นทุน ให้ใส่ใน accessoryCosts หรือ fabricCosts โดยใช้รหัสอ้างอิง
        // ในที่นี้สมมติว่าเป็น 0 หรือดึงจาก Labor ถ้ามี Logic รองรับ
        totalCost = 0; 
    }

    // ==========================================
    // 📊 สรุปผลกำไร (Final Verdict)
    // ==========================================
    const profitAmount = sellingPrice - totalCost;
    let marginPercent = 0;
    
    // ป้องกันการหารด้วย 0
    if (sellingPrice > 0) {
      marginPercent = (profitAmount / sellingPrice) * 100;
    } else if (totalCost > 0) {
      // ขาย 0 แต่มีต้นทุน = ขาดทุน 100%
      marginPercent = -100;
    }

    // กำหนดสถานะ (Status Flag)
    let status: CostBreakdown['status'] = 'profit';
    
    if (hasMissingCost) {
        status = 'unknown'; // สีเทา: ไม่รู้ต้นทุน
    } else if (profitAmount < 0) {
        status = 'loss';    // สีแดง: ขาดทุน
    } else if (marginPercent < 30) {
        status = 'warning'; // สีเหลือง: กำไรน้อยกว่า 30%
    }

    return {
      totalCost,
      sellingPrice,
      profitAmount,
      marginPercent,
      status,
      // Breakdown Details
      fabricCost,
      sheerCost,
      railCost,
      laborCost,
      accCost,
      isLaborMinApplied, // ✅ ส่ง Flag ออกไป
      usedQuantity,
      unit
    };
  }
};