// src/lib/summaryGenerator.ts
// ════════════════════════════════════════════════════════════════════════════
// 📋 ตัวสร้างข้อความสรุปสำหรับคัดลอกไป LINE
// พอร์ต/ปรับปรุงจากฟีเจอร์ "คัดลอกสรุป (LINE)" ของแอปต้นทาง (vanilla JS)
//
// เป็น pure function ล้วน — ไม่อ่าน store / ไม่แตะ clipboard (ทำใน CopySummaryModal)
// จึงทดสอบได้ง่าย (summaryGenerator.test.ts)
//
// 3 แบบ: customer (ส่งลูกค้า) · seamstress (ช่างเย็บ) · purchase_order (สั่งของ)
// ════════════════════════════════════════════════════════════════════════════

import { ITEM_TYPES, LAYER_MODES } from '@/config/enums';
import { ITEM_CONFIG, STYLES_WITHOUT_OPENING } from '@/config/constants';
import { fmtTH, toNum, fmtDate } from '@/utils/formatters';
import { buildSummary } from '@/lib/materials/buildSummary';
import { isCurtainItem, isWallpaperItem, isRemovalItem, isAreaItem } from '@/lib/type-guards';
import { PricingEngine } from '@/lib/pricing/PricingEngine';
import type { Room, Customer, ShopConfig, Discount, ItemData, CurtainItemInput } from '@/types';

export type SummaryType = 'customer' | 'seamstress' | 'purchase_order';

export interface SummaryTotals {
  /** ยอดรวมสินค้า (ก่อนหักส่วนลด / ก่อน VAT) */
  grandTotal: number;
  discountAmount: number;
  vatAmount: number;
  vatRate: number;
  /** ยอดสุทธิ (หลังหักส่วนลด + รวม VAT) */
  finalTotal: number;
  discount: Discount;
}

export interface SummaryInput {
  rooms: Room[];
  customer: Pick<Customer, 'name' | 'phone' | 'address'>;
  shopConfig: Pick<ShopConfig, 'name' | 'phone'>;
  totals: SummaryTotals;
}

const SEP = '------------------------------';
const DSEP = '==============================';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** layer_mode → ชื่อชั้นผ้าแบบอ่านง่าย */
function fabricVariant(layerMode?: string): string {
  switch (layerMode) {
    case LAYER_MODES.SHEER:
      return 'โปร่ง';
    case LAYER_MODES.DOUBLE:
      return 'ทึบ&โปร่ง';
    case LAYER_MODES.MAIN:
    default:
      return 'ทึบ';
  }
}

function curtainName(style: string): string {
  if (style === 'หลุยส์') return 'ม่านหลุยส์';
  return style ? `ผ้าม่าน ${style}` : 'ผ้าม่าน';
}

/** รายการ "ใช้งานจริง" — ไม่ระงับ และมีขนาด/จำนวนที่ valid */
function isActiveItem(item: ItemData, requireHeight = false): boolean {
  if (item.is_suspended) return false;
  if (isCurtainItem(item) || isAreaItem(item)) {
    return toNum(item.width_m) > 0 && (!requireHeight || toNum(item.height_m) > 0);
  }
  if (isWallpaperItem(item)) {
    const totalWidth = item.widths.reduce((a, b) => a + toNum(b), 0);
    return totalWidth > 0 && (!requireHeight || toNum(item.height_m) > 0);
  }
  if (isRemovalItem(item)) {
    return toNum(item.quantity) > 0;
  }
  return false;
}

function header(input: SummaryInput, includeContact: boolean): string {
  let t = `🗓️ สรุปข้อมูล (${fmtDate(new Date())})\n`;
  t += `👤 ลูกค้า: ${input.customer.name || '-'}\n`;
  if (includeContact) {
    t += `📞 โทร: ${input.customer.phone || '-'}\n`;
    t += `🏠 ที่อยู่: ${input.customer.address || '-'}\n`;
  }
  t += SEP + '\n';
  return t;
}

