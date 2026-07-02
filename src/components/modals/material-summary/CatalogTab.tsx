import { useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { categoryAccent, categoryDotClass } from '@/lib/vault';
import { fmtTH, toNum } from '@/utils/formatters';
import { cn } from '@/lib/utils';
import { AlertTriangle, BookOpen, MapPin, Search, Plus, Trash2, Tag } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import { useConfirm } from '@/hooks/useConfirm';
import { useInventory, HydratedInventoryItem } from '@/hooks/useInventory';
import { useCanViewCost } from '@/hooks/useCanViewCost';
import { useCatalogStore } from '@/store/standalone/useCatalogStore';
import { normalizeCode } from '@/lib/codes';
import { classifyDraft } from '@/lib/materials/draftReconcile';
import type { MaterialDraft } from '@/store/slices/MaterialDraftSlice';
import { EmptyHint } from './EmptyHint';

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
  const canViewCost = useCanViewCost();

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

        {/* ทุน (อ่านอย่างเดียว — มาจาก DB) — ความลับร้าน เห็นเฉพาะผู้ดูแล */}
        {canViewCost && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-16 shrink-0">ทุน</span>
            <span className="text-sm font-mono tabular-nums text-foreground">
              {cost > 0 ? `฿${fmtTH(cost)}` : '—'}
              <span className="text-xs text-muted-foreground"> /{costUnit}</span>
            </span>
          </div>
        )}

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
  highlight,
}: {
  categoryId: string;
  draft: MaterialDraft;
  costUnit: string;
  accentClass: string;
  dotClass: string;
  /** entry ในคลังที่รหัสตรงกัน (มีเฉพาะตอนออนไลน์ & พบ) — ใช้เทียบทุน */
  catalogItem?: HydratedInventoryItem;
  /** Code Jump: กระโดดมาแก้รหัสนี้ (จาก CodeDetailModal) → ไฮไลต์ + เลื่อนมาให้เห็น */
  highlight?: boolean;
}) => {
  const upsert = useAppStore((s) => s.upsertMaterialDraft);
  const remove = useAppStore((s) => s.removeMaterialDraft);
  const { confirm } = useConfirm();
  const canViewCost = useCanViewCost();

  const rowRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (highlight && rowRef.current) {
      rowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlight]);

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
    <div
      ref={rowRef}
      className={cn(
        'rounded-xl border bg-card p-2.5 space-y-2 transition-colors',
        highlight ? 'border-primary ring-2 ring-primary/30' : 'border-border/60'
      )}
    >
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

      {/* แก้ทุน/ราคาขาย — commit เมื่อ blur ออกจากกลุ่ม (กันเขียนทุก keystroke).
          ทุน = ความลับร้าน → พนักงานเห็น/แก้เฉพาะราคาขาย (ทุนเดิมคงไว้ผ่าน local state) */}
      <div className={cn('grid gap-2', canViewCost ? 'grid-cols-2' : 'grid-cols-1')} onBlur={commit}>
        {canViewCost && (
          <Input
            label="ทุน"
            size="sm"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            placeholder="0"
            inputMode="decimal"
            type="number"
            suffix={`/${costUnit}`}
            isMoney
          />
        )}
        <Input
          label="ราคาขาย"
          size="sm"
          value={sell}
          onChange={(e) => setSell(e.target.value)}
          placeholder="0"
          inputMode="decimal"
          type="number"
          suffix="฿"
          isMoney
        />
      </div>

      {/* คลังมีทุนรหัสนี้แล้ว & ต่างจากที่จด → nudge บรรทัดเดียว (คลังทับ; ปุ่ม = เก็บกวาด note ที่ซ้ำ) */}
      {canViewCost && conflict && (
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
      {canViewCost && confirmedByDb && (
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
  prefillCode,
}: {
  categoryId: string;
  costUnit: string;
  accentClass: string;
  dotClass: string;
  /** Code Jump: รหัสที่กระโดดมาแก้ (จาก CodeDetailModal) — ถ้าตรงกับ draft → เปิด section + ไฮไลต์แถว */
  prefillCode?: string;
}) => {
  const draftsMap = useAppStore((s) => s.materialDrafts[categoryId]);
  const upsert = useAppStore((s) => s.upsertMaterialDraft);
  const canViewCost = useCanViewCost();
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

  // Code Jump: รหัสที่กระโดดมาตรงกับ draft ตัวไหน → เปิด section + ไฮไลต์แถวนั้น
  // latch ครั้งเดียวตอน mount (แพทเทิร์นเดียวกับ highlightCode ฝั่งคลัง) — parent เคลียร์ prefill
  // ทันทีหลัง mount (onPrefillHandled) ถ้าอ่านสดจาก prop ไฮไลต์จะดับก่อนตาเห็น
  const [prefillTarget] = useState(() => prefillCode?.trim().toUpperCase());
  const hasPrefillDraft = !!prefillTarget && drafts.some((d) => d.code.toUpperCase() === prefillTarget);

  const [newCode, setNewCode] = useState('');
  const [newCost, setNewCost] = useState('');
  const [newSell, setNewSell] = useState('');
  const [adding, setAdding] = useState(false);

  const clearAddForm = () => {
    setNewCode('');
    setNewCost('');
    setNewSell('');
  };

  const handleAdd = () => {
    const code = newCode.trim();
    if (!code) return;
    upsert(categoryId, { code, cost: toNum(newCost), sellPrice: toNum(newSell) });
    clearAddForm();
    setAdding(false);
  };

  const cancelAdd = () => {
    clearAddForm();
    setAdding(false);
  };

  return (
    <CollapsibleSection
      defaultOpen={hasPrefillDraft}
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
              highlight={!!prefillTarget && d.code.toUpperCase() === prefillTarget}
            />
          ))}
        </div>
      )}

      {/* เพิ่มรหัสในเครื่อง — ซ่อนฟอร์มไว้ก่อน, กด "เพิ่มรหัส" จึงเผยช่องกรอก (ให้เห็นรหัสได้มากขึ้น) */}
      {adding ? (
        <div className="rounded-xl border border-dashed border-border p-2.5 space-y-2">
          <Input
            label="เพิ่มรหัส"
            size="sm"
            value={newCode}
            onChange={(e) => setNewCode(e.target.value)}
            placeholder="เช่น PASAYA-DIM-02"
            className="font-mono"
            autoFocus
          />
          <div className={cn('grid gap-2', canViewCost ? 'grid-cols-2' : 'grid-cols-1')}>
            {canViewCost && (
              <Input
                label="ทุน"
                size="sm"
                value={newCost}
                onChange={(e) => setNewCost(e.target.value)}
                placeholder="0"
                inputMode="decimal"
                type="number"
                suffix={`/${costUnit}`}
                isMoney
              />
            )}
            <Input
              label="ราคาขาย"
              size="sm"
              value={newSell}
              onChange={(e) => setNewSell(e.target.value)}
              placeholder="0"
              inputMode="decimal"
              type="number"
              suffix="฿"
              isMoney
            />
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="ghost" className="flex-1" onClick={cancelAdd}>
              ยกเลิก
            </Button>
            <Button
              type="button"
              size="sm"
              className="flex-1 gap-1.5"
              onClick={handleAdd}
              disabled={!newCode.trim()}
            >
              <Plus className="w-4 h-4" />
              เพิ่ม
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="w-full gap-1.5"
          onClick={() => setAdding(true)}
        >
          <Plus className="w-4 h-4" />
          เพิ่มรหัส
        </Button>
      )}
    </CollapsibleSection>
  );
};

export const CatalogCategoryView = ({
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

  // ค้นหา — init ด้วย prefillCode เฉพาะเมื่อเป็นรหัสในคลัง (code-jump ให้โผล่แม้ลิสต์ยาวเกิน cap);
  // ถ้าเป็นรหัสของ "ราคาของฉัน" (draft) อย่างเดียว → ไม่ตั้ง query (กันคลังโชว์ "ไม่พบ") ให้ LocalDraftSection ไฮไลต์แทน
  const [query, setQuery] = useState(() => {
    const t = prefillCode?.trim() ?? '';
    return t && items.some((it) => it.code.toUpperCase() === t.toUpperCase()) ? t : '';
  });

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
        prefillCode={prefillCode}
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
