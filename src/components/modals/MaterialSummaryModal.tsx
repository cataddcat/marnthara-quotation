import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useAppStore } from '@/store/useAppStore';
import { useUIStore } from '@/store/useUIStore';
import { CATALOG_CATEGORIES, categoryAccent, categoryDotClass } from '@/lib/vault';
import { fmtTH } from '@/utils/formatters';
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
  Pencil,
  Plus,
  BookOpen,
  Trash2,
  ArrowRight,
  MapPin,
} from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { useInventory, HydratedInventoryItem } from '@/hooks/useInventory';
import { InventoryItem } from '@/store/slices/InventorySlice';
import { FORMULAS } from '@/config/formulas';
import { buildSummary, type FabricEntry, type RailItem, type AreaGroup } from '@/lib/materials/buildSummary';
import { missingOpeningItems } from '@/lib/item-status';

// ─── Shared empty state ───────────────────────────────────────────────────────

const EmptyHint = ({ message, sub }: { message: string; sub: string }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
    <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center">
      <Package className="w-6 h-6 text-muted-foreground opacity-40" strokeWidth={1.5} />
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
        <span className="text-xs text-muted-foreground">/{unit}</span>
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
          <span className="text-xs text-muted-foreground/70">/{unit}</span>
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
  highlight,
  accentClass,
  dotClass,
  onCostSave,
  onUpdate,
  onRemove,
  onOpenDetail,
}: {
  item: HydratedInventoryItem;
  cost: number;
  costUnit: string;
  highlight?: boolean;
  accentClass: string;
  dotClass: string;
  onCostSave: (code: string, cost: number) => void;
  onUpdate: (updates: Partial<InventoryItem>) => void;
  onRemove: () => void;
  onOpenDetail: () => void;
}) => {
  const [editing, setEditing] = useState(false);
  const [draftCode, setDraftCode] = useState('');
  const [draftPrice, setDraftPrice] = useState('');
  const [draftNote, setDraftNote] = useState('');
  const [confirmDel, setConfirmDel] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);

  // Code Jump: เลื่อนมาที่รายการที่กระโดดมา (ไฮไลต์ค้างไว้จนปิด/เปลี่ยนหมวด)
  useEffect(() => {
    if (highlight && rowRef.current) {
      rowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlight]);

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
    <div
      ref={rowRef}
      className={cn(
        'flex items-start gap-2 px-3 py-2.5 bg-card border rounded-2xl transition-colors',
        highlight
          ? 'border-primary ring-2 ring-primary/30'
          : 'border-border/50'
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotClass)} />
          <span className={cn('font-mono font-bold text-sm', accentClass)}>{item.code}</span>
          {cost > 0 && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
              ทุน ฿{fmtTH(cost)}/{costUnit}
            </span>
          )}
        </div>
        {item.default_price_per_m > 0 && (
          <div className="text-xs text-muted-foreground mt-0.5">
            ราคา ฿{fmtTH(item.default_price_per_m)}/ม.
          </div>
        )}
        {item.note && (
          <div className="text-xs text-muted-foreground/60 truncate">{item.note}</div>
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
          onClick={onOpenDetail}
          title="ดูจุดที่ใช้รหัสนี้"
          className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-colors"
        >
          <MapPin className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={startEdit}
          className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        {confirmDel ? (
          <button
            onClick={onRemove}
            className="px-2 py-1 text-xs bg-destructive text-destructive-foreground rounded-lg font-medium"
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
  prefillCode,
  onPrefillHandled,
}: {
  categoryId: string;
  costUnit: string;
  vault: 'fabric' | 'wallpaper' | 'area' | 'hardware';
  prefillCode?: string;
  onPrefillHandled?: () => void;
}) => {
  const { items, addItem, updateItem, removeItem } = useInventory(categoryId);
  const fabricCosts = useAppStore((s) => s.fabricCosts);
  const wallpaperCosts = useAppStore((s) => s.wallpaperCosts);
  const areaCosts = useAppStore((s) => s.areaCosts);
  const hardwareCosts = useAppStore((s) => s.hardwareCosts);
  const updateFabricCost = useAppStore((s) => s.updateFabricCost);
  const updateWallpaperCost = useAppStore((s) => s.updateWallpaperCost);
  const updateAreaCost = useAppStore((s) => s.updateAreaCost);
  const updateHardwareCost = useAppStore((s) => s.updateHardwareCost);
  const openModal = useAppStore((s) => s.openModal);
  const accentClass = categoryAccent(categoryId);
  const dotClass = categoryDotClass(categoryId);

  // Code Jump: ตัดสินใจครั้งเดียวตอน mount ของหมวดนี้ (key={catalogCat} → remount เมื่อเปลี่ยนหมวด)
  // ถ้ามีรหัสที่ส่งมาอยู่แล้ว → ไฮไลต์; ถ้ายังไม่มี → เปิดฟอร์มเพิ่มพร้อมกรอกรหัสไว้
  const [prefill] = useState<{ highlight: string | null; addCode: string | null }>(() => {
    const target = prefillCode?.trim().toUpperCase();
    if (!target) return { highlight: null, addCode: null };
    const exists = items.some((it) => it.code.toUpperCase() === target);
    return exists ? { highlight: target, addCode: null } : { highlight: null, addCode: target };
  });
  const highlightCode = prefill.highlight;

  const [adding, setAdding] = useState(() => prefill.addCode !== null);
  const [newCode, setNewCode] = useState(() => prefill.addCode ?? '');
  const [newPrice, setNewPrice] = useState('');
  const [newNote, setNewNote] = useState('');

  // แจ้ง parent ว่าใช้ prefill แล้ว — กัน trigger ซ้ำเมื่อสลับหมวดแล้วกลับมาหมวดเดิม
  useEffect(() => {
    if (prefillCode) onPrefillHandled?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getCost = (code: string): number => {
    if (vault === 'wallpaper') return wallpaperCosts[code] ?? 0;
    if (vault === 'area') return areaCosts[code] ?? 0;
    if (vault === 'hardware') return hardwareCosts[code] ?? 0;
    return fabricCosts[code] ?? 0;
  };

  const saveCost = (code: string, cost: number) => {
    if (vault === 'wallpaper') updateWallpaperCost(code, cost);
    else if (vault === 'area') updateAreaCost(code, cost);
    else if (vault === 'hardware') updateHardwareCost(code, cost);
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
        <EmptyHint message="ยังไม่มีรหัสในหมวดนี้" sub="เพิ่มรหัสสินค้า + ราคาจากผู้ผลิต" />
      )}

      <div className="space-y-2">
        {items.map((item) => (
          <InventoryItemRow
            key={item.id}
            item={item}
            cost={getCost(item.code)}
            costUnit={costUnit}
            highlight={!!highlightCode && item.code.toUpperCase() === highlightCode}
            accentClass={accentClass}
            dotClass={dotClass}
            onCostSave={saveCost}
            onUpdate={(updates) => updateItem(item.id, updates)}
            onRemove={() => removeItem(item.id)}
            onOpenDetail={() => openModal('codeDetail', { code: item.code, category: categoryId })}
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
        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
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
  onJumpItem,
}: {
  code: string;
  total: number;
  entries: FabricEntry[];
  unit: string;
  accent: string;
  costLookup: Record<string, number>;
  onCostSave: (code: string, cost: number) => void;
  onJumpItem: (roomId: string, itemId: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const hasUnknownCode = code.startsWith('(');
  const cost = costLookup[code] ?? 0;
  const totalCost = cost > 0 ? cost * total : 0;

  return (
    <div className="bg-card border border-border/50 rounded-2xl overflow-hidden mb-2">
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full px-3 py-2.5 flex items-center gap-2 hover:bg-muted/30 active:scale-[0.99] transition-[background-color,transform]"
      >
        <div className="flex-1 text-left min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={cn('font-mono font-bold text-sm', hasUnknownCode ? 'text-muted-foreground' : accent)}>
              {code}
            </span>
            {hasUnknownCode && <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />}
            <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full shrink-0">
              {entries.length} รายการ
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-0.5 shrink-0">
          <span className={cn('font-mono font-bold text-sm', accent)}>
            {fmtTH(total)} {unit}
          </span>
          {totalCost > 0 && (
            <span className="font-mono text-xs text-emerald-600 dark:text-emerald-400">
              ทุน ฿{fmtTH(totalCost)}
            </span>
          )}
        </div>
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
              <button
                key={i}
                onClick={() => onJumpItem(e.roomId, e.itemId)}
                className="w-full flex justify-between items-center text-xs rounded-md -mx-1 px-1 py-1 hover:bg-muted/50 transition-colors group"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-1 h-1 rounded-full bg-muted-foreground/40 shrink-0" />
                  <span className="text-muted-foreground truncate group-hover:text-foreground">
                    {e.roomName}
                  </span>
                  <span className="text-muted-foreground/60 truncate">· {e.desc}</span>
                </div>
                <span className="flex items-center gap-1 shrink-0 ml-2">
                  <span className={cn('font-mono', accent, 'opacity-80')}>
                    {fmtTH(e.yards)} {unit}
                  </span>
                  <ArrowRight className="w-3 h-3 text-foreground opacity-0 group-hover:opacity-100 transition-opacity" strokeWidth={1.5} />
                </span>
              </button>
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
  onJumpItem,
}: {
  code: string;
  total: number;
  entries: { rolls: number; roomId: string; roomName: string; itemId: string; desc: string }[];
  onJumpItem: (roomId: string, itemId: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const wallpaperCosts = useAppStore((s) => s.wallpaperCosts);
  const updateWallpaperCost = useAppStore((s) => s.updateWallpaperCost);
  const cost = wallpaperCosts[code] ?? 0;
  const totalCost = cost > 0 ? cost * total : 0;

  return (
    <div className="bg-card border border-border/50 rounded-2xl overflow-hidden mb-2">
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full px-3 py-2.5 flex items-center gap-2 hover:bg-muted/30 active:scale-[0.99] transition-[background-color,transform]"
      >
        <div className="flex-1 text-left min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-mono font-bold text-sm text-orange-500">{code}</span>
            <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
              {entries.length} รายการ
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-0.5 shrink-0">
          <span className="font-mono font-bold text-sm text-orange-500">{Math.ceil(total)} ม้วน</span>
          {totalCost > 0 && (
            <span className="font-mono text-xs text-emerald-600 dark:text-emerald-400">
              ทุน ฿{fmtTH(totalCost)}
            </span>
          )}
        </div>
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
              <button
                key={i}
                onClick={() => onJumpItem(e.roomId, e.itemId)}
                className="w-full flex justify-between items-center text-xs rounded-md -mx-1 px-1 py-1 hover:bg-muted/50 transition-colors group"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-1 h-1 rounded-full bg-muted-foreground/40 shrink-0" />
                  <span className="text-muted-foreground truncate group-hover:text-foreground">
                    {e.roomName}
                  </span>
                  <span className="text-muted-foreground/60 truncate">· {e.desc}</span>
                </div>
                <span className="flex items-center gap-1 shrink-0 ml-2">
                  <span className="font-mono text-orange-500 opacity-80">{Math.ceil(e.rolls)} ม้วน</span>
                  <ArrowRight className="w-3 h-3 text-foreground opacity-0 group-hover:opacity-100 transition-opacity" strokeWidth={1.5} />
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const AreaCostCard = ({
  group,
  onJumpItem,
}: {
  group: AreaGroup;
  onJumpItem: (roomId: string, itemId: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const areaCosts = useAppStore((s) => s.areaCosts);
  const updateAreaCost = useAppStore((s) => s.updateAreaCost);
  const cost = areaCosts[group.costKey] ?? 0;
  const costQty = group.unit === 'ตร.ม.' ? group.totalSqm : group.totalSqyd;
  const totalCost = cost > 0 ? cost * costQty : 0;

  return (
    <div className="bg-card border border-border/50 rounded-2xl overflow-hidden mb-2">
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full px-3 py-2.5 flex items-center gap-2 hover:bg-muted/30 active:scale-[0.99] transition-[background-color,transform]"
      >
        <div className="flex-1 text-left min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-sm text-foreground">{group.typeName}</span>
            {group.code && (
              <span className="font-mono text-xs text-teal-600 dark:text-teal-400 bg-teal-500/10 px-1.5 py-0.5 rounded-full">
                {group.code}
              </span>
            )}
            <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full shrink-0">
              {group.entries.length} รายการ
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-0.5 shrink-0">
          <span className="font-mono font-bold text-sm text-teal-600 dark:text-teal-400">
            {fmtTH(costQty)} {group.unit}
          </span>
          {totalCost > 0 && (
            <span className="font-mono text-xs text-emerald-600 dark:text-emerald-400">
              ทุน ฿{fmtTH(totalCost)}
            </span>
          )}
        </div>
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
                <button
                  key={i}
                  onClick={() => onJumpItem(e.roomId, e.itemId)}
                  className="w-full flex justify-between items-center text-xs rounded-md -mx-1 px-1 py-1 hover:bg-muted/50 transition-colors group"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-1 h-1 rounded-full bg-muted-foreground/40 shrink-0" />
                    <span className="text-muted-foreground truncate group-hover:text-foreground">
                      {e.roomName}
                    </span>
                    <span className="text-muted-foreground/60 truncate">
                      · {e.width.toFixed(1)}×{e.height.toFixed(1)} ม.
                    </span>
                  </div>
                  <span className="flex items-center gap-1 shrink-0 ml-2">
                    <span className="font-mono text-teal-600 dark:text-teal-400 opacity-80">
                      {fmtTH(entryQty)} {group.unit}
                    </span>
                    <ArrowRight className="w-3 h-3 text-foreground opacity-0 group-hover:opacity-100 transition-opacity" strokeWidth={1.5} />
                  </span>
                </button>
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
    <div className="bg-card border border-border/50 rounded-2xl overflow-hidden mb-2">
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-muted/30 active:scale-[0.99] transition-[background-color,transform]"
      >
        <div className="flex-1 text-left min-w-0">
          <div className="font-semibold text-sm text-foreground truncate">{label}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{items.length} ชุด/หน้าต่าง</div>
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
                    <span className="text-xs bg-muted text-foreground px-1 rounded font-bold">2 ชั้น</span>
                  )}
                  <span className="text-muted-foreground/60">· {item.opening}</span>
                </div>
                <span className={cn('font-mono', !isRoman && 'text-sky-600 dark:text-sky-400')}>
                  {isRoman ? '1 ชุด' : `${item.width.toFixed(2)} ม.`}
                </span>
              </div>
              {(item.railCode || item.railColor) && (
                <div className="pl-2 text-xs text-sky-600 dark:text-sky-400">
                  {item.railCode ? `รุ่น ${item.railCode}` : ''}
                  {item.railCode && item.railColor ? ' · ' : ''}
                  {item.railColor ? `สี ${item.railColor}` : ''}
                </div>
              )}
              {!isRoman && (
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground/70 pl-2">
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
        {note && <div className="text-xs text-muted-foreground mt-0.5">{note}</div>}
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
  prefillCode?: string;
}

type TabId = 'fabric' | 'rail' | 'accessories' | 'catalog';

export const MaterialSummaryModal: React.FC<MaterialSummaryModalProps> = ({
  isOpen,
  onClose,
  initialTab,
  initialCategory,
  prefillCode,
}) => {
  const rooms = useAppStore((s) => s.rooms);
  const fabricCosts = useAppStore((s) => s.fabricCosts);
  const updateFabricCost = useAppStore((s) => s.updateFabricCost);
  const openModal = useAppStore((s) => s.openModal);
  const addToast = useUIStore((s) => s.addToast);

  // กดจุดที่ใช้ในการ์ดวัสดุ → กระโดดไปแก้รายการนั้น (push บน modal stack — ปิดแล้วกลับมาที่นี่)
  const handleJumpItem = (roomId: string, itemId: string) => {
    const item = rooms.find((r) => r.id === roomId)?.items.find((i) => i.id === itemId);
    if (!item) return;
    openModal('item', {
      mode: 'edit',
      roomId,
      itemId,
      itemType: item.type,
      initialData: item,
    });
  };

  // Code Jump พร้อมรหัส → บังคับเปิดที่แท็บ "คลังรหัส"
  const resolvedInitialCat = initialCategory || CATALOG_CATEGORIES[0].id;
  const [activeTab, setActiveTab] = useState<TabId>(
    () => (initialTab as TabId) || (prefillCode ? 'catalog' : 'fabric')
  );
  const [catalogCat, setCatalogCat] = useState(() => resolvedInitialCat);
  const [pendingPrefill, setPendingPrefill] = useState<string | undefined>(() => prefillCode);
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
    // ✅ เจ้าของร้านยืนยัน (มิ.ย. 2026): ต้องใส่ทิศเปิดครบก่อนออกเอกสารสั่งของ —
    // ค่าว่างถูกตีความเป็น "แยกกลาง" เงียบ ๆ → ลูกล้อ/ตับผ้าในรายการสั่งผิด
    const missing = missingOpeningItems(rooms);
    if (missing.length > 0) {
      addToast(
        'warning',
        `เลือกทิศเปิดให้ครบก่อนคัดลอกรายการสั่งของ (ค้าง ${missing.length} รายการ: ${missing
          .slice(0, 2)
          .map((m) => `${m.roomName} ${m.label}`)
          .join(', ')}${missing.length > 2 ? ' …' : ''})`
      );
      return;
    }

    const lines: string[] = ['=== ข้อมูลสินค้า & ราคา ===', ''];
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
    { id: 'catalog', label: 'ราคา & รหัส', icon: BookOpen },
  ];

  const activeCatalogDef = CATALOG_CATEGORIES.find((c) => c.id === catalogCat) ?? CATALOG_CATEGORIES[0];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="ข้อมูลสินค้า & ราคา"
      description="รหัส & ราคาจากผู้ผลิต · แก้ไข/เพิ่มได้ · ไม่ใช่สต๊อกสินค้า"
      variant="fullscreen"
      maxWidth="5xl"
      appShell
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
      {/* appShell body is a fixed-height, padding-free frame → fill it exactly (h-full) so the
          desktop sidebar stays put and only the content column scrolls (no resize on tab switch) */}
      <div className="flex flex-col sm:flex-row h-full">

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
              <div className="px-4 pt-2 pb-1 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                หมวดสินค้า
              </div>
              {CATALOG_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCatalogCat(cat.id)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 text-sm transition-colors text-left',
                    catalogCat === cat.id
                      ? 'bg-accent text-foreground font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                  )}
                >
                  <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', categoryDotClass(cat.id))} />
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
                    ? 'bg-accent text-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                )}
              >
                <tab.icon className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                <span className="flex-1 text-left">{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className={cn(
                    'text-xs px-1.5 py-0.5 rounded-full font-bold',
                    activeTab === tab.id ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'
                  )}>
                    {tab.badge}
                  </span>
                )}
              </button>
            ))
          )}
        </nav>

        {/* ── CONTENT + MOBILE BOTTOM NAV ─────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-h-0 bg-background">
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
                        onJumpItem={handleJumpItem}
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
                        onJumpItem={handleJumpItem}
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
                      <WallpaperCostCard
                        key={code}
                        code={code}
                        total={v.total}
                        entries={v.entries}
                        onJumpItem={handleJumpItem}
                      />
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
                      <AreaCostCard key={group.costKey} group={group} onJumpItem={handleJumpItem} />
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
                    <Alert variant="info" className="mt-4">
                      <span>
                        ความยาวรางคือความกว้างหน้าต่าง เพิ่มระยะซ้ายขวา 5-10 ซม./ข้าง ตามหน้างานจริง
                      </span>
                    </Alert>
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
                    <Alert variant="warning" className="mt-4">
                      <span>
                        ตัวเลขเป็น <strong>ประมาณการ (~)</strong> คำนวณจากขนาดและ style ม่าน
                      </span>
                    </Alert>
                    {acc.oversizeWave.length > 0 && (
                      <Alert variant="warning" className="mt-3">
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
                      </Alert>
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
                        'shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                        catalogCat === cat.id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      )}
                    >
                      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', categoryDotClass(cat.id))} />
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Desktop: category title above content */}
                <div className="hidden sm:flex items-center gap-2 mb-4 pb-2 border-b border-border/50">
                  <span
                    className={cn('w-2 h-2 rounded-full shrink-0', categoryDotClass(catalogCat))}
                  />
                  <span className={cn('font-semibold text-sm', categoryAccent(catalogCat))}>
                    {activeCatalogDef.label}
                  </span>
                  <span className="text-xs text-muted-foreground">· ราคาทุนต่อ {activeCatalogDef.costUnit}</span>
                </div>

                <CatalogCategoryView
                  key={catalogCat}
                  categoryId={catalogCat}
                  costUnit={activeCatalogDef.costUnit}
                  vault={activeCatalogDef.vault}
                  prefillCode={catalogCat === resolvedInitialCat ? pendingPrefill : undefined}
                  onPrefillHandled={() => setPendingPrefill(undefined)}
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
                    activeTab === tab.id ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  <div className="relative">
                    <tab.icon className="w-5 h-5" />
                    {tab.badge !== undefined && tab.badge > 0 && (
                      <span className="absolute -top-1 -right-1.5 min-w-[16px] h-4 bg-foreground text-background text-xs font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
                        {tab.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-medium">{tab.label}</span>
                </button>
              ))}
            </div>
          </nav>
        </div>

      </div>
    </Modal>
  );
};
