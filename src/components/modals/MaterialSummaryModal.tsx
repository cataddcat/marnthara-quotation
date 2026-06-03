import React, { useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useAppStore } from '@/store/useAppStore';
import { useUIStore } from '@/store/useUIStore';
import { PricingEngine } from '@/lib/pricing/PricingEngine';
import { ITEM_TYPES, LAYER_MODES, FAVORITE_CATEGORIES } from '@/config/enums';
import { ITEM_CONFIG } from '@/config/constants';
import { toNum, fmtTH } from '@/utils/formatters';
import { cn } from '@/lib/utils';
import {
  Layers,
  Wrench,
  Package,
  Copy,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  AlertTriangle,
  Info,
  Pencil,
  Plus,
  BookOpen,
  Trash2,
} from 'lucide-react';
import type { CurtainItemInput, WallpaperItemInput, AreaItemInput } from '@/types';
import { useInventory, HydratedInventoryItem } from '@/hooks/useInventory';
import { InventoryItem } from '@/store/slices/InventorySlice';
import { FORMULAS } from '@/config/formulas';
import { calcWaveHardware, waveSplitFromOpening } from '@/lib/materials/waveHardware';

// ─── Constants ────────────────────────────────────────────────────────────────

const STYLE_TO_RAIL: Record<string, string> = {
  ลอน: 'rail_wave',
  จีบ: 'rail_pleated',
  ตาไก่: 'rail_eyelet',
  พับ: 'rail_roman',
  แป๊บ: 'rail_rod',
  หลุยส์: 'rail_louis',
};

const RAIL_LABELS: Record<string, string> = {
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

interface CatalogCategoryDef {
  id: string;
  label: string;
  costUnit: string;
  vault: 'fabric' | 'wallpaper' | 'area';
}

const CATALOG_CATEGORIES: CatalogCategoryDef[] = [
  { id: FAVORITE_CATEGORIES.CURTAIN_MAIN, label: 'ผ้าทึบ', costUnit: 'หลา', vault: 'fabric' },
  { id: FAVORITE_CATEGORIES.CURTAIN_SHEER, label: 'ผ้าโปร่ง', costUnit: 'หลา', vault: 'fabric' },
  { id: FAVORITE_CATEGORIES.WALLPAPER, label: 'วอลเปเปอร์', costUnit: 'ม้วน', vault: 'wallpaper' },
  { id: FAVORITE_CATEGORIES.ROLLER_BLIND, label: 'มู่ลี่ม้วน', costUnit: 'ตร.ล.', vault: 'area' },
  { id: FAVORITE_CATEGORIES.WOODEN_BLIND, label: 'มู่ลี่ไม้', costUnit: 'ตร.ล.', vault: 'area' },
  { id: FAVORITE_CATEGORIES.VERTICAL_BLIND, label: 'มู่ลี่แนวตั้ง', costUnit: 'ตร.ล.', vault: 'area' },
  { id: FAVORITE_CATEGORIES.ALUMINUM_BLIND, label: 'มู่ลี่อลูมิเนียม', costUnit: 'ตร.ล.', vault: 'area' },
  { id: FAVORITE_CATEGORIES.PARTITION, label: 'ฉากกั้นห้อง', costUnit: 'ตร.ล.', vault: 'area' },
  { id: FAVORITE_CATEGORIES.PLEATED_SCREEN, label: 'มุ้งจีบ', costUnit: 'ตร.ม.', vault: 'area' },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface FabricEntry {
  code: string;
  yards: number;
  roomName: string;
  desc: string;
}

interface RailItem {
  railKey: string;
  width: number;
  isDouble: boolean;
  roomName: string;
  style: string;
  opening: string;
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
}

interface AreaGroup {
  costKey: string;
  type: string;
  typeName: string;
  code?: string;
  unit: 'ตร.ม.' | 'ตร.ล.';
  totalSqm: number;
  totalSqyd: number;
  entries: { roomName: string; sqm: number; sqyd: number; width: number; height: number }[];
}

// ─── Calculation helpers ──────────────────────────────────────────────────────

// Material formulas — อ่านค่าจาก src/config/formulas.ts (single source of truth)

function calcBrackets(widthM: number, isDouble: boolean): number {
  const { bracket_spacing, bracket_double_multiplier } = FORMULAS.materials;
  const base = Math.ceil(widthM / bracket_spacing) + 1;
  return isDouble ? Math.ceil(base * bracket_double_multiplier) : base;
}

function calcEyelets(widthM: number): number {
  return Math.ceil((widthM * FORMULAS.curtain.multiplier_wave) / FORMULAS.materials.eyelet_spacing);
}

function calcPinHooks(widthM: number): number {
  const { pin_spacing, pin_extra } = FORMULAS.materials;
  return Math.ceil((widthM * FORMULAS.curtain.multiplier_pleated) / pin_spacing) + pin_extra;
}

function calcWaveTape(widthM: number): number {
  return Math.round(widthM * FORMULAS.curtain.multiplier_wave * 10) / 10;
}

// ─── Main calculation ─────────────────────────────────────────────────────────

function buildSummary(rooms: ReturnType<typeof useAppStore.getState>['rooms']) {
  const fabricsByCode = new Map<string, { total: number; entries: FabricEntry[] }>();
  const sheersByCode = new Map<string, { total: number; entries: FabricEntry[] }>();
  const wallpapersByCode = new Map<
    string,
    { total: number; entries: { rolls: number; roomName: string; desc: string }[] }
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
        const desc = `${style} ${width.toFixed(1)}×${height.toFixed(1)}ม. (${layerLabel})`;

        if (!isSheerOnly && fabricYards > 0) {
          const code = c.code || '(ไม่ระบุรหัส)';
          const existing = fabricsByCode.get(code) ?? { total: 0, entries: [] };
          existing.total += fabricYards;
          existing.entries.push({ code, yards: fabricYards, roomName: room.name, desc });
          fabricsByCode.set(code, existing);
        }

        if ((isDouble || isSheerOnly) && sheerYards > 0) {
          const code = c.sheer_code || '(ไม่ระบุรหัสโปร่ง)';
          const existing = sheersByCode.get(code) ?? { total: 0, entries: [] };
          existing.total += sheerYards;
          existing.entries.push({ code, yards: sheerYards, roomName: room.name, desc });
          sheersByCode.set(code, existing);
        }

        const railKey = STYLE_TO_RAIL[style] || 'rail_wave';
        const isRoman = style === 'พับ';
        const itemBrackets = isRoman ? 0 : calcBrackets(width, isDouble);
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
          railKey, width, isDouble, roomName: room.name, style, opening,
          brackets: itemBrackets, eyelets: itemEyelets, pinHooks: itemPinHooks,
          waveTapeM: itemWaveTape, romanSets: itemRomanSets,
          rollers: waveHw?.totalRollers ?? 0,
          rollersPerPanel: waveHw?.rollersPerPanel ?? 0,
          wavePanels: waveHw?.panels ?? 0,
          snaps: waveHw?.snaps ?? 0,
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
          existing.entries.push({ rolls, roomName: room.name, desc });
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
          const isPleated = item.type === ITEM_TYPES.PLEATED_SCREEN;
          const unit: 'ตร.ม.' | 'ตร.ล.' = isPleated ? 'ตร.ม.' : 'ตร.ล.';

          const sqm = width * height;
          const breakdown = PricingEngine.calculateDetailedPrice(item).breakdown;
          const sqyd = breakdown?.areaSqyd ?? sqm * 1.20;

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
          existing.entries.push({ roomName: room.name, sqm, sqyd, width, height });
          areaByKey.set(costKey, existing);
        }
      }
    });
  });

  return { fabricsByCode, sheersByCode, wallpapersByCode, railsByKey, areaByKey, acc };
}

