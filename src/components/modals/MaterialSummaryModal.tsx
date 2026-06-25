import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useAppStore } from '@/store/useAppStore';
import { CATALOG_CATEGORIES, categoryAccent, categoryDotClass } from '@/lib/vault';
import { MATERIAL_ACCENT, MATERIAL_PILL } from '@/config/dataTones';
import { useThemeStore, isColorfulTheme } from '@/store/useThemeStore';
import { fmtTH, fmtSize } from '@/utils/formatters';
import { cn } from '@/lib/utils';
import {
  Layers,
  Wrench,
  Package,
  ChevronDown,
  ChevronLeft,
  AlertTriangle,
  BookOpen,
  ArrowRight,
  MapPin,
  Search,
  Plus,
  Trash2,
  Tag,
} from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import { useConfirm } from '@/hooks/useConfirm';
import { useInventory, HydratedInventoryItem } from '@/hooks/useInventory';
import { useActiveCostMaps } from '@/hooks/useActiveCostMaps';
import { useCatalogStore } from '@/store/useCatalogStore';
import { normalizeCode } from '@/lib/codes';
import { toNum } from '@/utils/formatters';
import { classifyDraft } from '@/lib/materials/draftReconcile';
import type { MaterialDraft } from '@/store/slices/MaterialDraftSlice';
import { FORMULAS } from '@/config/formulas';
import { buildSummary, type FabricEntry, type RailItem, type AreaGroup } from '@/lib/materials/buildSummary';

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

// ─── Catalog sub-components ───────────────────────────────────────────────────