/** นับจำนวนเส้นตามความยาว (สำหรับสรุปการตัดราง) — เรียงจากยาวไปสั้น */
function lengthCounts(widths: number[]): [string, number][] {
  const counts: Record<string, number> = {};
  widths.forEach((w) => {
    const key = w.toFixed(2);
    counts[key] = (counts[key] || 0) + 1;
  });
  return Object.entries(counts).sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]));
}

// ─── 1. ลูกค้า (LINE) ──────────────────────────────────────────────────────

function simpleItemList(rooms: Room[]): string {
  let out = '\n📃 *สรุปรายการสินค้า*\n';
  let hasItems = false;

  rooms.forEach((room) => {
    if (room.is_suspended) return;
    const active = room.items.filter((i) => isActiveItem(i));
    if (active.length === 0) return;

    hasItems = true;
    out += `\n*🚪 ห้อง: ${room.name || 'ไม่ระบุ'}*\n`;
    active.forEach((item, idx) => {
      const n = idx + 1;
      if (isCurtainItem(item)) {
        out += ` ${n}) ${curtainName(item.style)} (${fabricVariant(item.layer_mode)})\n`;
      } else if (isRemovalItem(item)) {
        const name = item.description || ITEM_CONFIG[ITEM_TYPES.REMOVAL].name;
        out += ` ${n}) ${name} (${toNum(item.quantity)} หน่วย)\n`;
      } else {
        const name = ITEM_CONFIG[item.type]?.name ?? 'สินค้าตกแต่ง';
        out += ` ${n}) ${name}\n`;
      }
      if (item.notes) out += `  > _${item.notes}_\n`;
    });
  });

  return hasItems ? out + SEP + '\n' : '';
}

function customerSummary(input: SummaryInput): string {
  const { totals } = input;
  let t = header(input, true);
  t += simpleItemList(input.rooms);

  const hasDiscount = totals.discountAmount > 0;
  const hasVat = totals.vatAmount > 0;

  if (hasDiscount || hasVat) {
    t += `\nยอดรวมสินค้า: ${fmtTH(totals.grandTotal)} บาท\n`;
    if (hasDiscount) {
      const label =
        totals.discount.type === 'percent' ? `ส่วนลด (${totals.discount.value}%)` : 'ส่วนลด';
      t += `🏷️ ${label}: -${fmtTH(totals.discountAmount)} บาท\n`;
    }
    if (hasVat) {
      t += `🧾 VAT ${totals.vatRate}%: +${fmtTH(totals.vatAmount)} บาท\n`;
    }
  }

  t += `\n💰 *ยอดสุทธิ: ${fmtTH(totals.finalTotal)} บาท*\n`;
  t += `\nขอบคุณที่ใช้บริการค่ะ\n${input.shopConfig.name}\nโทร: ${input.shopConfig.phone}`;
  return t;
}

// ─── 2. ช่างเย็บผ้า ────────────────────────────────────────────────────────