// ─── Shared empty state ───────────────────────────────────────────────────────

const EmptyHint = ({ message, sub }: { message: string; sub: string }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
    <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
      <Package className="w-6 h-6 text-muted-foreground opacity-40" />
    </div>
    <div>
      <p className="font-semibold text-foreground">{message}</p>
      <p className="text-sm text-muted-foreground mt-1">{sub}</p>
    </div>
  </div>
);

// ─── Inline cost editor ───────────────────────────────────────────────────────

const InlineCostEditor = ({
  value,
  onSave,
  unit,
}: {
  value: number;
  onSave: (v: number) => void;
  unit: string;
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const startEdit = () => {
    setDraft(value > 0 ? String(value) : '');
    setEditing(true);
  };

  const save = () => {
    const n = parseFloat(draft);
    onSave(isNaN(n) ? 0 : n);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-xs text-muted-foreground">฿</span>
        <input
          type="number"
          inputMode="decimal"
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
            if (e.key === 'Escape') setEditing(false);
          }}
          className="w-20 text-sm font-mono border-b border-primary bg-transparent focus:outline-none text-right"
        />
        <span className="text-[10px] text-muted-foreground">/{unit}</span>
      </div>
    );
  }

  return (
    <button
      onClick={startEdit}
      className={cn(
        'flex items-center gap-1 shrink-0 rounded px-1.5 py-0.5 transition-colors hover:bg-muted/50',
        value > 0
          ? 'text-emerald-600 dark:text-emerald-400'
          : 'text-muted-foreground/50 hover:text-muted-foreground'
      )}
    >
      {value > 0 ? (
        <>
          <span className="text-sm font-mono font-semibold">฿{fmtTH(value)}</span>
          <span className="text-[10px] text-muted-foreground/70">/{unit}</span>
          <Pencil className="w-2.5 h-2.5 opacity-40" />
        </>
      ) : (
        <>
          <Plus className="w-3 h-3" />
          <span className="text-xs italic">ตั้งราคาทุน</span>
        </>
      )}
    </button>
  );
};

// ─── Catalog sub-components ───────────────────────────────────────────────────