// READ-ONLY — product master = DB-owned (HANDOFF §11.8). แก้ทุน/SKU ที่เครื่องมือภายนอก ไม่ใช่ในแอป
const InventoryItemRow = ({
  item,
  cost,
  costUnit,
  highlight,
  accentClass,
  dotClass,
  onOpenDetail,
}: {
  item: HydratedInventoryItem;
  cost: number;
  costUnit: string;
  highlight?: boolean;
  accentClass: string;
  dotClass: string;
  onOpenDetail: () => void;
}) => {
  const rowRef = useRef<HTMLDivElement>(null);

  // Code Jump: เลื่อนมาที่รายการที่กระโดดมา (ไฮไลต์ค้างไว้จนปิด/เปลี่ยนหมวด)
  useEffect(() => {
    if (highlight && rowRef.current) {
      rowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlight]);

  return (
    <div
      ref={rowRef}
      className={cn(
        'flex items-start gap-2 px-3 py-2.5 bg-card border rounded-2xl transition-colors',
        highlight ? 'border-primary ring-2 ring-primary/30' : 'border-border/50'
      )}
    >
      <div className="flex-1 min-w-0 space-y-1.5">
        {/* รหัส = หัวการ์ด */}
        <div className="flex items-center gap-1.5">
          <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotClass)} />
          <span className={cn('font-mono font-bold text-sm', accentClass)}>{item.code}</span>
        </div>

        {/* ทุน (อ่านอย่างเดียว — มาจาก DB) */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-16 shrink-0">ทุน</span>
          <span className="text-sm font-mono tabular-nums text-foreground">
            {cost > 0 ? `฿${fmtTH(cost)}` : '—'}
            <span className="text-xs text-muted-foreground"> /{costUnit}</span>
          </span>
        </div>

        {/* ราคาขาย — อ้างอิงจากแคตตาล็อก (รอง: ไม่ลงสี เพื่อไม่ชนความหมายของ "ทุน") */}
        {item.default_price_per_m > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-16 shrink-0">ราคาขาย</span>
            <span className="text-sm font-mono tabular-nums text-foreground">
              ฿{fmtTH(item.default_price_per_m)}
              <span className="text-xs text-muted-foreground"> /ม.</span>
            </span>
          </div>
        )}

        {/* หมายเหตุ */}
        {item.note && (
          <div className="flex items-start gap-2">
            <span className="text-xs text-muted-foreground w-16 shrink-0">หมายเหตุ</span>
            <span className="text-sm text-muted-foreground truncate">{item.note}</span>
          </div>
        )}

        {/* ที่มา (provenance) — ผู้ผลิต + วันที่อัปเดตราคา (HANDOFF §11.8) */}
        {(item.supplier || item.captured_at) && (
          <div className="flex items-start gap-2">
            <span className="text-xs text-muted-foreground w-16 shrink-0">ที่มา</span>
            <span className="text-xs text-muted-foreground truncate">
              {item.supplier ? `จาก ${item.supplier}` : ''}
              {item.supplier && item.captured_at ? ' · ' : ''}
              {item.captured_at ? `อัปเดต ${item.captured_at}` : ''}
            </span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-1 pt-0.5 shrink-0">
        <button
          onClick={onOpenDetail}
          title="ดูจุดที่ใช้รหัสนี้"
          className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-colors"
        >
          <MapPin className="w-3.5 h-3.5" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
};

// ── "ราคาของฉัน" (ในเครื่อง) — เพิ่ม/แก้ code+ทุน+ราคาขาย ใช้ซ้ำข้ามจุด/ข้ามงาน, ไม่เคย push กลับ DB ──
// หลักการ: คลังทับเมื่อมี · ของฉันเติมเมื่อคลังไม่มี · ออฟไลน์ใช้ของฉัน (HANDOFF §11.9).
// reconcile = nudge บรรทัดเดียว (สไตล์ PriceStatusIndicator) — โผล่เฉพาะตอน "คลังมีทุนรหัสนี้แล้ว & ต่างจากที่จด"
// (dbCost>0). ไม่ใช่ "เลือกใครชนะ" — คลังตัดสินไปแล้ว, ปุ่มแค่เก็บกวาด note ที่ซ้ำ.
const DraftRow = ({
  categoryId,
  draft,
  costUnit,
  accentClass,
  dotClass,
  catalogItem,
}: {
  categoryId: string;
  draft: MaterialDraft;
  costUnit: string;
  accentClass: string;
  dotClass: string;
  /** entry ในคลังที่รหัสตรงกัน (มีเฉพาะตอนออนไลน์ & พบ) — ใช้เทียบทุน */
  catalogItem?: HydratedInventoryItem;
}) => {
  const upsert = useAppStore((s) => s.upsertMaterialDraft);
  const remove = useAppStore((s) => s.removeMaterialDraft);
  const { confirm } = useConfirm();

  const [cost, setCost] = useState(draft.cost ? String(draft.cost) : '');
  const [sell, setSell] = useState(draft.sellPrice ? String(draft.sellPrice) : '');

  const commit = () =>
    upsert(categoryId, { code: draft.code, cost: toNum(cost), sellPrice: toNum(sell) });

  const handleDelete = async () => {
    const ok = await confirm({
      title: 'ลบรหัสนี้?',
      description: `ลบราคาที่คุณจดของ "${draft.code}" ใช่ไหม? (ข้อมูลในคลังไม่ถูกแตะ)`,
      confirmLabel: 'ลบ',
      variant: 'destructive',
    });
    if (ok) remove(categoryId, draft.code);
  };

  // reconcile (cost-only, gap-fill-aware): คลังทับเฉพาะเมื่อมี "ทุน" จริง (dbCost>0) → เทียบทุน.
  // คลังไม่มีทุน (ไม่อยู่ในคลัง/ออฟไลน์/คลังยังไม่ตั้งทุน) → ของฉันเติมช่องว่าง → ไม่ถือว่าชน (ไม่ขึ้น nudge).
  const dbCost = catalogItem?.cost_per_yard ?? 0;
  const reconcile = classifyDraft({ cost: toNum(cost) }, dbCost > 0 ? { cost: dbCost, sellPrice: 0 } : null);
  const conflict = reconcile === 'conflict';
  const confirmedByDb = reconcile === 'match';

  return (
    <div className="rounded-xl border border-border/60 bg-card p-2.5 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotClass)} />
          <span className={cn('font-mono font-bold text-sm truncate', accentClass)}>
            {draft.code}
          </span>
        </div>
        <button
          type="button"
          onClick={handleDelete}
          title="ลบรหัสนี้"
          className="p-1.5 text-muted-foreground hover:text-destructive rounded-lg hover:bg-muted/50 transition-colors shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
        </button>
      </div>

      {/* แก้ทุน/ราคาขาย — commit เมื่อ blur ออกจากกลุ่ม (กันเขียนทุก keystroke) */}
      <div className="grid grid-cols-2 gap-2" onBlur={commit}>
        <Input
          label="ทุน"
          size="sm"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          placeholder="0"
          inputMode="decimal"
          type="number"
          suffix={`/${costUnit}`}
          className="text-right font-mono"
        />
        <Input
          label="ราคาขาย"
          size="sm"
          value={sell}
          onChange={(e) => setSell(e.target.value)}
          placeholder="0"
          inputMode="decimal"
          type="number"
          suffix="฿"
          className="text-right font-mono"
        />
      </div>

      {/* คลังมีทุนรหัสนี้แล้ว & ต่างจากที่จด → nudge บรรทัดเดียว (คลังทับ; ปุ่ม = เก็บกวาด note ที่ซ้ำ) */}
      {conflict && (
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-400 eeert:text-amber-900 bg-amber-50 dark:bg-amber-950/30 px-2 py-1 rounded-md border border-amber-200/60">
            <AlertTriangle className="w-3 h-3 shrink-0" />
            คลังใช้ ทุน ฿{fmtTH(dbCost)}
          </span>
          <button
            type="button"
            onClick={() => remove(categoryId, draft.code)}
            className="text-xs font-bold text-foreground bg-muted hover:bg-muted/70 border border-border px-2.5 py-1 rounded-md transition-colors active:scale-95 shrink-0"
          >
            ใช้ราคาคลัง
          </button>
        </div>
      )}

      {/* ตรงกับคลังแล้ว — เงียบ ไม่มีปุ่ม */}
      {confirmedByDb && (
        <div className="text-xs text-muted-foreground">✓ ตรงกับคลัง</div>
      )}
    </div>
  );
};

const LocalDraftSection = ({
  categoryId,
  costUnit,
  accentClass,
  dotClass,
}: {
  categoryId: string;
  costUnit: string;
  accentClass: string;
  dotClass: string;
}) => {
  const draftsMap = useAppStore((s) => s.materialDrafts[categoryId]);
  const upsert = useAppStore((s) => s.upsertMaterialDraft);
  const { items: catalog } = useInventory(categoryId);
  const ready = useCatalogStore((s) => s.status) === 'ready';

  const catalogByCode = useMemo(() => {
    const m = new Map<string, HydratedInventoryItem>();
    for (const it of catalog) m.set(normalizeCode(it.code), it);
    return m;
  }, [catalog]);

  const drafts = useMemo(
    () => Object.values(draftsMap ?? {}).sort((a, b) => a.code.localeCompare(b.code)),
    [draftsMap]
  );

  const [newCode, setNewCode] = useState('');
  const [newCost, setNewCost] = useState('');
  const [newSell, setNewSell] = useState('');

  const handleAdd = () => {
    const code = newCode.trim();
    if (!code) return;
    upsert(categoryId, { code, cost: toNum(newCost), sellPrice: toNum(newSell) });
    setNewCode('');
    setNewCost('');
    setNewSell('');
  };

  return (
    <CollapsibleSection
      defaultOpen={false}
      title={
        <span className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-muted-foreground shrink-0" strokeWidth={1.5} />
          ราคาของฉัน
        </span>
      }
      badge={
        drafts.length > 0 ? (
          <span className="text-xs font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
            {drafts.length} รหัส
          </span>
        ) : undefined
      }
      hint="จดราคาไว้ใช้ตอนออฟไลน์ หรือรหัสที่คลังยังไม่มี"
    >
      <p className="text-sm text-muted-foreground -mt-2">
        ราคาที่คุณจดไว้ — ใช้ตอนออฟไลน์ หรือรหัสที่คลังยังไม่มี · ถ้าคลังมี ระบบจะใช้ราคาคลัง
      </p>

      {drafts.length > 0 && (
        <div className="space-y-2">
          {drafts.map((d) => (
            <DraftRow
              key={d.code}
              categoryId={categoryId}
              draft={d}
              costUnit={costUnit}
              accentClass={accentClass}
              dotClass={dotClass}
              catalogItem={ready ? catalogByCode.get(normalizeCode(d.code)) : undefined}
            />
          ))}
        </div>
      )}

      {/* เพิ่มรหัสในเครื่อง */}
      <div className="rounded-xl border border-dashed border-border p-2.5 space-y-2">
        <Input
          label="เพิ่มรหัส"
          size="sm"
          value={newCode}
          onChange={(e) => setNewCode(e.target.value)}
          placeholder="เช่น PASAYA-DIM-02"
          className="font-mono"
        />
        <div className="grid grid-cols-2 gap-2">
          <Input
            label="ทุน"
            size="sm"
            value={newCost}
            onChange={(e) => setNewCost(e.target.value)}
            placeholder="0"
            inputMode="decimal"
            type="number"
            suffix={`/${costUnit}`}
            className="text-right font-mono"
          />
          <Input
            label="ราคาขาย"
            size="sm"
            value={newSell}
            onChange={(e) => setNewSell(e.target.value)}
            placeholder="0"
            inputMode="decimal"
            type="number"
            suffix="฿"
            className="text-right font-mono"
          />
        </div>
        <Button
          type="button"
          size="sm"
          className="w-full gap-1.5"
          onClick={handleAdd}
          disabled={!newCode.trim()}
        >
          <Plus className="w-4 h-4" />
          เพิ่มรหัส
        </Button>
      </div>
    </CollapsibleSection>
  );
};

const CatalogCategoryView = ({
  categoryId,
  costUnit,
  prefillCode,
  onPrefillHandled,
}: {
  categoryId: string;
  costUnit: string;
  /** ยังรับไว้เพื่อ compat กับจุดเรียก (ไม่ใช้แล้ว — read-only) */
  vault?: 'fabric' | 'wallpaper' | 'area' | 'hardware';
  prefillCode?: string;
  onPrefillHandled?: () => void;
}) => {
  // READ-ONLY — product master = DB-owned (HANDOFF §11.8). แก้ทุน/SKU ที่เครื่องมือภายนอก ไม่ใช่ในแอป
  const { items } = useInventory(categoryId);
  const openModal = useAppStore((s) => s.openModal);
  const accentClass = categoryAccent(categoryId);
  const dotClass = categoryDotClass(categoryId);

  // ค้นหา — init ด้วย prefillCode (code-jump) เพื่อให้รายการนั้นโผล่แม้ลิสต์ยาวเกิน cap
  const [query, setQuery] = useState(() => prefillCode?.trim() ?? '');

  // Code Jump: ไฮไลต์รหัสที่กระโดดมา (ตัดสินใจครั้งเดียวตอน mount; key={catalogCat} → remount เมื่อเปลี่ยนหมวด)
  const [highlightCode] = useState<string | null>(() => {
    const target = prefillCode?.trim().toUpperCase();
    if (!target) return null;
    return items.some((it) => it.code.toUpperCase() === target) ? target : null;
  });

  // แจ้ง parent ว่าใช้ prefill แล้ว — กัน trigger ซ้ำเมื่อสลับหมวดแล้วกลับมาหมวดเดิม
  useEffect(() => {
    if (prefillCode) onPrefillHandled?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // กรองตามรหัส/แบรนด์/รุ่น/สี/หมายเหตุ/ผู้ผลิต (case-insensitive)
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) =>
      [it.code, it.brand, it.model, it.color, it.variant, it.note, it.supplier].some((f) =>
        f?.toLowerCase().includes(q)
      )
    );
  }, [items, query]);

  // จำกัดแถวที่ render — กัน render การ์ดเป็นพันพร้อมกันเมื่อ SKU จาก DB เยอะ
  const MAX_VISIBLE = 100;
  const visible = filtered.slice(0, MAX_VISIBLE);

  return (
    <div className="space-y-5">
      {/* ชั้นฉบับร่างในเครื่อง (offline-first) — เพิ่ม/แก้/reconcile */}
      <LocalDraftSection
        categoryId={categoryId}
        costUnit={costUnit}
        accentClass={accentClass}
        dotClass={dotClass}
      />

      <div>
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
          <h3 className="text-sm font-bold text-foreground">คลัง (จากระบบกลาง · อ่านอย่างเดียว)</h3>
        </div>
        {items.length === 0 ? (
          <EmptyHint message="ยังไม่มีรหัสในหมวดนี้" sub="ข้อมูลสินค้ามาจากระบบกลาง" />
        ) : (
        <>
          {/* เครื่องมือค้นหา */}
          <div className="mb-3">
            <Input
              prefix={<Search className="w-4 h-4" strokeWidth={1.5} />}
              placeholder="ค้นหารหัส / แบรนด์ / รุ่น / สี"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onClear={() => setQuery('')}
            />
            <p className="text-xs text-muted-foreground mt-1.5 px-1">
              พบ {fmtTH(filtered.length)} / {fmtTH(items.length)} รหัส
            </p>
          </div>

          {filtered.length === 0 ? (
            <EmptyHint message={`ไม่พบ "${query}"`} sub="ลองคำอื่น หรือสลับหมวด" />
          ) : (
            <>
              <div className="space-y-2">
                {visible.map((item) => (
                  <InventoryItemRow
                    key={item.id}
                    item={item}
                    cost={item.cost_per_yard}
                    costUnit={costUnit}
                    highlight={!!highlightCode && item.code.toUpperCase() === highlightCode}
                    accentClass={accentClass}
                    dotClass={dotClass}
                    onOpenDetail={() =>
                      openModal('codeDetail', { code: item.code, category: categoryId })
                    }
                  />
                ))}
              </div>
              {filtered.length > MAX_VISIBLE && (
                <p className="text-xs text-muted-foreground text-center mt-3">
                  แสดง {MAX_VISIBLE} จาก {fmtTH(filtered.length)} — พิมพ์เพื่อค้นหาให้แคบลง
                </p>
              )}
            </>
          )}
        </>
        )}
      </div>
    </div>
  );
};

