// src/lib/pricing/CostEngine.ts

import { useAppStore } from '@/store/useAppStore';
import { useCatalogStore } from '@/store/useCatalogStore';
import { ItemData } from '@/types';
import { PricingEngine } from '@/lib/pricing/PricingEngine';
import {
  isCurtainItem,
  isWallpaperItem,
  isAreaItem,
  isRemovalItem
} from '@/lib/type-guards';
import { isSqmPriced } from '@/lib/vault';
import { vaultLookup } from '@/lib/codes';
import { toNum } from '@/utils/formatters';

export interface CostBreakdown {
  totalCost: number;
  sellingPrice: number;
  // ⚠️ semantics: "ส่วนต่างจากทุนที่รู้" — ไม่ใช่กำไรทางบัญชี (ทุนขนส่ง/เหมา/อื่นๆ ยังไม่รวม)
  // คงชื่อ field เดิมเพื่อลด blast radius; UI ต้อง relabel เป็น "ส่วนต่าง" เสมอ ห้ามใช้คำว่า "กำไร"
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
  // ส่วนทุนที่ "ปิดไม่นับ" ผ่านสวิตช์ costInclude (ProductionSettings) — ป้ายไทยสำหรับ UI
  // เช่น ['ค่าเย็บ'] = เจ้าของปิดเพราะทุนไม่แน่นอน ไปบันทึกจ่ายจริงใน "การเงินของงาน" แทน
  excludedComponents: string[];
  usedQuantity: number;  // จำนวนที่ใช้ ผ้าทึบ/วัสดุหลัก (หลา/ม้วน/ตร.ล./ชิ้น)
  sheerQuantity?: number; // จำนวนผ้าโปร่งที่ใช้ (หลา) — เฉพาะ DOUBLE
  unit: string;          // หน่วย (หลา/ม้วน/ตร.ล./ชิ้น)
}