const InventoryItemRow = ({
  item,
  cost,
  costUnit,
  onCostSave,
  onUpdate,
  onRemove,
}: {
  item: HydratedInventoryItem;
  cost: number;
  costUnit: string;
  onCostSave: (code: string, cost: number) => void;
  onUpdate: (updates: Partial<InventoryItem>) => void;
  onRemove: () => void;
}) => {
  const [editing, setEditing] = useState(false);
  const [draftCode, setDraftCode] = useState('');
  const [draftPrice, setDraftPrice] = useState('');
  const [draftNote, setDraftNote] = useState('');
  const [confirmDel, setConfirmDel] = useState(false);

  const startEdit = () => {
    setDraftCode(item.code);
    setDraftPrice(item.default_price_per_m > 0 ? String(item.default_price_per_m) : '');
    setDraftNote(item.note || '');
    setEditing(true);
  };

  const save = () => {
    onUpdate({
      code: draftCode.trim().toUpperCase(),
      default_price_per_m: parseFloat(draftPrice) || 0,
      note: draftNote.trim() || undefined,
    });
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="p-3 bg-muted/30 rounded-xl border border-primary/30 space-y-2">
        <input
          autoFocus
          value={draftCode}
          onChange={(e) => setDraftCode(e.target.value.toUpperCase())}
          placeholder="รหัสสินค้า"
          className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary font-mono"
        />
        <input
          type="number"
          inputMode="decimal"
          value={draftPrice}
          onChange={(e) => setDraftPrice(e.target.value)}
          placeholder="ราคาขาย / ม."
          className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <input
          value={draftNote}
          onChange={(e) => setDraftNote(e.target.value)}
          placeholder="หมายเหตุ (ไม่บังคับ)"
          className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => setEditing(false)}
            className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
          >
            ยกเลิก
          </button>
          <button
            onClick={save}
            className="px-4 py-1.5 text-xs bg-primary text-primary-foreground rounded-lg font-medium"
          >
            บันทึก
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2 px-3 py-2.5 bg-card border border-border/50 rounded-xl">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-mono font-bold text-sm text-foreground">{item.code}</span>
          {cost > 0 && (
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
              ทุน ฿{fmtTH(cost)}/{costUnit}
            </span>
          )}
        </div>
        {item.default_price_per_m > 0 && (
          <div className="text-[10px] text-muted-foreground mt-0.5">
            ราคา ฿{fmtTH(item.default_price_per_m)}/ม.
          </div>
        )}
        {item.note && (
          <div className="text-[10px] text-muted-foreground/60 truncate">{item.note}</div>
        )}
        <div className="mt-1.5">
          <InlineCostEditor
            value={cost}
            onSave={(v) => onCostSave(item.code, v)}
            unit={costUnit}
          />
        </div>
      </div>
      <div className="flex items-center gap-1 pt-0.5 shrink-0">
        <button
          onClick={startEdit}
          className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        {confirmDel ? (
          <button
            onClick={onRemove}
            className="px-2 py-1 text-[10px] bg-destructive text-destructive-foreground rounded-lg font-medium"
          >
            ยืนยัน
          </button>
        ) : (
          <button
            onClick={() => setConfirmDel(true)}
            onBlur={() => setTimeout(() => setConfirmDel(false), 200)}
            className="p-1.5 text-muted-foreground hover:text-destructive rounded-lg hover:bg-muted/50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

const CatalogCategoryView = ({
  categoryId,
  costUnit,
  vault,
}: {
  categoryId: string;
  costUnit: string;
  vault: 'fabric' | 'wallpaper' | 'area';
}) => {
  const { items, addItem, updateItem, removeItem } = useInventory(categoryId);
  const fabricCosts = useAppStore((s) => s.fabricCosts);
  const wallpaperCosts = useAppStore((s) => s.wallpaperCosts);
  const areaCosts = useAppStore((s) => s.areaCosts);
  const updateFabricCost = useAppStore((s) => s.updateFabricCost);
  const updateWallpaperCost = useAppStore((s) => s.updateWallpaperCost);
  const updateAreaCost = useAppStore((s) => s.updateAreaCost);

  const [adding, setAdding] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newNote, setNewNote] = useState('');

  const getCost = (code: string): number => {
    if (vault === 'wallpaper') return wallpaperCosts[code] ?? 0;
    if (vault === 'area') return areaCosts[code] ?? 0;
    return fabricCosts[code] ?? 0;
  };

  const saveCost = (code: string, cost: number) => {
    if (vault === 'wallpaper') updateWallpaperCost(code, cost);
    else if (vault === 'area') updateAreaCost(code, cost);
    else updateFabricCost(code, cost);
  };

  const handleAdd = () => {
    if (!newCode.trim()) return;
    addItem({
      code: newCode.trim().toUpperCase(),
      default_price_per_m: parseFloat(newPrice) || 0,
      note: newNote.trim() || undefined,
    });
    setNewCode('');
    setNewPrice('');
    setNewNote('');
    setAdding(false);
  };

  return (
    <div>
      {items.length === 0 && !adding && (
        <EmptyHint message="ยังไม่มีรหัสในหมวดนี้" sub="เพิ่มรหัสสินค้าเพื่อบันทึกรายการ" />
      )}

      <div className="space-y-2">
        {items.map((item) => (
          <InventoryItemRow
            key={item.id}
            item={item}
            cost={getCost(item.code)}
            costUnit={costUnit}
            onCostSave={saveCost}
            onUpdate={(updates) => updateItem(item.id, updates)}
            onRemove={() => removeItem(item.id)}
          />
        ))}
      </div>

      {adding ? (
        <div className="mt-3 p-3 bg-muted/30 rounded-xl border border-border/50 space-y-2">
          <input
            autoFocus
            value={newCode}
            onChange={(e) => setNewCode(e.target.value.toUpperCase())}
            placeholder="รหัสสินค้า (เช่น A01)"
            className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary font-mono"
          />
          <input
            type="number"
            inputMode="decimal"
            value={newPrice}
            onChange={(e) => setNewPrice(e.target.value)}
            placeholder="ราคาขาย / ม."
            className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <input
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="หมายเหตุ (ไม่บังคับ)"
            className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setAdding(false)}
              className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleAdd}
              disabled={!newCode.trim()}
              className="px-4 py-1.5 text-xs bg-primary text-primary-foreground rounded-lg font-medium disabled:opacity-40"
            >
              เพิ่ม
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className={cn(
            'w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm text-muted-foreground',
            'border border-dashed border-border/60',
            'hover:text-foreground hover:border-border hover:bg-muted/20 transition-colors',
            items.length > 0 ? 'mt-3' : 'mt-0'
          )}
        >
          <Plus className="w-4 h-4" />
          เพิ่มรหัสสินค้า
        </button>
      )}
    </div>
  );
};