function seamstressSummary(input: SummaryInput): string {
  let t = header(input, false);
  t += '\n🧵 *รายละเอียดสำหรับช่างเย็บผ้า*\n';

  let roomCount = 0;
  input.rooms.forEach((room) => {
    if (room.is_suspended) return;
    const sets = room.items.filter(
      (i): i is ItemData & CurtainItemInput => isCurtainItem(i) && isActiveItem(i, true)
    );
    if (sets.length === 0) return;

    if (roomCount > 0) t += DSEP + '\n';
    t += `\n*🚪 ห้อง: ${room.name || 'ไม่ระบุ'}*\n\n`;

    sets.forEach((s, idx) => {
      if (idx > 0) t += '--------------------\n';
      const variant = fabricVariant(s.layer_mode);
      t += `*ชุดที่ ${idx + 1}/${sets.length}: ${curtainName(s.style)} ${variant}*\n`;

      if (!STYLES_WITHOUT_OPENING.includes(s.style) && s.opening_style) {
        t += `  - รูปแบบเปิด: ${s.opening_style}\n`;
      }
      if (s.hook_type) {
        t += `  - ตะขอ: ${s.hook_type === 'long' ? 'ตะขอยาว (โชว์ราง)' : 'ตะขอสั้น (บังราง)'}\n`;
      }

      const hasMain = !s.layer_mode || s.layer_mode === LAYER_MODES.MAIN || s.layer_mode === LAYER_MODES.DOUBLE;
      const hasSheer = s.layer_mode === LAYER_MODES.SHEER || s.layer_mode === LAYER_MODES.DOUBLE;
      if (hasMain) t += `  - ผ้าทึบ: #${s.code || '-'}\n`;
      if (hasSheer) t += `  - ผ้าโปร่ง: #${s.sheer_code || '-'}\n`;

      t += `  - ขนาด: กว้าง ${toNum(s.width_m).toFixed(2)} x สูง ${toNum(s.height_m).toFixed(2)} ม.\n`;
      if (s.notes) t += `  📝 หมายเหตุ: ${s.notes}\n`;
    });
    t += '\n';
    roomCount++;
  });

  if (roomCount > 0) t += DSEP + '\n';
  else t += 'ไม่มีรายการสำหรับช่าง\n' + SEP + '\n';

  return t;
}

// ─── 3. รายการสั่งของ (Purchase Order) ───────────────────────────────────────