export const CostEngine = {
  analyze: (item: ItemData): CostBreakdown => {
    // 1. ดึงคลังข้อมูลต้นทุน (Vault)
    // ผ้า/ผ้าโปร่ง → fabricCosts, วอลเปเปอร์ → wallpaperCosts, มู่ลี่/ฉาก/มุ้ง → areaCosts
    // (ต้องตรงกับฝั่งบันทึก: routeCostToVault ใน InventorySlice + แค็ตตาล็อกใน MaterialSummaryModal)
    const state = useAppStore.getState();
    // ค่าแรง/บริการ/อุปกรณ์(legacy) + สวิตช์ = "ของร้านเอง" คงอยู่ในแอป (HANDOFF §11.2)
    const { accessoryCosts, laborCosts, serviceCosts, costInclude } = state;

    // ทุนสินค้า (ผ้า/วอลฯ/พื้นที่/ราง) — หลักการ: **คลังทับเมื่อมี · ของฉันเติมเมื่อคลังไม่มี · ออฟไลน์ใช้ของฉัน**
    // (HANDOFF §11.9). ออนไลน์ (status==='ready') merge ต่อ key: catalog (DB) ทับ vault → รหัสซ้ำ DB ชนะ,
    // รหัสที่ DB ไม่มี → ทุนที่จด (vault, ฉายโดย useMaterialDraftHydration) เติมเข้าไป. ออฟไลน์ = vault ล้วน.
    // ไม่เจอทั้งสอง → vaultLookup คืน 0 → hasMissingCost → 'unknown' (เทา).
    const catalog = useCatalogStore.getState();
    const useCatalog = catalog.status === 'ready';
    const fabricCosts = useCatalog
      ? { ...state.fabricCosts, ...catalog.fabricCosts }
      : state.fabricCosts;
    const wallpaperCosts = useCatalog
      ? { ...state.wallpaperCosts, ...catalog.wallpaperCosts }
      : state.wallpaperCosts;
    const areaCosts = useCatalog ? { ...state.areaCosts, ...catalog.areaCosts } : state.areaCosts;
    const hardwareCosts = useCatalog
      ? { ...state.hardwareCosts, ...catalog.hardwareCosts }
      : state.hardwareCosts;

    // 2. ให้ PricingEngine คำนวณราคาขายและปริมาณที่ต้องใช้มาให้
    // (รองรับ Manual Override ราคาขายมาแล้วจาก PricingEngine)
    const { total: sellingPrice, breakdown } = PricingEngine.calculateDetailedPrice(item);

    let totalCost = 0;
    let fabricCost = 0;
    let sheerCost = 0;
    let railCost = 0;
    let laborCost = 0;
    const accCost = 0; // component (ขาจับ/ลูกล้อ/เทป) รวมในชุดรางแล้ว — ไม่คิดแยก
    let isLaborMinApplied = false; // ✅ NEW: เก็บสถานะว่ามีการใช้ค่าแรงขั้นต่ำหรือไม่
    const excludedComponents: string[] = [];

    let usedQuantity = 0;
    let sheerQuantity = 0;
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
             // Priority 1: Vault lookup by code (ทน case/space — ดู src/lib/codes.ts)
             // ✅ ยืนยันจากเจ้าของร้าน (มิ.ย. 2026): มี code = vault เป็น source เด็ดขาด —
             // vault ว่างให้ขึ้น "ไม่รู้ต้นทุน" (เทา) เพื่อบังคับเติมคลัง ไม่ fallback ไป price_sqyd ในฟอร์ม
             const costPerYard = vaultLookup(fabricCosts, item.code);
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
           sheerQuantity = sheerYards;
           const sheerCode = item.sheer_code;

           if (sheerCode) {
             // Priority 1: Vault lookup by sheer code (ทน case/space)
             const sheerCostPerYard = vaultLookup(fabricCosts, sheerCode);
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

        // C. ต้นทุนราง (Rail) — ข้ามเมื่อสวิตช์ costInclude.rail ปิด (ทุนไม่แน่นอน → บันทึกจ่ายจริงแทน)
        if (costInclude.rail) {
          // Map ชื่อ Style ให้ตรงกับ Key ใน accessoryCosts
          let railKey = 'rail_standard';
          if (item.style === 'ลอน') railKey = 'rail_wave';
          else if (item.style === 'จีบ') railKey = 'rail_pleated';
          else if (item.style === 'ตาไก่') railKey = 'rail_eyelet';
          else if (item.style === 'พับ') railKey = 'rail_roman';
          else if (item.style === 'หลุยส์') railKey = 'rail_louis';
          else if (item.style === 'แป๊บ') railKey = 'rail_rod';

          // Priority chain: SKU ที่เลือก (catalog) → ค่า legacy คงที่ (accessoryCosts) → 0
          const railSkuCost = vaultLookup(hardwareCosts, item.rail_code);
          const costPerMeterRail = railSkuCost > 0 ? railSkuCost : accessoryCosts[railKey] || 0;
          railCost = width * costPerMeterRail;
        } else {
          excludedComponents.push('ค่าราง/อุปกรณ์');
        }

        // C2. ขาจับราง/ลูกล้อ/เทป — รวมในชุดรางแล้ว (ราคา SKU ราง = ชุดประกอบเสร็จ)
        //     ไม่คิดทุน component แยก (accCost คง 0)

        // D. ต้นทุนค่าแรง (Labor) — ข้ามทั้ง D/D2 เมื่อสวิตช์ costInclude.labor ปิด
        const laborKey = item.style;
        const laborData = costInclude.labor ? laborCosts[laborKey] : undefined;
        if (!costInclude.labor) excludedComponents.push('ค่าเย็บ');

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
        if (costInclude.labor && sheerYardsForLabor > 0) {
          const sheerLaborData = laborCosts['ผ้าโปร่ง'];
          if (sheerLaborData) {
            let sheerLabor = calcLaborAmount(sheerLaborData, sheerYardsForLabor);
            if (sheerLaborData.min_price && sheerLabor < sheerLaborData.min_price) {
              isLaborMinApplied = true; // ผ้าโปร่งติดค่าแรงขั้นต่ำ → ติดธงด้วย (เดิมเงียบ เห็นเฉพาะผ้าทึบ)
              sheerLabor = sheerLaborData.min_price;
            }
            laborCost += sheerLabor;
          }
        }

        // รวมต้นทุนทั้งหมด
        totalCost = fabricCost + sheerCost + railCost + laborCost + accCost;
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
             const cost = vaultLookup(wallpaperCosts, code);
             if (cost === 0) hasMissingCost = true;

             fabricCost = rolls * cost;
             totalCost = fabricCost;
        }
    }

    // ==========================================
    // 🪟 CASE 3: มู่ลี่ / ฉาก / มุ้ง (Area Items)
    // ==========================================
    else if (isAreaItem(item)) {
        // หน่วยทุนตามประเภท (vault.ts): มุ้งจีบ = ตร.ม., ที่เหลือ = ตร.ล. — ใช้ปริมาณเดียวกับ
        // ที่ AreaStrategy ใช้คิดราคาขาย (breakdown.pricedArea) ให้ทุน/ขาย/สรุปวัสดุตรงกันเสมอ
        unit = isSqmPriced(item.type) ? 'ตร.ม.' : 'ตร.ล.';
        const costArea = breakdown?.pricedArea ?? breakdown?.areaSqyd;
        if (costArea) {
            usedQuantity = costArea;

            // ต้นทุนพื้นที่อยู่ใน areaCosts — key เป็นรหัสสินค้า ถ้าไม่ระบุรหัสใช้ประเภทสินค้า
            // (ตรงกับ buildSummary: costKey = code || item.type และ routeCostToVault → areaCosts)
            // key ประเภทสินค้า ('pleated_screen' ฯลฯ) ต้องคงรูปเดิม — normalize เฉพาะรหัสที่ผู้ใช้พิมพ์
            const cost = item.code
              ? vaultLookup(areaCosts, item.code)
              : areaCosts[item.type] || 0;
            if (cost === 0) hasMissingCost = true;

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
        if (costInclude.service) {
          // ทุนค่ารื้อถอน = อัตรา/จุด × จำนวนจุด (serviceCosts.removal_per_point)
          // ถ้าอัตรา = 0 (ยังไม่ตั้ง) → totalCost = 0 = พฤติกรรมเดิม (ส่วนต่างเต็มราคาขาย)
          const removalRate = serviceCosts['removal_per_point'] || 0;
          totalCost = removalRate * usedQuantity;
          laborCost = totalCost; // นับเป็นค่าแรงบริการใน breakdown
        } else {
          excludedComponents.push('ค่าบริการ');
        }
    }

    // ==========================================
    // 📊 สรุปส่วนต่างจากทุนที่รู้ (Final Verdict)
    // — ไม่ใช่กำไรบัญชี: ส่วนที่ปิดสวิตช์ (excludedComponents) + ขนส่ง/อื่นๆ ยังไม่รวม
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
      excludedComponents,
      usedQuantity,
      sheerQuantity,
      unit
    };
  }
};