// ─── Summary sub-components ───────────────────────────────────────────────────

const SectionHeader = ({
  label,
  count,
  unit,
  valueColor,
  totalCost,
}: {
  label: string;
  count: number;
  unit: string;
  valueColor?: string;
  totalCost?: number;
}) => (
  <div className="flex items-center justify-between py-2 border-b border-border/60 mb-2">
    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{label}</span>
    <div className="flex items-center gap-2">
      <span className={cn('text-xs font-mono font-bold', valueColor ?? 'text-muted-foreground')}>
        {fmtTH(count)} {unit}
      </span>
      {totalCost !== undefined && totalCost > 0 && (
        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
          ทุน ฿{fmtTH(totalCost)}
        </span>
      )}
    </div>
  </div>
);

const FabricCard = ({
  code,
  total,
  entries,
  unit,
  accent,
  costLookup,
  onCostSave,
}: {
  code: string;
  total: number;
  entries: FabricEntry[];
  unit: string;
  accent: string;
  costLookup: Record<string, number>;
  onCostSave: (code: string, cost: number) => void;
}) => {
  const [open, setOpen] = useState(false);
  const hasUnknownCode = code.startsWith('(');
  const cost = costLookup[code] ?? 0;
  const totalCost = cost > 0 ? cost * total : 0;

  return (
    <div className="bg-card border border-border/50 rounded-xl overflow-hidden mb-2">
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full px-3 py-2.5 flex items-center gap-2 hover:bg-muted/30 transition-colors"
      >
        <div className="flex-1 text-left min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={cn('font-mono font-bold text-sm', hasUnknownCode ? 'text-muted-foreground' : accent)}>
              {code}
            </span>
            {hasUnknownCode && <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />}
            <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full shrink-0">
              {entries.length} รายการ
            </span>
          </div>
          {totalCost > 0 && (
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">
              ทุนรวม ฿{fmtTH(totalCost)}
            </div>
          )}
        </div>
        <span className={cn('font-mono font-bold text-sm shrink-0', accent)}>
          {fmtTH(total)} {unit}
        </span>
        <ChevronDown className={cn('w-4 h-4 text-muted-foreground/60 transition-transform shrink-0', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="border-t border-border/50 bg-muted/20">
          <div className="px-3 py-2.5 flex items-center justify-between border-b border-border/30">
            <span className="text-xs text-muted-foreground font-medium">ราคาทุนต่อหน่วย</span>
            <InlineCostEditor
              value={cost}
              onSave={(v) => onCostSave(code, v)}
              unit={unit}
            />
          </div>
          <div className="px-3 py-2 space-y-1">
            {entries.map((e, i) => (
              <div key={i} className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-1 h-1 rounded-full bg-muted-foreground/40 shrink-0" />
                  <span className="text-muted-foreground truncate">{e.roomName}</span>
                  <span className="text-muted-foreground/60 truncate">· {e.desc}</span>
                </div>
                <span className={cn('font-mono shrink-0 ml-2', accent, 'opacity-80')}>
                  {fmtTH(e.yards)} {unit}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const WallpaperCostCard = ({
  code,
  total,
  entries,
}: {
  code: string;
  total: number;
  entries: { rolls: number; roomName: string; desc: string }[];
}) => {
  const [open, setOpen] = useState(false);
  const wallpaperCosts = useAppStore((s) => s.wallpaperCosts);
  const updateWallpaperCost = useAppStore((s) => s.updateWallpaperCost);
  const cost = wallpaperCosts[code] ?? 0;
  const totalCost = cost > 0 ? cost * total : 0;

  return (
    <div className="bg-card border border-border/50 rounded-xl overflow-hidden mb-2">
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full px-3 py-2.5 flex items-center gap-2 hover:bg-muted/30 transition-colors"
      >
        <div className="flex-1 text-left min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-mono font-bold text-sm text-orange-500">{code}</span>
            <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
              {entries.length} รายการ
            </span>
          </div>
          {totalCost > 0 && (
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">
              ทุนรวม ฿{fmtTH(totalCost)}
            </div>
          )}
        </div>
        <span className="font-mono font-bold text-sm text-orange-500 shrink-0">{Math.ceil(total)} ม้วน</span>
        <ChevronDown className={cn('w-4 h-4 text-muted-foreground/60 transition-transform shrink-0', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="border-t border-border/50 bg-muted/20">
          <div className="px-3 py-2.5 flex items-center justify-between border-b border-border/30">
            <span className="text-xs text-muted-foreground font-medium">ราคาทุนต่อม้วน</span>
            <InlineCostEditor
              value={cost}
              onSave={(v) => updateWallpaperCost(code, v)}
              unit="ม้วน"
            />
          </div>
          <div className="px-3 py-2 space-y-1">
            {entries.map((e, i) => (
              <div key={i} className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-1 h-1 rounded-full bg-muted-foreground/40 shrink-0" />
                  <span className="text-muted-foreground truncate">{e.roomName}</span>
                  <span className="text-muted-foreground/60 truncate">· {e.desc}</span>
                </div>
                <span className="font-mono text-orange-500 opacity-80 shrink-0 ml-2">
                  {Math.ceil(e.rolls)} ม้วน
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const AreaCostCard = ({ group }: { group: AreaGroup }) => {
  const [open, setOpen] = useState(false);
  const areaCosts = useAppStore((s) => s.areaCosts);
  const updateAreaCost = useAppStore((s) => s.updateAreaCost);
  const cost = areaCosts[group.costKey] ?? 0;
  const costQty = group.unit === 'ตร.ม.' ? group.totalSqm : group.totalSqyd;
  const totalCost = cost > 0 ? cost * costQty : 0;

  return (
    <div className="bg-card border border-border/50 rounded-xl overflow-hidden mb-2">
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full px-3 py-2.5 flex items-center gap-2 hover:bg-muted/30 transition-colors"
      >
        <div className="flex-1 text-left min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-sm text-foreground">{group.typeName}</span>
            {group.code && (
              <span className="font-mono text-xs text-teal-600 dark:text-teal-400 bg-teal-500/10 px-1.5 py-0.5 rounded-full">
                {group.code}
              </span>
            )}
            <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full shrink-0">
              {group.entries.length} รายการ
            </span>
          </div>
          {totalCost > 0 && (
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">
              ทุนรวม ฿{fmtTH(totalCost)}
            </div>
          )}
        </div>
        <span className="font-mono font-bold text-sm text-teal-600 dark:text-teal-400 shrink-0">
          {fmtTH(costQty)} {group.unit}
        </span>
        <ChevronDown className={cn('w-4 h-4 text-muted-foreground/60 transition-transform shrink-0', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="border-t border-border/50 bg-muted/20">
          <div className="px-3 py-2.5 flex items-center justify-between border-b border-border/30">
            <span className="text-xs text-muted-foreground font-medium">ราคาทุนต่อ{group.unit}</span>
            <InlineCostEditor
              value={cost}
              onSave={(v) => updateAreaCost(group.costKey, v)}
              unit={group.unit}
            />
          </div>
          <div className="px-3 py-2 space-y-1">
            {group.entries.map((e, i) => {
              const entryQty = group.unit === 'ตร.ม.' ? e.sqm : e.sqyd;
              return (
                <div key={i} className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-1 h-1 rounded-full bg-muted-foreground/40 shrink-0" />
                    <span className="text-muted-foreground truncate">{e.roomName}</span>
                    <span className="text-muted-foreground/60 truncate">
                      · {e.width.toFixed(1)}×{e.height.toFixed(1)} ม.
                    </span>
                  </div>
                  <span className="font-mono text-teal-600 dark:text-teal-400 opacity-80 shrink-0 ml-2">
                    {fmtTH(entryQty)} {group.unit}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const RailCard = ({
  railKey, label, totalLength, totalSets, items,
}: {
  railKey: string;
  label: string;
  totalLength: number;
  totalSets: number;
  items: RailItem[];
}) => {
  const [open, setOpen] = useState(false);
  const isRoman = railKey === 'rail_roman';

  return (
    <div className="bg-card border border-border/50 rounded-xl overflow-hidden mb-2">
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-muted/30 transition-colors"
      >
        <div className="flex-1 text-left min-w-0">
          <div className="font-semibold text-sm text-foreground truncate">{label}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">{items.length} ชุด/หน้าต่าง</div>
        </div>
        <div className={cn('font-mono font-bold text-sm shrink-0', isRoman ? 'text-foreground' : 'text-sky-600 dark:text-sky-400')}>
          {isRoman ? `${totalSets} ชุด` : `${fmtTH(totalLength)} ม.`}
        </div>
        <ChevronDown className={cn('w-4 h-4 text-muted-foreground/60 transition-transform shrink-0', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="border-t border-border/50 bg-muted/20 px-3 py-2 space-y-2">
          {items.map((item, i) => (
            <div key={i} className="text-xs space-y-0.5">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">{item.roomName}</span>
                  {item.isDouble && (
                    <span className="text-[9px] bg-primary/10 text-primary px-1 rounded font-bold">2 ชั้น</span>
                  )}
                  <span className="text-muted-foreground/60">· {item.opening}</span>
                </div>
                <span className={cn('font-mono', !isRoman && 'text-sky-600 dark:text-sky-400')}>
                  {isRoman ? '1 ชุด' : `${item.width.toFixed(2)} ม.`}
                </span>
              </div>
              {!isRoman && (
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground/70 pl-2">
                  {item.brackets > 0 && <span>ขาจับ: ~{item.brackets} ชิ้น</span>}
                  {item.eyelets > 0 && <span>ห่วงตาไก่: ~{item.eyelets} วง</span>}
                  {item.pinHooks > 0 && <span>ตะขอจีบ: ~{item.pinHooks} ตัว</span>}
                  {item.waveTapeM > 0 && <span>เทปลอน: ~{item.waveTapeM} ม.</span>}
                  {item.rollers > 0 && (
                    <span>
                      ลูกล้อ:{' '}
                      {item.wavePanels === 2
                        ? `${item.rollersPerPanel}+${item.rollersPerPanel} (=${item.rollers})`
                        : item.rollers}{' '}
                      ตัว
                    </span>
                  )}
                  {item.snaps > 0 && <span>กระดุม: {item.snaps} เม็ด</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const AccRow = ({ label, value, unit, note }: { label: string; value: number; unit: string; note?: string }) => {
  if (value <= 0) return null;
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border/40 last:border-0">
      <div>
        <div className="text-sm font-medium text-foreground">{label}</div>
        {note && <div className="text-[10px] text-muted-foreground mt-0.5">{note}</div>}
      </div>
      <div className="text-right">
        <span className="font-mono font-bold text-sm">~{fmtTH(value)}</span>
        <span className="text-xs text-muted-foreground ml-1">{unit}</span>
      </div>
    </div>
  );
};

// ─── Main Modal ───────────────────────────────────────────────────────────────

interface MaterialSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: string;
  initialCategory?: string;
}

type TabId = 'fabric' | 'rail' | 'accessories' | 'catalog';

export const MaterialSummaryModal: React.FC<MaterialSummaryModalProps> = ({
  isOpen,
  onClose,
  initialTab,
  initialCategory,
}) => {
  const rooms = useAppStore((s) => s.rooms);
  const fabricCosts = useAppStore((s) => s.fabricCosts);
  const updateFabricCost = useAppStore((s) => s.updateFabricCost);
  const addToast = useUIStore((s) => s.addToast);

  const [activeTab, setActiveTab] = useState<TabId>(() => (initialTab as TabId) || 'fabric');
  const [catalogCat, setCatalogCat] = useState(() => initialCategory || CATALOG_CATEGORIES[0].id);
  const [copied, setCopied] = useState(false);

  const summary = useMemo(() => buildSummary(rooms), [rooms]);
  const { fabricsByCode, sheersByCode, wallpapersByCode, railsByKey, areaByKey, acc } = summary;

  const totalFabricYards = [...fabricsByCode.values()].reduce((s, v) => s + v.total, 0);
  const totalSheerYards = [...sheersByCode.values()].reduce((s, v) => s + v.total, 0);
  const totalWallpaperRolls = [...wallpapersByCode.values()].reduce((s, v) => s + v.total, 0);
  const totalRailM = [...railsByKey.values()].reduce((s, v) => s + v.totalLength, 0);

  const fabricTotalCost = [...fabricsByCode.entries()].reduce(
    (s, [code, v]) => s + (fabricCosts[code] ?? 0) * v.total, 0
  );
  const sheerTotalCost = [...sheersByCode.entries()].reduce(
    (s, [code, v]) => s + (fabricCosts[code] ?? 0) * v.total, 0
  );

  const hasMaterial =
    fabricsByCode.size > 0 || sheersByCode.size > 0 || wallpapersByCode.size > 0 || areaByKey.size > 0;
  const hasRail = railsByKey.size > 0;
  const hasAcc =
    acc.brackets > 0 ||
    acc.eyelets > 0 ||
    acc.pinHooks > 0 ||
    acc.waveTapeM > 0 ||
    acc.romanSets > 0 ||
    acc.rollers > 0 ||
    acc.snaps > 0;

  const handleCopy = () => {
    const lines: string[] = ['=== คลังต้นทุน ===', ''];
    if (fabricsByCode.size > 0) {
      lines.push('🧵 ผ้าทึบ');
      fabricsByCode.forEach((v, code) => lines.push(`  ${code}: ${fmtTH(v.total)} หลา`));
    }
    if (sheersByCode.size > 0) {
      lines.push('🌫️ ผ้าโปร่ง');
      sheersByCode.forEach((v, code) => lines.push(`  ${code}: ${fmtTH(v.total)} หลา`));
    }
    if (wallpapersByCode.size > 0) {
      lines.push('🖼️ วอลเปเปอร์');
      wallpapersByCode.forEach((v, code) => lines.push(`  ${code}: ${Math.ceil(v.total)} ม้วน`));
    }
    if (areaByKey.size > 0) {
      lines.push('🪟 มู่ลี่/ฉาก/มุ้ง');
      areaByKey.forEach((g) => lines.push(`  ${g.typeName}${g.code ? ` (${g.code})` : ''}: ${fmtTH(g.totalSqm)} ตร.ม.`));
    }
    if (hasRail) {
      lines.push('', '🚆 ราง');
      railsByKey.forEach((v, key) => {
        if (key === 'rail_roman') lines.push(`  ${v.label}: ${v.totalSets} ชุด`);
        else lines.push(`  ${v.label}: ${fmtTH(v.totalLength)} ม.`);
      });
    }
    if (acc.rollers > 0 || acc.snaps > 0) {
      lines.push('', '🔩 อุปกรณ์ม่านลอน');
      if (acc.rollers > 0) lines.push(`  ลูกล้อ: ${acc.rollers} ตัว`);
      if (acc.snaps > 0) lines.push(`  กระดุม/สแน็ป: ${acc.snaps} เม็ด`);
    }
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true);
      addToast('success', 'คัดลอกรายการแล้ว');
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const TABS: { id: TabId; label: string; icon: React.ElementType; badge?: number }[] = [
    {
      id: 'fabric',
      label: 'วัสดุ',
      icon: Layers,
      badge: fabricsByCode.size + sheersByCode.size + wallpapersByCode.size + areaByKey.size,
    },
    { id: 'rail', label: 'ราง', icon: Package, badge: railsByKey.size },
    {
      id: 'accessories',
      label: 'อุปกรณ์',
      icon: Wrench,
      badge: [acc.brackets, acc.eyelets, acc.pinHooks, acc.waveTapeM, acc.romanSets, acc.rollers, acc.snaps].filter((v) => v > 0).length,
    },
    { id: 'catalog', label: 'คลังรหัส', icon: BookOpen },
  ];

  const activeCatalogDef = CATALOG_CATEGORIES.find((c) => c.id === catalogCat) ?? CATALOG_CATEGORIES[0];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="คลังต้นทุน"
      variant="fullscreen"
      headerAction={
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
        >
          {copied ? <CheckCheck className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'คัดลอกแล้ว' : 'คัดลอก'}</span>
        </button>
      }
    >
      {/* -m-4 escapes Modal's p-4; min-height compensates the 2rem (top+bottom) */}
      <div className="-m-4 flex flex-col sm:flex-row" style={{ minHeight: 'calc(100% + 2rem)' }}>

        {/* ── DESKTOP LEFT SIDEBAR ────────────────────────────────────────── */}
        <nav className="hidden sm:flex sm:flex-col sm:w-44 sm:shrink-0 sm:border-r sm:border-border/50 sm:bg-muted/5 sm:py-3">
          {activeTab === 'catalog' ? (
            <>
              <button
                onClick={() => setActiveTab('fabric')}
                className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                กลับ
              </button>
              <div className="px-4 pt-2 pb-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                หมวดสินค้า
              </div>
              {CATALOG_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCatalogCat(cat.id)}
                  className={cn(
                    'flex items-center px-4 py-2 text-sm transition-colors text-left',
                    catalogCat === cat.id
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </>
          ) : (
            TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium transition-colors',
                  activeTab === tab.id
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                )}
              >
                <tab.icon className="w-4 h-4 shrink-0" />
                <span className="flex-1 text-left">{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className={cn(
                    'text-[9px] px-1.5 py-0.5 rounded-full font-bold',
                    activeTab === tab.id ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                  )}>
                    {tab.badge}
                  </span>
                )}
              </button>
            ))
          )}
        </nav>

        {/* ── CONTENT + MOBILE BOTTOM NAV ─────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">

            {/* ── TAB: วัสดุ ── */}
            {activeTab === 'fabric' && (
              <div className="space-y-5">
                {!hasMaterial && (
                  <EmptyHint message="ไม่มีรายการวัสดุ" sub="เพิ่มสินค้าในโครงการเพื่อดูรายการที่นี่" />
                )}

                {fabricsByCode.size > 0 && (
                  <section>
                    <SectionHeader
                      label={`🧵 ผ้าทึบ (${fabricsByCode.size} รหัส)`}
                      count={totalFabricYards}
                      unit="หลา"
                      valueColor="text-orange-500"
                      totalCost={fabricTotalCost}
                    />
                    {[...fabricsByCode.entries()].map(([code, v]) => (
                      <FabricCard
                        key={code}
                        code={code}
                        total={v.total}
                        entries={v.entries}
                        unit="หลา"
                        accent="text-orange-500"
                        costLookup={fabricCosts}
                        onCostSave={updateFabricCost}
                      />
                    ))}
                  </section>
                )}

                {sheersByCode.size > 0 && (
                  <section>
                    <SectionHeader
                      label={`🌫️ ผ้าโปร่ง (${sheersByCode.size} รหัส)`}
                      count={totalSheerYards}
                      unit="หลา"
                      valueColor="text-orange-400"
                      totalCost={sheerTotalCost}
                    />
                    {[...sheersByCode.entries()].map(([code, v]) => (
                      <FabricCard
                        key={code}
                        code={code}
                        total={v.total}
                        entries={v.entries}
                        unit="หลา"
                        accent="text-orange-400"
                        costLookup={fabricCosts}
                        onCostSave={updateFabricCost}
                      />
                    ))}
                  </section>
                )}

                {wallpapersByCode.size > 0 && (
                  <section>
                    <SectionHeader
                      label={`🖼️ วอลเปเปอร์ (${wallpapersByCode.size} รหัส)`}
                      count={totalWallpaperRolls}
                      unit="ม้วน"
                      valueColor="text-orange-500"
                    />
                    {[...wallpapersByCode.entries()].map(([code, v]) => (
                      <WallpaperCostCard key={code} code={code} total={v.total} entries={v.entries} />
                    ))}
                  </section>
                )}

                {areaByKey.size > 0 && (
                  <section>
                    <div className="flex items-center justify-between py-2 border-b border-border/60 mb-2">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        🪟 มู่ลี่ / ฉาก / มุ้ง ({areaByKey.size} รายการ)
                      </span>
                      <span className="text-xs font-mono font-bold text-teal-600 dark:text-teal-400">
                        {fmtTH([...areaByKey.values()].reduce((s, g) => s + g.totalSqm, 0))} ตร.ม.
                      </span>
                    </div>
                    {[...areaByKey.values()].map((group) => (
                      <AreaCostCard key={group.costKey} group={group} />
                    ))}
                  </section>
                )}
              </div>
            )}

            {/* ── TAB: ราง ── */}
            {activeTab === 'rail' && (
              <div>
                {!hasRail && (
                  <EmptyHint message="ไม่มีข้อมูลราง" sub="เพิ่มรายการผ้าม่านที่ใช้รางในโครงการ" />
                )}
                {hasRail && (
                  <>
                    <div className="flex items-center justify-between py-2 border-b border-border/60 mb-3">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        ราง {railsByKey.size} ชนิด
                      </span>
                      <span className="text-xs font-mono font-bold text-sky-600 dark:text-sky-400">
                        รวม {fmtTH(totalRailM)} ม.
                      </span>
                    </div>
                    {[...railsByKey.entries()].map(([key, v]) => (
                      <RailCard
                        key={key}
                        railKey={key}
                        label={v.label}
                        totalLength={v.totalLength}
                        totalSets={v.totalSets}
                        items={v.items}
                      />
                    ))}
                    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200/50 dark:border-blue-900/50 text-xs text-blue-800 dark:text-blue-300 flex gap-2">
                      <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>
                        ความยาวรางคือความกว้างหน้าต่าง เพิ่มระยะซ้ายขวา 5-10 ซม./ข้าง ตามหน้างานจริง
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── TAB: อุปกรณ์ ── */}
            {activeTab === 'accessories' && (
              <div>
                {!hasAcc && (
                  <EmptyHint message="ไม่มีอุปกรณ์ที่คำนวณได้" sub="เพิ่มรายการผ้าม่านในโครงการ" />
                )}
                {hasAcc && (
                  <>
                    <div className="py-2 border-b border-border/60 mb-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      ประมาณการอุปกรณ์ทั้งหมด
                    </div>
                    <div className="bg-card border border-border/50 rounded-xl px-3 divide-y divide-border/40">
                      <AccRow label="ขาจับราง" value={acc.brackets} unit="ชิ้น" note="ทุก 120 ซม. + ปลายทั้ง 2 ด้าน" />
                      <AccRow label="ห่วงตาไก่" value={acc.eyelets} unit="วง" note="ทุก 10 ซม. บนผ้าสำเร็จ (เฉพาะม่านตาไก่)" />
                      <AccRow label="ตะขอจีบ (Pin hooks)" value={acc.pinHooks} unit="ตัว" note="ทุก 14 ซม. บนผ้าสำเร็จ (เฉพาะม่านจีบ)" />
                      <AccRow label="เทปหัวม่านลอน" value={acc.waveTapeM} unit="เมตร" note="เท่ากับผ้าก่อนพับลอน (เฉพาะม่านลอน)" />
                      <AccRow label="ลูกล้อ (ม่านลอน)" value={acc.rollers} unit="ตัว" note={`ทุก ${FORMULAS.wave.roller_pitch_cm} ซม. ตามราง (เฉพาะม่านลอน TW14.5)`} />
                      <AccRow label="กระดุม/สแน็ป (ม่านลอน)" value={acc.snaps} unit="เม็ด" note="1:1 กับลูกล้อ (เฉพาะม่านลอน)" />
                      <AccRow label="ชุดรางม่านพับ" value={acc.romanSets} unit="ชุด" note="1 ชุด/หน้าต่าง รวมเกียร์ + เส้นดึง" />
                    </div>
                    <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200/50 dark:border-amber-900/50 text-xs text-amber-800 dark:text-amber-300 flex gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>
                        ตัวเลขเป็น <strong>ประมาณการ (~)</strong> คำนวณจากขนาดและ style ม่าน
                      </span>
                    </div>
                    {acc.oversizeWave.length > 0 && (
                      <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-300/60 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300 flex gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <div>
                          <strong>ม่านลอนรางยาวเกิน {FORMULAS.wave.max_track_cm / 100} ม.</strong> —
                          แนะนำเพิ่มขาค้ำกลางหรือแยกราง:
                          <ul className="mt-1 list-disc list-inside space-y-0.5">
                            {acc.oversizeWave.map((o, i) => (
                              <li key={i}>
                                {o.roomName} · กว้าง {o.width.toFixed(2)} ม.
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ── TAB: คลังรหัส ── */}
            {activeTab === 'catalog' && (
              <div>
                {/* Mobile: horizontal scroll category pills */}
                <div className="sm:hidden flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none mb-4">
                  {CATALOG_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setCatalogCat(cat.id)}
                      className={cn(
                        'shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                        catalogCat === cat.id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      )}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Desktop: category title above content */}
                <div className="hidden sm:flex items-center gap-2 mb-4 pb-2 border-b border-border/50">
                  <BookOpen className="w-4 h-4 text-muted-foreground" />
                  <span className="font-semibold text-sm text-foreground">{activeCatalogDef.label}</span>
                  <span className="text-xs text-muted-foreground">· ราคาทุนต่อ {activeCatalogDef.costUnit}</span>
                </div>

                <CatalogCategoryView
                  key={catalogCat}
                  categoryId={catalogCat}
                  costUnit={activeCatalogDef.costUnit}
                  vault={activeCatalogDef.vault}
                />
              </div>
            )}

            <div className="h-8" />
          </div>

          {/* ── MOBILE BOTTOM TAB BAR ───────────────────────────────────────── */}
          <nav className="sm:hidden shrink-0 border-t border-border bg-background/95 backdrop-blur-sm pb-safe-bottom">
            <div className="flex">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors',
                    activeTab === tab.id ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  <div className="relative">
                    <tab.icon className="w-5 h-5" />
                    {tab.badge !== undefined && tab.badge > 0 && (
                      <span className="absolute -top-1 -right-1.5 min-w-[14px] h-[14px] bg-primary text-primary-foreground text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                        {tab.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-medium">{tab.label}</span>
                </button>
              ))}
            </div>
          </nav>
        </div>

      </div>
    </Modal>
  );
};