// ─── Summary sub-components ───────────────────────────────────────────────────

// ยอดรวมปริมาณข้ามรหัสไม่มีความหมายต่อการสั่ง (แต่ละรหัส = สินค้าคนละตัว) →
// หัว section เก็บแค่ป้าย "(N รหัส)" + ทุนรวม ฿ (รวมได้จริง); ปริมาณต่อรหัสอยู่ในการ์ด
const SectionHeader = ({
  label,
  totalCost,
}: {
  label: string;
  totalCost?: number;
}) => (
  <div className="flex items-center justify-between py-2 border-b border-border/60 mb-2">
    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{label}</span>
    {totalCost !== undefined && totalCost > 0 && (
      <span className="text-xs text-emerald-700 dark:text-emerald-400 eeert:text-emerald-800 font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
        ทุน ฿{fmtTH(totalCost)}
      </span>
    )}
  </div>
);

/**
 * UsageRow — แถว "ใช้ที่ห้องไหน · เท่าไหร่" ที่การ์ดวัสดุใช้ร่วมกัน (จิ้ม → กระโดดไป item)
 * 2 บรรทัด ไม่ตัดข้อมูล (DESIGN.md §1: data ≥14px · 12px = chip/Meta เท่านั้น):
 *   บรรทัด 1: ห้อง 14px foreground + จำนวน 14px mono accent
 *   บรรทัด 2: spec (ขนาดน้ำเงิน mono + chips) — flex-wrap, ห้าม truncate
 */
