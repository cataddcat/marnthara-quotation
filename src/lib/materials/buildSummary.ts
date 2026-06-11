// src/lib/materials/buildSummary.ts
// ════════════════════════════════════════════════════════════════════════════
// 📦 ตัวรวมวัสดุ (Material aggregator) — pure function
// แยกออกจาก MaterialSummaryModal เพื่อให้ใช้ร่วมกับตัวสร้างข้อความสรุป (summaryGenerator)
// โดยคงพฤติกรรม/สูตรเดิม 100% (single source of truth กับ "คลังต้นทุน")
// ════════════════════════════════════════════════════════════════════════════

import { PricingEngine } from '@/lib/pricing/PricingEngine';
import { ITEM_TYPES, LAYER_MODES } from '@/config/enums';
import { ITEM_CONFIG } from '@/config/constants';
import { toNum, fmtSize } from '@/utils/formatters';
import { FORMULAS } from '@/config/formulas';
import type { Room, CurtainItemInput, WallpaperItemInput, AreaItemInput } from '@/types';
import { isSqmPriced } from '@/lib/vault';
import { calcWaveHardware, waveSplitFromOpening } from './waveHardware';

// ─── Constants ────────────────────────────────────────────────────────────────

export const STYLE_TO_RAIL: Record<string, string> = {
  ลอน: 'rail_wave',
  จีบ: 'rail_pleated',
  ตาไก่: 'rail_eyelet',
  พับ: 'rail_roman',
  แป๊บ: 'rail_rod',
  หลุยส์: 'rail_louis',
};

export const RAIL_LABELS: Record<string, string> = {
  rail_wave: 'รางม่านลอน (Wave)',
  rail_pleated: 'รางม่านจีบ (ราง M)',
  rail_eyelet: 'รางม่านตาไก่ (รางโชว์)',
  rail_roman: 'ชุดรางม่านพับ (Roman)',
  rail_rod: 'ราวม่านแป๊บ (ราวสอด)',
  rail_louis: 'ราง/กล่อง ม่านหลุยส์',
};

