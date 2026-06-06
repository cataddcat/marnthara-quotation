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
import { fmtTH, toNum, fmtDate, fmtSize } from '@/utils/formatters';
import { buildSummary, type RailItem } from '@/lib/materials/buildSummary';
import { FORMULAS } from '@/config/formulas';
import { isCurtainItem, isWallpaperItem, isRemovalItem, isAreaItem } from '@/lib/type-guards';
import { PricingEngine } from '@/lib/pricing/PricingEngine';
import { railProductName } from '@/config/railProducts';
import type { Room, Customer, ShopConfig, Discount, ItemData, CurtainItemInput } from '@/types';

export type SummaryType = 'customer' | 'seamstress' | 'purchase_order' | 'rail_order';

/** รูปแบบใบสั่งราง: ย่อ (ขนาด/เส้น/สไลด์/ชั้น) หรือ ละเอียด (ลูกล้อ/ผ้า/ขาจับเต็ม) */
export type RailFormat = 'short' | 'detailed';

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

// ตัวคั่นสั้น — LINE/มือถือ render ฟอนต์ไม่คงที่ เส้นยาวจะตัดบรรทัด เลยใช้สั้น ๆ
const SEP = '────────────';
const DSEP = '━━━━━━━━━━━━';

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

/** แยกรายการรางตามสี (รหัสสินค้าต่างกันต่อสี) — คงลำดับที่พบครั้งแรก */
function groupByColor(items: RailItem[]): Map<string, RailItem[]> {
  const byColor = new Map<string, RailItem[]>();
  items.forEach((it) => {
    const key = (it.railColor || '').trim();
    const arr = byColor.get(key) ?? [];
    arr.push(it);
    byColor.set(key, arr);
  });
  return byColor;
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
      if (item.notes) out += `   📝 ${item.notes}\n`;
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
      if (idx > 0) t += SEP + '\n';
      const variant = fabricVariant(s.layer_mode);
      t += `*ชุดที่ ${idx + 1}/${sets.length}: ${curtainName(s.style)} ${variant}*\n`;

      if (!STYLES_WITHOUT_OPENING.includes(s.style) && s.opening_style) {
        t += `  - รูปแบบเปิด: ${s.opening_style}\n`;
      }
      // ตะขอ สั้น/ยาว มีเฉพาะม่านจีบ — ม่านลอน/อื่น ๆ ไม่ต้องระบุ
      if (s.style === 'จีบ' && s.hook_type) {
        t += `  - ตะขอ: ${s.hook_type === 'long' ? 'ตะขอยาว (โชว์ราง)' : 'ตะขอสั้น (บังราง)'}\n`;
      }

      const hasMain =
        !s.layer_mode || s.layer_mode === LAYER_MODES.MAIN || s.layer_mode === LAYER_MODES.DOUBLE;
      const hasSheer = s.layer_mode === LAYER_MODES.SHEER || s.layer_mode === LAYER_MODES.DOUBLE;
      if (hasMain) t += `  - ผ้าทึบ: #${s.code || '-'}\n`;
      if (hasSheer) t += `  - ผ้าโปร่ง: #${s.sheer_code || '-'}\n`;

      t += `  - ขนาด: ${fmtSize(s.width_m, s.height_m)}\n`;
      if (s.layer_mode === LAYER_MODES.DOUBLE) {
        t += `  - ⚠️ ใช้ขา 2 ชั้น (ทึบ+โปร่ง = 1 ชุด)\n`;
      }
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
    t += '✂️ *รายการสั่งซื้อ (ผ้า)*\n';
    const groups: [string, typeof m.fabricsByCode][] = [
      ['ผ้าทึบ (Curtain)', m.fabricsByCode],
      ['ผ้าโปร่ง (Sheer)', m.sheersByCode],
    ];
    groups.forEach(([label, map]) => {
      map.forEach((data, code) => {
        t += `\n• ${label} · รหัส: #${code}\n`;
        t += `  รวม: ${data.total.toFixed(2)} หลา\n`;
        data.entries.forEach((e) => {
          t += `  - ${e.roomName}: ${e.desc} = ${e.yards.toFixed(2)} หลา\n`;
        });
      });
    });
  }

  // --- ราง (ตัดตามความยาว · แยกตามสี/รุ่นสินค้า) ---
  if (m.railsByKey.size > 0) {
    t += '\n' + SEP + '\n📏 *รายการสั่งซื้อ ราง*\n';
    m.railsByKey.forEach((rail, railKey) => {
      groupByColor(rail.items).forEach((items, color) => {
        const productName = railProductName(railKey, color) ?? rail.label;
        const romanCount = items.filter((i) => i.romanSets > 0).length;
        const lengthItems = items.filter((i) => i.romanSets === 0);
        const totalLength = lengthItems.reduce((s, i) => s + i.width, 0);
        t += `\n• ${productName}\n`;
        if (romanCount > 0) t += `  รวม: ${romanCount} ชุด\n`;
        if (totalLength > 0) {
          t += `  ยาวรวม: ${totalLength.toFixed(2)} ม.\n`;
          lengthCounts(lengthItems.map((i) => i.width)).forEach(([len, count]) => {
            t += `  - ${len} ม. × ${count} เส้น\n`;
          });
        }
      });
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
    t += SEP + '\n🔩 *รายการสั่งซื้อ อุปกรณ์ (Hardware)*\n';
    t += hwLines.join('\n') + '\n';
    if (acc.oversizeWave.length > 0) {
      t += `  ⚠️ ม่านลอนรางยาวเกินมาตรฐาน (ควรแยกราง/เพิ่มขาค้ำ): `;
      t += acc.oversizeWave.map((o) => `${o.roomName} ${o.width.toFixed(2)} ม.`).join(', ') + '\n';
    }
    t += '\n';
  }

  // --- วอลเปเปอร์ ---
  if (m.wallpapersByCode.size > 0) {
    t += SEP + '\n🎨 *รายการสั่งซื้อ (Wallpaper)*\n';
    m.wallpapersByCode.forEach((data, code) => {
      t += `\n• รหัส: #${code} · รวม: ${data.total} ม้วน\n`;
      data.entries.forEach((e) => {
        t += `  - ${e.roomName}: ${e.desc} = ${e.rolls} ม้วน\n`;
      });
    });
  }

  // --- พื้นที่ (มู่ลี่ / ฉาก / มุ้ง) ---
  if (m.areaByKey.size > 0) {
    t += SEP + '\n📦 *รายการสั่งซื้อ (มู่ลี่/ฉาก/มุ้ง)*\n';
    m.areaByKey.forEach((group) => {
      const totalArea = group.unit === 'ตร.ม.' ? group.totalSqm : group.totalSqyd;
      t += `\n• ${group.typeName}${group.code ? ` · รหัส: #${group.code}` : ''}\n`;
      t += `  รวม: ${totalArea.toFixed(2)} ${group.unit}\n`;
      group.entries.forEach((e) => {
        t += `  - ${e.roomName}: ${fmtSize(e.width, e.height)}\n`;
      });
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
    t += SEP + '\n📦 *รายการรื้อถอน/ค่าแรง*\n';
    removals.forEach(({ room, item }, i) => {
      if (!isRemovalItem(item)) return;
      const price = PricingEngine.calculatePrice(item);
      t += `\n• #${i + 1}: ${item.description || 'ไม่ระบุ'} (ห้อง: ${room})\n`;
      t += `  จำนวน: ${toNum(item.quantity)} หน่วย · ราคา: ${fmtTH(price)} บาท\n`;
      if (item.notes) t += `  📝 หมายเหตุ: ${item.notes}\n`;
    });
    t += '\n';
  }

  t += SEP + '\n';
  return t;
}

// ─── 4. สั่งราง (ผู้ผลิต) ─────────────────────────────────────────────────────
//
// คอลัมน์ตามใบสั่งผู้ผลิต: ขนาด · จำนวน · สไลด์ · ลูกล้อ/จำนวนตัว · (ผ้า/ชุด) · ขาจับ(ชั้น)
// แยกชนิดรางตามสไตล์ม่าน:
//   • ลอน → TES101 (เทป14.5): ลูกล้อ N=2·round(W/26.5)+2 · ผ้า/ชุด=T/6+0.27 (waveHardware)
//   • จีบ → LTL-101 ราง M (โซ่10ซม.): ลูกล้อ/ฝั่ง=round(Wซม./20) · เก็บข้าง=round(Wซม./10)
//   • พับ → U-2 รางม่านพับ: จำนวนตัว=ceil(กว้างเมตร/0.40)
// ขาจับ = จำนวนชั้นผ้า (ทึบ&โปร่ง=2ชั้น). ม่านลอนไม่มีตะขอสั้น/ยาว

// ลูกล้อ LTL-101 (ราง M, โซ่ 10 ซม.) — ตารางบิลจริงก่อน, ที่เหลือใช้สูตร round(Wซม./20)
const LTL101_PERSIDE: Record<number, number> = {
  180: 9,
  220: 11,
  230: 12,
  270: 14,
  280: 14,
  305: 16,
  320: 16,
  420: 21,
};

function ltl101Rollers(wCm: number, oneWay: boolean): string {
  if (oneWay) return `${Math.round(wCm / 10)}`;
  const perSide = LTL101_PERSIDE[Math.round(wCm)] ?? Math.round(wCm / 20);
  return `${perSide}+${perSide}`;
}

/** ลูกล้อ ม่านลอน "N+N"/"N" (TES101) — จาก waveHardware */
function waveRollers(it: RailItem): string {
  if (it.rollersPerPanel <= 0) return '-';
  return it.wavePanels === 1
    ? `${it.rollersPerPanel}`
    : `${it.rollersPerPanel}+${it.rollersPerPanel}`;
}

/** ค่าคอลัมน์ "ลูกล้อ/จำนวนตัว" ตามชนิดราง */
function railUnit(it: RailItem): string {
  const wCm = Math.round(it.width * 100);
  const oneWay = it.opening === 'เก็บข้างเดียว';
  if (it.style === 'ลอน') return waveRollers(it);
  if (it.style === 'จีบ') return ltl101Rollers(wCm, oneWay);
  if (it.style === 'พับ') return `${Math.ceil(it.width / 0.4)}`;
  return '-';
}

// หัวคอลัมน์ "ลูกล้อ/จำนวนตัว" ต่อชนิดราง (ไม่อยู่ในแมป = ไม่โชว์คอลัมน์นี้)
const RAIL_UNIT_HEADER: Record<string, string> = {
  rail_wave: 'ลูกล้อ',
  rail_pleated: 'ลูกล้อ',
  rail_roman: 'จำนวนตัว',
};

/** สไลด์: แยก (สองทาง) / ข้าง (เก็บข้างเดียว) */
function railSlide(it: RailItem): string {
  return it.opening === 'เก็บข้างเดียว' ? 'ข้าง' : 'แยก';
}

/** ขาจับ = จำนวนชั้นผ้า (ทึบ&โปร่ง = 2 ชั้น) */
function railLayer(it: RailItem): string {
  return it.isDouble ? '2ชั้น' : '1ชั้น';
}

interface RailRow {
  sizeCm: number;
  qty: number; // จำนวนชุดม่าน
  layers: number; // 1 = ชั้นเดียว, 2 = ทึบ+โปร่ง (ใช้ราง 2 เส้น/ชุด)
  brackets: number; // จำนวนขาจับ = ceil(กว้าง/0.6) (เท่ากันทั้ง 1ชั้น/2ชั้น)
  slide: string;
  unit: string;
  fabric: string;
  layer: string; // ป้ายชั้น "1ชั้น"/"2ชั้น"
}

function railOrderSummary(input: SummaryInput, format: RailFormat): string {
  let t = header(input, false);
  const m = buildSummary(input.rooms);

  if (m.railsByKey.size === 0) {
    return t + '\nไม่มีรายการรางสำหรับสั่งผลิต\n' + SEP + '\n';
  }

  const isShort = format === 'short';
  t += '\n🛤️ *รายการสั่งราง (ผู้ผลิต)*\n';

  m.railsByKey.forEach((rail, railKey) => {
    const isWave = railKey === 'rail_wave'; // ผ้า/ชุด เฉพาะม่านลอน
    const unitHeader = RAIL_UNIT_HEADER[railKey]; // undefined = ไม่โชว์ลูกล้อ/จำนวนตัว

    // แยกตามสีราง — แต่ละสี = สินค้าคนละรหัส (เช่น TES103 ไม้สัก vs TES101 ขาว)
    groupByColor(rail.items).forEach((items, color) => {
      const productName = railProductName(railKey, color) ?? rail.label;

      // รวมแถวที่เหมือนกัน (ขนาด+สไลด์+ลูกล้อ+ผ้า/ชุด+ชั้น) แล้วนับเป็น "ชุด"
      const groups = new Map<string, RailRow>();
      items.forEach((it) => {
        const sizeCm = Math.round(it.width * 100);
        const slide = railSlide(it);
        const unit = unitHeader ? railUnit(it) : '';
        const fabric = isWave && it.fabricYards > 0 ? it.fabricYards.toFixed(2) : '';
        const layer = railLayer(it);
        const layers = it.isDouble ? 2 : 1; // ทึบ+โปร่ง = 2 เส้น/ชุด
        const brackets = Math.ceil(it.width / FORMULAS.materials.rail_bracket_spacing); // 1 ขา/0.6 ม. (2ชั้นเท่าเดิม) — ตรงกับ buildSummary
        const key = `${sizeCm}|${slide}|${unit}|${fabric}|${layer}`;
        const g = groups.get(key) ?? { sizeCm, qty: 0, layers, brackets, slide, unit, fabric, layer };
        g.qty += 1;
        groups.set(key, g);
      });

      const rows = [...groups.values()].sort((a, b) => b.sizeCm - a.sizeCm);
      const totalRails = rows.reduce((s, r) => s + r.qty * r.layers, 0);

      // 1 บรรทัด/รายการ — LINE ตัดบรรทัดเองได้ ไม่ต้องพึ่ง monospace
      t += SEP + '\n';
      t += `🛤️ ${productName}\n`;
      rows.forEach((r, i) => {
        if (isShort) {
          // แบบย่อ: ขนาด × จำนวนเส้น (ชุด×ชั้น) · สไลด์ · ขาจับ(ชั้น)
          t += `${i + 1}) ${r.sizeCm} × ${r.qty * r.layers} เส้น · ${r.slide} · ขาจับ (${r.layer})\n`;
          return;
        }
        let line = `${i + 1}) ${r.sizeCm} ซม. ×${r.qty} · ${r.slide}`;
        if (unitHeader) line += ` · ${unitHeader} ${r.unit}`;
        if (isWave && r.fabric) line += ` · ผ้า ${r.fabric} หลา`;
        line += ` · ขาจับ ${r.brackets} (${r.layer})`;
        t += line + '\n';
      });
      t += `👉 รวมรางที่ต้องสั่ง: ${totalRails} เส้น\n`;
    });
  });

  t +=
    SEP +
    '\n' +
    (isShort
      ? 'ℹ️ ขนาด=ซม. · เส้น=จำนวนรางที่ตัด · ขาจับ (ชั้นผ้า)\n'
      : 'ℹ️ ขนาด=ซม. · ลูกล้อ N+N=สองตับ · ผ้า/ชุด=หลา · ขาจับ (จำนวน, ชั้นผ้า)\n');
  return t;
}

// ─── Entry ──────────────────────────────────────────────────────────────────

export function generateSummaryText(
  input: SummaryInput,
  type: SummaryType,
  railFormat: RailFormat = 'detailed'
): string {
  switch (type) {
    case 'customer':
      return customerSummary(input);
    case 'seamstress':
      return seamstressSummary(input);
    case 'purchase_order':
      return purchaseOrderSummary(input);
    case 'rail_order':
      return railOrderSummary(input, railFormat);
    default:
      return '';
  }
}