const UsageRow = ({
  roomName,
  qty,
  qtyClass,
  qtyPill,
  spec,
  onJump,
}: {
  roomName: string;
  qty: string;
  qtyClass: string;
  /** MATERIAL_PILL.x — plate กัน "สีกลืน" สำหรับเลขวัสดุ (plate-required); โผล่ใน EEERT */
  qtyPill?: string;
  spec?: React.ReactNode;
  onJump: () => void;
}) => {
  const isColorful = useThemeStore((s) => isColorfulTheme(s.theme));
  return (
    <button
      onClick={onJump}
      className="w-full px-1 py-2 hover:bg-muted/40 transition-colors group text-left"
    >
      <div className="flex justify-between items-center gap-2">
        <span className="flex items-center gap-1.5 min-w-0">
          <span className="w-1 h-1 rounded-full bg-muted-foreground/40 shrink-0" />
          <span className="text-sm font-medium text-foreground truncate">{roomName}</span>
        </span>
        <span className="flex items-center gap-1 shrink-0">
          <span
            className={cn(
              'text-sm font-mono tabular-nums',
              isColorful && qtyPill && cn('rounded-full px-2 py-0.5', qtyPill),
              qtyClass
            )}
          >
            {qty}
          </span>
          <ArrowRight
            className="w-3.5 h-3.5 text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
            strokeWidth={1.5}
          />
        </span>
      </div>
      {spec && <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pl-2.5 mt-0.5">{spec}</div>}
    </button>
  );
};

/** ขนาด กว้าง×สูง — ชั้นข้อมูล #1 ของช่างหน้างาน: mono น้ำเงิน 14px (tone "dimension") */
const SpecDims = ({ children }: { children: React.ReactNode }) => (
  <span className="text-sm font-mono tabular-nums text-blue-700 dark:text-blue-400">{children}</span>
);

/** chip ป้ายหมวด (สไตล์/ชั้นผ้า) — 12px Meta โดยชอบ */
const SpecChip = ({ children }: { children: React.ReactNode }) => (
  <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">{children}</span>
);

const FabricCard = ({
  code,
  total,
  entries,
  unit,
  accent,
  accentPill,
  costLookup,
  onJumpItem,
}: {
  code: string;
  total: number;
  entries: FabricEntry[];
  unit: string;
  accent: string;
  accentPill?: string;
  costLookup: Record<string, number>;
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
            {hasUnknownCode && <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" strokeWidth={1.5} />}
            <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full shrink-0">
              {entries.length}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-0.5 shrink-0">
          <span className={cn('font-mono font-bold text-sm', accent)}>
            {fmtTH(total)} {unit}
          </span>
          {totalCost > 0 && (
            <span className="font-mono text-xs text-emerald-700 dark:text-emerald-400 eeert:text-emerald-800">
              ทุน ฿{fmtTH(totalCost)}
            </span>
          )}
        </div>
        <ChevronDown className={cn('w-4 h-4 text-muted-foreground/60 transition-transform shrink-0', open && 'rotate-180')} strokeWidth={1.5} />
      </button>

      {open && (
        <div className="border-t border-border/50 bg-muted/20">
          <div className="px-3 py-2.5 flex items-center justify-between border-b border-border/30">
            <span className="text-xs text-muted-foreground font-medium">ราคาทุนต่อหน่วย</span>
            <span className="text-sm font-mono tabular-nums text-foreground">
              {cost > 0 ? `฿${fmtTH(cost)}` : '—'}
              <span className="text-xs text-muted-foreground"> /{unit}</span>
            </span>
          </div>
          <div className="px-3 py-1 divide-y divide-border/60">
            {entries.map((e, i) => (
              <UsageRow
                key={i}
                roomName={e.roomName}
                qty={`${fmtTH(e.yards)} ${unit}`}
                qtyClass={accent}
                qtyPill={accentPill}
                onJump={() => onJumpItem(e.roomId, e.itemId)}
                spec={
                  <>
                    <SpecDims>
                      {e.width.toFixed(2)} × {e.height.toFixed(2)} ม.
                    </SpecDims>
                    <SpecChip>{e.style}</SpecChip>
                    <SpecChip>{e.layerLabel}</SpecChip>
                  </>
                }
              />
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
  entries: {
    rolls: number;
    roomId: string;
    roomName: string;
    itemId: string;
    desc: string;
    wallWidth: number;
    height: number;
  }[];
  onJumpItem: (roomId: string, itemId: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const { wallpaperCosts } = useActiveCostMaps(); // ทุน read-only — แก้ที่เครื่องมือภายนอก
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
            <span className={cn('font-mono font-bold text-sm', MATERIAL_ACCENT.wallpaper)}>{code}</span>
            <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
              {entries.length}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-0.5 shrink-0">
          <span className={cn('font-mono font-bold text-sm', MATERIAL_ACCENT.wallpaper)}>{Math.ceil(total)} ม้วน</span>
          {totalCost > 0 && (
            <span className="font-mono text-xs text-emerald-700 dark:text-emerald-400 eeert:text-emerald-800">
              ทุน ฿{fmtTH(totalCost)}
            </span>
          )}
        </div>
        <ChevronDown className={cn('w-4 h-4 text-muted-foreground/60 transition-transform shrink-0', open && 'rotate-180')} strokeWidth={1.5} />
      </button>

      {open && (
        <div className="border-t border-border/50 bg-muted/20">
          <div className="px-3 py-2.5 flex items-center justify-between border-b border-border/30">
            <span className="text-xs text-muted-foreground font-medium">ราคาทุนต่อม้วน</span>
            <span className="text-sm font-mono tabular-nums text-foreground">
              {cost > 0 ? `฿${fmtTH(cost)}` : '—'}
              <span className="text-xs text-muted-foreground"> /ม้วน</span>
            </span>
          </div>
          <div className="px-3 py-1 divide-y divide-border/60">
            {entries.map((e, i) => (
              <UsageRow
                key={i}
                roomName={e.roomName}
                qty={`${Math.ceil(e.rolls)} ม้วน`}
                qtyClass={MATERIAL_ACCENT.wallpaper}
                qtyPill={MATERIAL_PILL.wallpaper}
                onJump={() => onJumpItem(e.roomId, e.itemId)}
                spec={
                  <>
                    <SpecChip>ผนัง</SpecChip>
                    <SpecDims>
                      {fmtSize(e.wallWidth, e.height)} ม.
                    </SpecDims>
                  </>
                }
              />
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
  const { areaCosts } = useActiveCostMaps(); // ทุน read-only — แก้ที่เครื่องมือภายนอก
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
              <span className="font-mono text-xs text-teal-700 dark:text-teal-400 eeert:text-teal-800 bg-teal-500/10 px-1.5 py-0.5 rounded-full">
                {group.code}
              </span>
            )}
            <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full shrink-0">
              {group.entries.length}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-0.5 shrink-0">
          <span className="font-mono font-bold text-sm text-teal-700 dark:text-teal-400 eeert:text-teal-800">
            {fmtTH(costQty)} {group.unit}
          </span>
          {totalCost > 0 && (
            <span className="font-mono text-xs text-emerald-700 dark:text-emerald-400 eeert:text-emerald-800">
              ทุน ฿{fmtTH(totalCost)}
            </span>
          )}
        </div>
        <ChevronDown className={cn('w-4 h-4 text-muted-foreground/60 transition-transform shrink-0', open && 'rotate-180')} strokeWidth={1.5} />
      </button>

      {open && (
        <div className="border-t border-border/50 bg-muted/20">
          <div className="px-3 py-2.5 flex items-center justify-between border-b border-border/30">
            <span className="text-xs text-muted-foreground font-medium">ราคาทุนต่อ{group.unit}</span>
            <span className="text-sm font-mono tabular-nums text-foreground">
              {cost > 0 ? `฿${fmtTH(cost)}` : '—'}
              <span className="text-xs text-muted-foreground"> /{group.unit}</span>
            </span>
          </div>
          <div className="px-3 py-1 divide-y divide-border/60">
            {group.entries.map((e, i) => {
              const entryQty = group.unit === 'ตร.ม.' ? e.sqm : e.sqyd;
              return (
                <UsageRow
                  key={i}
                  roomName={e.roomName}
                  qty={`${fmtTH(entryQty)} ${group.unit}`}
                  qtyClass="text-teal-700 dark:text-teal-400 eeert:text-teal-800"
                  qtyPill={MATERIAL_PILL.area}
                  onJump={() => onJumpItem(e.roomId, e.itemId)}
                  spec={
                    <SpecDims>
                      {fmtSize(e.width, e.height)} ม.
                    </SpecDims>
                  }
                />
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
        <div className={cn('font-mono font-bold text-sm shrink-0', isRoman ? 'text-foreground' : MATERIAL_ACCENT.hardware)}>
          {isRoman ? `${totalSets} ชุด` : `${fmtTH(totalLength)} ม.`}
        </div>
        <ChevronDown className={cn('w-4 h-4 text-muted-foreground/60 transition-transform shrink-0', open && 'rotate-180')} strokeWidth={1.5} />
      </button>
      {open && (
        <div className="border-t border-border/50 bg-muted/20 px-3 py-1 divide-y divide-border/60">
          {items.map((item, i) => (
            <div key={i} className="py-2 space-y-0.5">
              <div className="flex justify-between items-center gap-2">
                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 min-w-0">
                  <span className="text-sm font-medium text-foreground">{item.roomName}</span>
                  {item.isDouble && (
                    <span className="text-xs bg-muted text-foreground px-1.5 py-0.5 rounded-full font-bold">
                      2 ชั้น
                    </span>
                  )}
                  <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                    {item.opening}
                  </span>
                </div>
                <span
                  className={cn(
                    'text-sm font-mono tabular-nums shrink-0',
                    !isRoman && MATERIAL_ACCENT.hardware
                  )}
                >
                  {isRoman ? '1 ชุด' : `${item.width.toFixed(2)} ม.`}
                </span>
              </div>
              {(item.railCode || item.railColor) && (
                <div className={cn('pl-2 text-sm font-mono', MATERIAL_ACCENT.hardware)}>
                  {item.railCode ? `รุ่น ${item.railCode}` : ''}
                  {item.railCode && item.railColor ? ' · ' : ''}
                  {item.railColor ? `สี ${item.railColor}` : ''}
                </div>
              )}
              {!isRoman && (
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground pl-2">
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
  // ทุนผ้า: catalog (DB) เมื่อเชื่อมจริง ไม่งั้น vault ในแอป — read-only (แก้ที่เครื่องมือภายนอก)
  const { fabricCosts } = useActiveCostMaps();
  const openModal = useAppStore((s) => s.openModal);

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

  const summary = useMemo(() => buildSummary(rooms), [rooms]);
  const { fabricsByCode, sheersByCode, wallpapersByCode, railsByKey, areaByKey, acc } = summary;

  const totalRailM = [...railsByKey.values()].reduce((s, v) => s + v.totalLength, 0);

  // area: จัดกลุ่มต่อชนิดสินค้า (คงลำดับ insertion) → หัวย่อย + ยอดรวมหน่วยถูกต่อชนิด
  const areaByType = useMemo(() => {
    const m = new Map<string, AreaGroup[]>();
    for (const g of areaByKey.values()) {
      const arr = m.get(g.type) ?? [];
      arr.push(g);
      m.set(g.type, arr);
    }
    return m;
  }, [areaByKey]);

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
      description="รหัส & ราคาจากผู้ผลิต · ไม่ใช่สต๊อกสินค้า"
      variant="fullscreen"
      maxWidth="5xl"
      appShell
    >
      {/* appShell body is a fixed-height, padding-free frame → fill it exactly (h-full) so the
          desktop sidebar stays put and only the content column scrolls (no resize on tab switch) */}
      <div className="flex flex-col sm:flex-row h-full">

        {/* ── DESKTOP LEFT SIDEBAR ────────────────────────────────────────── */}
        <nav className="hidden sm:flex sm:flex-col sm:w-44 sm:shrink-0 sm:min-h-0 sm:overflow-y-auto sm:overscroll-contain sm:border-r sm:border-border/50 sm:bg-muted/5 sm:py-3">
          {activeTab === 'catalog' ? (
            <>
              <button
                onClick={() => setActiveTab('fabric')}
                className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
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
                      totalCost={fabricTotalCost}
                    />
                    {[...fabricsByCode.entries()].map(([code, v]) => (
                      <FabricCard
                        key={code}
                        code={code}
                        total={v.total}
                        entries={v.entries}
                        unit="หลา"
                        accent={MATERIAL_ACCENT.fabric}
                        accentPill={MATERIAL_PILL.fabric}
                        costLookup={fabricCosts}
                        onJumpItem={handleJumpItem}
                      />
                    ))}
                  </section>
                )}

                {sheersByCode.size > 0 && (
                  <section>
                    <SectionHeader
                      label={`🌫️ ผ้าโปร่ง (${sheersByCode.size} รหัส)`}
                      totalCost={sheerTotalCost}
                    />
                    {[...sheersByCode.entries()].map(([code, v]) => (
                      <FabricCard
                        key={code}
                        code={code}
                        total={v.total}
                        entries={v.entries}
                        unit="หลา"
                        accent={MATERIAL_ACCENT.sheer}
                        accentPill={MATERIAL_PILL.sheer}
                        costLookup={fabricCosts}
                        onJumpItem={handleJumpItem}
                      />
                    ))}
                  </section>
                )}

                {wallpapersByCode.size > 0 && (
                  <section>
                    <SectionHeader
                      label={`🖼️ วอลเปเปอร์ (${wallpapersByCode.size} รหัส)`}
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
                  <section className="space-y-5">
                    {/* แยกต่อชนิดสินค้า — แต่ละชนิดมียอดรวมหน่วยถูกของตัวเอง (ตร.ล./ตร.ม. ไม่ปนกัน) */}
                    {[...areaByType.entries()].map(([type, groups]) => {
                      const unit = groups[0].unit;
                      const subtotal = groups.reduce(
                        (s, g) => s + (unit === 'ตร.ม.' ? g.totalSqm : g.totalSqyd),
                        0
                      );
                      return (
                        <div key={type}>
                          <div className="flex items-center justify-between py-2 border-b border-border/60 mb-2">
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                              🪟 {groups[0].typeName} ({groups.length} รหัส)
                            </span>
                            <span className="text-xs font-mono font-bold text-teal-700 dark:text-teal-400 eeert:text-teal-800">
                              {fmtTH(subtotal)} {unit}
                            </span>
                          </div>
                          {groups.map((group) => (
                            <AreaCostCard key={group.costKey} group={group} onJumpItem={handleJumpItem} />
                          ))}
                        </div>
                      );
                    })}
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
                      <span className={cn('text-xs font-mono font-bold', MATERIAL_ACCENT.hardware)}>
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
                        'shrink-0 inline-flex items-center gap-1.5 px-3 min-h-[44px] rounded-full text-xs font-medium transition-colors',
                        catalogCat === cat.id
                          ? 'bg-foreground text-background'
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

                <p className="text-sm text-muted-foreground mb-3 px-0.5">
                  คลังเป็นราคาหลัก · ราคาที่คุณจดใช้ตอนออฟไลน์ หรือรหัสที่คลังยังไม่มี
                </p>

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
                    <tab.icon className="w-5 h-5" strokeWidth={1.5} />
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