const STYLE_LAYER_LABEL: Record<string, string> = {
  main: 'ทึบ',
  sheer: 'โปร่ง',
  double: 'ทึบ+โปร่ง',
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FabricEntry {
  code: string;
  yards: number;
  roomId: string;
  roomName: string;
  itemId: string;
  /** legacy concatenated line — still used by summaryGenerator copy-text + useCodeUsage */
  desc: string;
  // structured fields for the colour-coded UsageRow (MaterialSummaryModal)
  style: string;
  width: number;
  height: number;
  layerLabel: string;
}

export interface RailItem {
  railKey: string;
  width: number;
  isDouble: boolean;
  roomName: string;
  style: string;
  opening: string;
  /** สีราง (จาก item.rail_color) — ใช้แมปรหัสสินค้าในใบสั่งราง */
  railColor?: string;
  /** รหัส SKU รางที่เลือกจาก catalog (item.rail_code) — โชว์ในใบสั่งราง */
  railCode?: string;
  brackets: number;
  eyelets: number;
  pinHooks: number;
  waveTapeM: number;
  romanSets: number;
  // ── ม่านลอน: ลูกล้อ/กระดุม (เฉพาะ style 'ลอน') ──
  rollers: number; // ลูกล้อรวม (T)
  rollersPerPanel: number; // ลูกล้อต่อตับ (N₁ สำหรับ two-way, T สำหรับ one-way)
  wavePanels: number; // จำนวนตับ (1 = เก็บข้างเดียว, 2 = แยกกลาง)
  snaps: number; // กระดุม/สแน็ป (= T)
  fabricYards: number; // ผ้า/ชุด (หลา) สำหรับใบสั่งราง = T/6 + 0.27 (ลอนเท่านั้น)
}

export interface AreaGroup {
  costKey: string;
  type: string;
  typeName: string;
  code?: string;
  unit: 'ตร.ม.' | 'ตร.ล.';
  totalSqm: number;
  totalSqyd: number;
  entries: {
    roomId: string;
    roomName: string;
    itemId: string;
    sqm: number;
    sqyd: number;
    width: number;
    height: number;
  }[];
}

// ─── Calculation helpers ──────────────────────────────────────────────────────

// Material formulas — อ่านค่าจาก src/config/formulas.ts (single source of truth)

function calcBrackets(widthM: number, isDouble: boolean, style: string): number {
  const { bracket_spacing, bracket_double_multiplier, rail_bracket_spacing } = FORMULAS.materials;
  // ม่านลอน: สูตรใบสั่งราง (1 ขา/0.6 ม., 2 ชั้นใช้เท่าเดิม) — ตรงกับ summaryGenerator
  if (style === 'ลอน') return Math.ceil(widthM / rail_bracket_spacing);
  const base = Math.ceil(widthM / bracket_spacing) + 1;
  return isDouble ? Math.ceil(base * bracket_double_multiplier) : base;
}

function calcEyelets(widthM: number): number {
  return Math.ceil((widthM * FORMULAS.curtain.multiplier_eyelet) / FORMULAS.materials.eyelet_spacing);
}

function calcPinHooks(widthM: number): number {
  const { pin_spacing, pin_extra } = FORMULAS.materials;
  return Math.ceil((widthM * FORMULAS.curtain.multiplier_pleated) / pin_spacing) + pin_extra;
}

function calcWaveTape(widthM: number): number {
  return Math.round(widthM * FORMULAS.curtain.multiplier_wave * 10) / 10;
}

// ─── Main calculation ─────────────────────────────────────────────────────────

export function buildSummary(rooms: Room[]) {
  const fabricsByCode = new Map<string, { total: number; entries: FabricEntry[] }>();
  const sheersByCode = new Map<string, { total: number; entries: FabricEntry[] }>();
  const wallpapersByCode = new Map<
    string,
    {
      total: number;
      entries: {
        rolls: number;
        roomId: string;
        roomName: string;
        itemId: string;
        desc: string;
        // structured fields for the colour-coded UsageRow (MaterialSummaryModal)
        wallWidth: number;
        height: number;
      }[];
    }
  >();
  const railsByKey = new Map<
    string,
    { label: string; totalLength: number; totalSets: number; items: RailItem[] }
  >();
  const areaByKey = new Map<string, AreaGroup>();

  const acc = {
    brackets: 0,
    eyelets: 0,
    pinHooks: 0,
    waveTapeM: 0,
    romanSets: 0,
    rollers: 0, // ลูกล้อ ม่านลอน
    snaps: 0, // กระดุม/สแน็ป ม่านลอน
    oversizeWave: [] as { roomName: string; width: number }[], // รางลอน > max_track_cm
  };

  rooms.forEach((room) => {
    if (room.is_suspended) return;

    room.items.forEach((item) => {
      if (item.is_suspended) return;

      // ── CURTAIN ────────────────────────────────────────────────────────────
      if (item.type === ITEM_TYPES.CURTAIN) {
        const c = item as CurtainItemInput & { type: typeof ITEM_TYPES.CURTAIN; id: string };
        const width = toNum(c.width_m);
        const height = toNum(c.height_m);
        if (width <= 0) return;

        const breakdown = PricingEngine.calculateDetailedPrice(item).breakdown;
        const fabricYards = breakdown?.fabricYards ?? 0;
        const sheerYards = breakdown?.sheerYards ?? 0;
        const style = c.style || 'ลอน';
        const layerMode = c.layer_mode || LAYER_MODES.MAIN;
        const isDouble = layerMode === LAYER_MODES.DOUBLE;
        const isSheerOnly = layerMode === LAYER_MODES.SHEER;
        const waveSplit = waveSplitFromOpening(c.opening_style);
        const opening = waveSplit === 'one-way' ? 'เก็บข้างเดียว' : 'แยกกลาง';
        const layerLabel = STYLE_LAYER_LABEL[layerMode] || layerMode;
        const desc = `${style} ${fmtSize(width, height)} (${layerLabel})`;

        if (!isSheerOnly && fabricYards > 0) {
          const code = c.code || '(ไม่ระบุรหัส)';
          const existing = fabricsByCode.get(code) ?? { total: 0, entries: [] };
          existing.total += fabricYards;
          existing.entries.push({
            code,
            yards: fabricYards,
            roomId: room.id,
            roomName: room.name,
            itemId: c.id,
            desc,
            style,
            width,
            height,
            layerLabel,
          });
          fabricsByCode.set(code, existing);
        }

        if ((isDouble || isSheerOnly) && sheerYards > 0) {
          const code = c.sheer_code || '(ไม่ระบุรหัสโปร่ง)';
          const existing = sheersByCode.get(code) ?? { total: 0, entries: [] };
          existing.total += sheerYards;
          existing.entries.push({
            code,
            yards: sheerYards,
            roomId: room.id,
            roomName: room.name,
            itemId: c.id,
            desc,
            style,
            width,
            height,
            layerLabel,
          });
          sheersByCode.set(code, existing);
        }

        const railKey = STYLE_TO_RAIL[style] || 'rail_wave';
        const isRoman = style === 'พับ';
        const itemBrackets = isRoman ? 0 : calcBrackets(width, isDouble, style);
        const itemEyelets = style === 'ตาไก่' ? calcEyelets(width) : 0;
        const itemPinHooks = style === 'จีบ' ? calcPinHooks(width) : 0;
        const itemWaveTape = style === 'ลอน' ? calcWaveTape(width) : 0;
        const itemRomanSets = isRoman ? 1 : 0;
        // ม่านลอน: ลูกล้อ/กระดุม ตามความยาวราง (width ม. → ซม.)
        const waveHw = style === 'ลอน' ? calcWaveHardware(width * 100, waveSplit) : null;

        const railEntry = railsByKey.get(railKey) ?? {
          label: RAIL_LABELS[railKey] || railKey,
          totalLength: 0,
          totalSets: 0,
          items: [],
        };
        if (isRoman) {
          railEntry.totalSets += 1;
        } else {
          railEntry.totalLength += width;
        }
        railEntry.items.push({
          railKey,
          width,
          isDouble,
          roomName: room.name,
          style,
          opening,
          railColor: c.rail_color,
          railCode: c.rail_code,
          brackets: itemBrackets,
          eyelets: itemEyelets,
          pinHooks: itemPinHooks,
          waveTapeM: itemWaveTape,
          romanSets: itemRomanSets,
          rollers: waveHw?.totalRollers ?? 0,
          rollersPerPanel: waveHw?.rollersPerPanel ?? 0,
          wavePanels: waveHw?.panels ?? 0,
          snaps: waveHw?.snaps ?? 0,
          fabricYards: waveHw?.fabricYards ?? 0,
        });
        railsByKey.set(railKey, railEntry);
        acc.brackets += itemBrackets;
        acc.eyelets += itemEyelets;
        acc.pinHooks += itemPinHooks;
        acc.waveTapeM += itemWaveTape;
        acc.romanSets += itemRomanSets;
        acc.rollers += waveHw?.totalRollers ?? 0;
        acc.snaps += waveHw?.snaps ?? 0;
        if (waveHw?.oversize) acc.oversizeWave.push({ roomName: room.name, width });
      }

      // ── WALLPAPER ──────────────────────────────────────────────────────────
      else if (item.type === ITEM_TYPES.WALLPAPER) {
        const w = item as WallpaperItemInput & { type: typeof ITEM_TYPES.WALLPAPER; id: string };
        const breakdown = PricingEngine.calculateDetailedPrice(item).breakdown;
        const rolls = breakdown?.rolls ?? 0;
        if (rolls > 0) {
          const code = w.wallpaper_code || '(ไม่ระบุรหัส)';
          const totalWidth = w.widths.reduce((s, x) => s + toNum(x), 0);
          const desc = `ผนัง ${totalWidth.toFixed(1)} ม. × สูง ${toNum(w.height_m).toFixed(1)} ม.`;
          const existing = wallpapersByCode.get(code) ?? { total: 0, entries: [] };
          existing.total += rolls;
          existing.entries.push({
            rolls,
            roomId: room.id,
            roomName: room.name,
            itemId: w.id,
            desc,
            wallWidth: totalWidth,
            height: toNum(w.height_m),
          });
          wallpapersByCode.set(code, existing);
        }
      }

      // ── AREA ITEMS (blinds, partition, screen) ────────────────────────────
      else if (item.type !== ITEM_TYPES.REMOVAL) {
        const a = item as AreaItemInput & { type: string; id: string };
        const width = toNum(a.width_m);
        const height = toNum(a.height_m);
        if (width > 0 && height > 0) {
          const typeName = ITEM_CONFIG[item.type as keyof typeof ITEM_CONFIG]?.name || item.type;
          const code = a.code || undefined;
          const costKey = code || item.type;
          // หน่วยต่อประเภทจาก vault.ts (single source — ตรงกับ AreaStrategy/CostEngine)
          const unit: 'ตร.ม.' | 'ตร.ล.' = isSqmPriced(item.type) ? 'ตร.ม.' : 'ตร.ล.';

          const sqm = width * height;
          const breakdown = PricingEngine.calculateDetailedPrice(item).breakdown;
          const sqyd = breakdown?.areaSqyd ?? sqm * 1.2;

          const existing = areaByKey.get(costKey) ?? {
            costKey,
            type: item.type,
            typeName,
            code,
            unit,
            totalSqm: 0,
            totalSqyd: 0,
            entries: [],
          };
          existing.totalSqm += sqm;
          existing.totalSqyd += sqyd;
          existing.entries.push({
            roomId: room.id,
            roomName: room.name,
            itemId: a.id,
            sqm,
            sqyd,
            width,
            height,
          });
          areaByKey.set(costKey, existing);
        }
      }
    });
  });

  return { fabricsByCode, sheersByCode, wallpapersByCode, railsByKey, areaByKey, acc };
}

export type MaterialSummary = ReturnType<typeof buildSummary>;
