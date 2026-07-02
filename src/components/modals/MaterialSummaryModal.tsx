import React, { useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useAppStore } from '@/store/useAppStore';
import { CATALOG_CATEGORIES, categoryAccent, categoryDotClass } from '@/lib/vault';
import { MATERIAL_ACCENT, MATERIAL_PILL } from '@/config/dataTones';
import { fmtTH } from '@/utils/formatters';
import { cn } from '@/lib/utils';
import { Layers, Wrench, Package, ChevronLeft, BookOpen } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { useActiveCostMaps } from '@/hooks/useActiveCostMaps';
import { useCanViewCost } from '@/hooks/useCanViewCost';
import { FORMULAS } from '@/config/formulas';
import { buildSummary, type AreaGroup } from '@/lib/materials/buildSummary';
import { EmptyHint } from './material-summary/EmptyHint';
import { CatalogCategoryView } from './material-summary/CatalogTab';
import {
  SectionHeader,
  FabricCard,
  WallpaperCostCard,
  AreaCostCard,
  RailCard,
  AccRow,
} from './material-summary/SummaryCards';

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
  const canViewCost = useCanViewCost();

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
                  {canViewCost && (
                    <span className="text-xs text-muted-foreground">· ราคาทุนต่อ {activeCatalogDef.costUnit}</span>
                  )}
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