function purchaseOrderSummary(input: SummaryInput): string {
  let t = header(input, false);
  const m = buildSummary(input.rooms);

  // --- ผ้า (ทึบ + โปร่ง) ตามรหัส ---
  if (m.fabricsByCode.size > 0 || m.sheersByCode.size > 0) {
    t += '✂️ *รายการสั่งซื้อ (ผ้า)*\n' + SEP + '\n';
    const groups: [string, typeof m.fabricsByCode][] = [
      ['ผ้าทึบ (Curtain)', m.fabricsByCode],
      ['ผ้าโปร่ง (Sheer)', m.sheersByCode],
    ];
    groups.forEach(([label, map]) => {
      map.forEach((data, code) => {
        t += `- ${label} · รหัส: #${code}\n`;
        t += `  รวม: ${data.total.toFixed(2)} หลา\n`;
        data.entries.forEach((e) => {
          t += `    • ${e.roomName}: ${e.desc} = ${e.yards.toFixed(2)} หลา\n`;
        });
        t += '\n';
      });
    });
  }

  // --- ราง (ตัดตามความยาว) ---
  if (m.railsByKey.size > 0) {
    t += SEP + '\n📏 *รายการสั่งซื้อ ราง*\n' + SEP + '\n';
    m.railsByKey.forEach((rail) => {
      t += `\n*${rail.label}*\n`;
      if (rail.totalSets > 0) t += `  - จำนวน: ${rail.totalSets} ชุด\n`;
      if (rail.totalLength > 0) {
        t += `  - ความยาวรวม: ${rail.totalLength.toFixed(2)} ม.\n`;
        const cuts = lengthCounts(rail.items.filter((i) => i.romanSets === 0).map((i) => i.width));
        if (cuts.length > 0) {
          t += `  - ตัดราง:\n`;
          cuts.forEach(([len, count]) => {
            t += `    • ${len} ม. × ${count} เส้น\n`;
          });
        }
      }
    });
    t += '\n';
  }

  // --- ฮาร์ดแวร์รวม ---
  const { acc } = m;
  const hwLines: string[] = [];
  if (acc.brackets > 0) hwLines.push(`  - ขาจับราง: ${acc.brackets} ตัว`);
  if (acc.eyelets > 0) hwLines.push(`  - ตาไก่: ${acc.eyelets} ตัว`);
  if (acc.pinHooks > 0) hwLines.push(`  - ตะขอจีบ: ${acc.pinHooks} ตัว`);
  if (acc.waveTapeM > 0) hwLines.push(`  - เทปลอน: ${acc.waveTapeM.toFixed(1)} ม.`);
  if (acc.rollers > 0) hwLines.push(`  - ลูกล้อ (ม่านลอน): ${acc.rollers} ตัว`);
  if (acc.snaps > 0) hwLines.push(`  - กระดุม/สแน็ป (ม่านลอน): ${acc.snaps} ตัว`);
  if (acc.romanSets > 0) hwLines.push(`  - ชุดรางม่านพับ: ${acc.romanSets} ชุด`);
  if (hwLines.length > 0) {
    t += SEP + '\n🔩 *รายการสั่งซื้อ อุปกรณ์ (Hardware)*\n' + SEP + '\n';
    t += hwLines.join('\n') + '\n';
    if (acc.oversizeWave.length > 0) {
      t += `  ⚠️ ม่านลอนรางยาวเกินมาตรฐาน (ควรแยกราง/เพิ่มขาค้ำ): `;
      t += acc.oversizeWave.map((o) => `${o.roomName} ${o.width.toFixed(2)} ม.`).join(', ') + '\n';
    }
    t += '\n';
  }

  // --- วอลเปเปอร์ ---
  if (m.wallpapersByCode.size > 0) {
    t += SEP + '\n🎨 *รายการสั่งซื้อ (Wallpaper)*\n' + SEP + '\n';
    m.wallpapersByCode.forEach((data, code) => {
      t += `- รหัส: #${code} · รวม: ${data.total} ม้วน\n`;
      data.entries.forEach((e) => {
        t += `    • ${e.roomName}: ${e.desc} = ${e.rolls} ม้วน\n`;
      });
      t += '\n';
    });
  }

  // --- พื้นที่ (มู่ลี่ / ฉาก / มุ้ง) ---
  if (m.areaByKey.size > 0) {
    t += SEP + '\n📦 *รายการสั่งซื้อ (มู่ลี่/ฉาก/มุ้ง)*\n' + SEP + '\n';
    m.areaByKey.forEach((group) => {
      const totalArea = group.unit === 'ตร.ม.' ? group.totalSqm : group.totalSqyd;
      t += `- ${group.typeName}${group.code ? ` · รหัส: #${group.code}` : ''}\n`;
      t += `  รวม: ${totalArea.toFixed(2)} ${group.unit}\n`;
      group.entries.forEach((e) => {
        t += `    • ${e.roomName}: ${e.width.toFixed(2)} x ${e.height.toFixed(2)} ม.\n`;
      });
      t += '\n';
    });
  }

  // --- รื้อถอน (buildSummary ข้าม removal — วนเองที่นี่) ---
  const removals: { room: string; item: ItemData }[] = [];
  input.rooms.forEach((room) => {
    if (room.is_suspended) return;
    room.items.forEach((item) => {
      if (isRemovalItem(item) && isActiveItem(item)) removals.push({ room: room.name, item });
    });
  });
  if (removals.length > 0) {
    t += SEP + '\n📦 *รายการรื้อถอน/ค่าแรง*\n' + SEP + '\n';
    removals.forEach(({ room, item }, i) => {
      if (!isRemovalItem(item)) return;
      const price = PricingEngine.calculatePrice(item);
      t += `- รายการ #${i + 1}: ${item.description || 'ไม่ระบุ'} (ห้อง: ${room})\n`;
      t += `    จำนวน: ${toNum(item.quantity)} หน่วย · ราคา: ${fmtTH(price)} บาท\n`;
      if (item.notes) t += `    📝 หมายเหตุ: ${item.notes}\n`;
    });
    t += '\n';
  }

  t += SEP + '\n';
  return t;
}

// ─── Entry ──────────────────────────────────────────────────────────────────

export function generateSummaryText(input: SummaryInput, type: SummaryType): string {
  switch (type) {
    case 'customer':
      return customerSummary(input);
    case 'seamstress':
      return seamstressSummary(input);
    case 'purchase_order':
      return purchaseOrderSummary(input);
    default:
      return '';
  }
}
