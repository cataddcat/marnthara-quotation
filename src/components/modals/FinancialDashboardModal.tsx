import React, { useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useAppStore } from '@/store/useAppStore';
import { fmtTH } from '@/utils/formatters';
import { CostEngine } from '@/lib/pricing/CostEngine';
import { PricingEngine } from '@/lib/pricing/PricingEngine';
import { ITEM_CONFIG } from '@/config/constants';
import { FAVORITE_CATEGORIES } from '@/config/enums';
import { ItemData } from '@/types';
import { cn } from '@/lib/utils';
import { useHaptic } from '@/hooks/useHaptic';
import {
  TrendingUp,
  TrendingDown,
  Target,
  DollarSign,
  AlertTriangle,
  ChevronDown,
  Eye,
  EyeOff,
  Info,
  ExternalLink,
} from 'lucide-react';
import type { CostBreakdown } from '@/lib/pricing/CostEngine';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ItemRow {
  id: string;
  roomId: string;
  roomName: string;
  item: ItemData;
  typeName: string;
  specs: string[];
  analysis: CostBreakdown;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_ORDER: Record<CostBreakdown['status'], number> = {
  loss: 0,
  warning: 1,
  unknown: 2,
  profit: 3,
};

const STATUS_STYLE: Record<CostBreakdown['status'], { badge: string; dot: string; label: string }> =
  {
    loss: {
      badge: 'text-rose-600 bg-rose-500/10 border-rose-200/50',
      dot: 'bg-rose-500',
      label: 'ขาดทุน',
    },
    warning: {
      badge: 'text-amber-600 bg-amber-500/10 border-amber-200/50',
      dot: 'bg-amber-400',
      label: 'กำไรต่ำ',
    },
    unknown: {
      badge: 'text-slate-500 bg-slate-500/10 border-slate-200/50',
      dot: 'bg-slate-400',
      label: 'ไม่ทราบทุน',
    },
    profit: {
      badge: 'text-emerald-600 bg-emerald-500/10 border-emerald-200/50',
      dot: 'bg-emerald-500',
      label: 'กำไร',
    },
  };

// ─── Sub-components ───────────────────────────────────────────────────────────

const FinancialRing = ({
  revenue,
  cost,
  profit,
  targetMargin,
}: {
  revenue: number;
  cost: number;
  profit: number;
  targetMargin: number;
}) => {
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
  const profitDeg = Math.max(0, Math.min(360, (profit / revenue) * 360));
  const isHealthy = margin >= targetMargin;
  const ringColor = isHealthy ? '#10b981' : '#f59e0b';

  return (
    <div className="relative flex flex-col items-center justify-center py-4">
      <div
        className="w-40 h-40 rounded-full flex items-center justify-center shadow-xl shadow-slate-200/50 dark:shadow-black/20"
        style={{
          background: `conic-gradient(${ringColor} 0deg ${profitDeg}deg, var(--color-muted) ${profitDeg}deg 360deg)`,
        }}
      >
        <div className="w-28 h-28 bg-card rounded-full flex flex-col items-center justify-center shadow-inner">
          <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">
            Net Margin
          </span>
          <div
            className={cn(
              'text-3xl font-black tabular-nums tracking-tighter',
              isHealthy ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'
            )}
          >
            {margin.toFixed(1)}
            <span className="text-sm text-muted-foreground/60">%</span>
          </div>
          <div className="text-[9px] text-muted-foreground flex items-center gap-1 mt-0.5">
            <Target className="w-2.5 h-2.5" /> เป้า {targetMargin}%
          </div>
        </div>
      </div>

      <div className="absolute bottom-2 w-full flex justify-between px-6 opacity-90">
        <div className="flex flex-col items-start bg-card/80 backdrop-blur border border-border p-1.5 rounded-lg shadow-sm text-xs">
          <span className="text-muted-foreground text-[11px]">ยอดขาย</span>
          <span className="font-bold text-emerald-600 dark:text-emerald-400">{fmtTH(revenue)}</span>
        </div>
        <div className="flex flex-col items-end bg-card/80 backdrop-blur border border-border p-1.5 rounded-lg shadow-sm text-xs">
          <span className="text-muted-foreground text-[11px]">ต้นทุนรวม</span>
          <span className="font-bold text-rose-500">{fmtTH(cost)}</span>
        </div>
      </div>
    </div>
  );
};

// Cost row inside expanded item card
const CostRow = ({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: number;
  sub?: string;
  highlight?: boolean;
}) => (
  <div className={cn('flex justify-between items-center', highlight && 'font-bold')}>
    <div className="flex items-center gap-1 min-w-0">
      <span
        className={cn('text-xs truncate', highlight ? 'text-foreground' : 'text-muted-foreground')}
      >
        {label}
      </span>
      {sub && (
        <span className="text-[10px] text-muted-foreground/60 font-mono shrink-0">{sub}</span>
      )}
    </div>
    <span
      className={cn(
        'tabular-nums text-xs shrink-0 ml-2',
        highlight ? 'text-foreground text-sm' : 'text-foreground/80'
      )}
    >
      ฿{fmtTH(value)}
    </span>
  </div>
);

// Horizontal cost structure bar
const CostStructureBar = ({
  fabric,
  labor,
  rail,
  total,
}: {
  fabric: number;
  labor: number;
  rail: number;
  total: number;
}) => {
  if (total <= 0) return null;
  const fp = Math.round((fabric / total) * 100);
  const lp = Math.round((labor / total) * 100);
  const rp = Math.max(0, 100 - fp - lp);

  return (
    <div className="px-4 pb-3 space-y-1.5">
      <div className="flex items-center justify-between text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
        <span>สัดส่วนต้นทุน</span>
        <span className="tabular-nums normal-case">{fmtTH(total)}</span>
      </div>
      <div className="h-2.5 rounded-full overflow-hidden flex gap-px bg-muted">
        {fp > 0 && <div style={{ width: `${fp}%` }} className="bg-violet-500 rounded-l-full" />}
        {lp > 0 && <div style={{ width: `${lp}%` }} className="bg-blue-500" />}
        {rp > 0 && <div style={{ width: `${rp}%` }} className="bg-orange-400 rounded-r-full" />}
      </div>
      <div className="flex gap-4 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-violet-500 shrink-0" />
          ผ้า {fp}% · {fmtTH(fabric)}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
          แรง {lp}% · {fmtTH(labor)}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-orange-400 shrink-0" />
          ราง {rp}% · {fmtTH(rail)}
        </span>
      </div>
    </div>
  );
};

// Fabric code button — กดกระโดดไปคลังผ้า
const CodeJumpButton = ({
  code,
  tab,
  onJump,
}: {
  code: string;
  tab: string;
  onJump: (code: string, tab: string) => void;
}) => (
  <button
    onClick={(e) => {
      e.stopPropagation();
      onJump(code, tab);
    }}
    className="inline-flex items-center gap-0.5 text-[10px] font-mono text-primary hover:underline underline-offset-2 active:opacity-70"
    title={`เปิดคลังผ้าสำหรับรหัส ${code}`}
  >
    ({code})
    <ExternalLink className="w-2.5 h-2.5 opacity-70" />
  </button>
);

// Expandable item card
const ItemCard = ({
  row,
  expanded,
  onToggle,
  onJumpToInventory,
}: {
  row: ItemRow;
  expanded: boolean;
  onToggle: () => void;
  onJumpToInventory: (code: string, tab: string) => void;
}) => {
  const { analysis, typeName, roomName, item } = row;
  const st = STATUS_STYLE[analysis.status];

  const laborTotal = analysis.laborCost ?? 0;
  const railTotal = (analysis.railCost ?? 0) + (analysis.accCost ?? 0);

  const isCurtain = item.type === 'curtain';
  const isWallpaper = item.type === 'wallpaper';

  // ดึงรหัสผ้าจาก item — wallpaper ใช้ wallpaper_code ส่วน item อื่นใช้ code
  const mainCode = isWallpaper
    ? (item as { wallpaper_code?: string }).wallpaper_code
    : (item as { code?: string }).code;

  // sheer_code จาก item โดยตรง (ไม่ขึ้นกับว่ามีต้นทุนหรือเปล่า)
  const sheerCode = isCurtain ? (item as { sheer_code?: string }).sheer_code : undefined;
  const showSheer = isCurtain && !!sheerCode;

  // Map item type → tab ใน InventoryManagerModal
  const mainTab = isCurtain
    ? FAVORITE_CATEGORIES.CURTAIN_MAIN
    : isWallpaper
      ? FAVORITE_CATEGORIES.WALLPAPER
      : FAVORITE_CATEGORIES.CURTAIN_MAIN;

  const marginLabel =
    analysis.status === 'unknown'
      ? st.label
      : `${analysis.marginPercent >= 0 ? '+' : ''}${analysis.marginPercent.toFixed(0)}%`;

  return (
    <div className="bg-card border border-border/60 rounded-xl overflow-hidden">
      {/* ── Main row (always visible) ── */}
      <button
        onClick={onToggle}
        className="w-full p-3 flex items-start gap-3 text-left active:bg-muted/40 transition-colors"
      >
        {/* Status dot */}
        <div className={cn('w-2 h-2 rounded-full mt-1.5 shrink-0', st.dot)} />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-sm text-foreground leading-tight">{typeName}</span>
            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full leading-tight">
              {roomName}
            </span>
          </div>
          {mainCode && (
            <div className="text-xs text-muted-foreground font-mono mt-0.5 truncate leading-tight">
              {mainCode}
              {sheerCode && <span> / {sheerCode}</span>}
            </div>
          )}
        </div>

        {/* Badge + chevron */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className={cn('px-2 py-0.5 rounded-lg text-xs font-bold border', st.badge)}>
            {marginLabel}
          </div>
          <ChevronDown
            className={cn(
              'w-4 h-4 text-muted-foreground/60 transition-transform duration-200',
              expanded && 'rotate-180'
            )}
          />
        </div>
      </button>

      {/* ── Expanded detail ── */}
      {expanded && (
        <div className="border-t border-border/50 bg-muted/20 px-3 py-3 space-y-1.5 text-sm">
          {analysis.status === 'unknown' && (
            <div className="flex items-start gap-2 text-amber-700 dark:text-amber-400 text-xs bg-amber-50 dark:bg-amber-950/30 rounded-lg p-2 mb-2 border border-amber-200/50 dark:border-amber-800/50">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>
                ยังไม่มีราคาทุนผ้า — กดรหัสผ้า (
                <span className="font-mono font-bold">{mainCode || '?'}</span>)
                ด้านล่างเพื่อเพิ่มทุนได้เลย
              </span>
            </div>
          )}

          {/* ── Fabric codes + cost — แสดงเสมอถ้ามีรหัส ── */}
          {(mainCode || isCurtain || isWallpaper) && (
            <>
              {/* Main fabric / wallpaper */}
              <div className="flex justify-between items-center gap-2">
                <div className="flex items-center gap-1 min-w-0 flex-1">
                  <span className="text-xs text-muted-foreground shrink-0">
                    {isWallpaper ? 'วอลเปเปอร์' : 'ผ้าทึบ'}
                  </span>
                  {mainCode ? (
                    <CodeJumpButton code={mainCode} tab={mainTab} onJump={onJumpToInventory} />
                  ) : (
                    <span className="text-[10px] text-muted-foreground/40 italic">
                      ยังไม่ระบุรหัส
                    </span>
                  )}
                  {!showSheer && analysis.usedQuantity > 0 && (
                    <span className="text-[10px] text-muted-foreground/50 font-mono">
                      {analysis.usedQuantity.toFixed(2)} {analysis.unit}
                    </span>
                  )}
                </div>
                <span
                  className={cn(
                    'tabular-nums text-xs shrink-0',
                    (analysis.fabricCost ?? 0) > 0
                      ? 'text-foreground/80'
                      : 'text-muted-foreground/40'
                  )}
                >
                  {(analysis.fabricCost ?? 0) > 0 ? `฿${fmtTH(analysis.fabricCost ?? 0)}` : '—'}
                </span>
              </div>

              {/* Sheer fabric — แสดงถ้ามี sheer_code ในรายการ */}
              {showSheer && (
                <div className="flex justify-between items-center gap-2">
                  <div className="flex items-center gap-1 min-w-0 flex-1">
                    <span className="text-xs text-muted-foreground shrink-0">ผ้าโปร่ง</span>
                    <CodeJumpButton
                      code={sheerCode!}
                      tab={FAVORITE_CATEGORIES.CURTAIN_SHEER}
                      onJump={onJumpToInventory}
                    />
                    {analysis.usedQuantity > 0 && (
                      <span className="text-[10px] text-muted-foreground/50 font-mono">
                        {analysis.usedQuantity.toFixed(2)} {analysis.unit}
                      </span>
                    )}
                  </div>
                  <span
                    className={cn(
                      'tabular-nums text-xs shrink-0',
                      (analysis.sheerCost ?? 0) > 0
                        ? 'text-foreground/80'
                        : 'text-muted-foreground/40'
                    )}
                  >
                    {(analysis.sheerCost ?? 0) > 0 ? `฿${fmtTH(analysis.sheerCost ?? 0)}` : '—'}
                  </span>
                </div>
              )}
            </>
          )}

          {/* Labor */}
          {laborTotal > 0 && (
            <CostRow
              label={`ค่าแรง${analysis.isLaborMinApplied ? ' ⚡ ขั้นต่ำ' : ''}`}
              value={laborTotal}
            />
          )}

          {/* Rail */}
          {railTotal > 0 && <CostRow label="ราง + อุปกรณ์" value={railTotal} />}

          {/* No cost data at all */}
          {analysis.totalCost === 0 && analysis.status !== 'unknown' && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Info className="w-3.5 h-3.5" /> ไม่มีต้นทุนที่บันทึกไว้
            </div>
          )}

          {/* Divider + totals */}
          <div className="pt-1 mt-1 border-t border-border/50 space-y-1">
            <CostRow label="ต้นทุนรวม" value={analysis.totalCost} />
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-foreground">กำไรสุทธิ</span>
              <span
                className={cn(
                  'tabular-nums text-sm font-bold',
                  analysis.profitAmount >= 0 ? 'text-emerald-600' : 'text-rose-500'
                )}
              >
                {analysis.profitAmount >= 0 ? '+' : ''}฿{fmtTH(analysis.profitAmount)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const FinancialDashboardModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const rooms = useAppStore((s) => s.rooms);
  const openModal = useAppStore((s) => s.openModal);
  const { trigger } = useHaptic();

  const [targetMargin, setTargetMargin] = useState(30);
  const [blind, setBlind] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // กดรหัสผ้า → เปิดคลังผ้า; ถ้ารหัสยังไม่มี → เปิดฟอร์มเพิ่มใหม่พร้อม pre-fill
  const handleJumpToInventory = (_code: string, tab: string) => {
    trigger('light');
    openModal('materialSummary', {
      initialTab: 'catalog',
      initialCategory: tab,
    });
  };

  // ── Build item rows from all active rooms/items ──────────────────────────
  const rows = useMemo<ItemRow[]>(() => {
    const result: ItemRow[] = [];

    rooms.forEach((room) => {
      if (room.is_suspended) return;
      room.items.forEach((item) => {
        if (item.is_suspended) return;

        const analysis = CostEngine.analyze(item);
        const typeName = ITEM_CONFIG[item.type]?.name ?? item.type;
        const specs = PricingEngine.getItemSpecs(item);

        result.push({
          id: item.id,
          roomId: room.id,
          roomName: room.name,
          item,
          typeName,
          specs,
          analysis,
        });
      });
    });

    // Sort: loss → warning → unknown → profit; then by profit amount asc
    return result.sort((a, b) => {
      const sDiff = STATUS_ORDER[a.analysis.status] - STATUS_ORDER[b.analysis.status];
      if (sDiff !== 0) return sDiff;
      return a.analysis.profitAmount - b.analysis.profitAmount;
    });
  }, [rooms]);

  // ── Aggregates ────────────────────────────────────────────────────────────
  const totals = useMemo(() => {
    let revenue = 0;
    let cost = 0;
    let fabric = 0;
    let labor = 0;
    let rail = 0;

    rows.forEach(({ analysis: a }) => {
      revenue += a.sellingPrice;
      cost += a.totalCost;
      fabric += (a.fabricCost ?? 0) + (a.sheerCost ?? 0);
      labor += a.laborCost ?? 0;
      rail += (a.railCost ?? 0) + (a.accCost ?? 0);
    });

    const profit = revenue - cost;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    const unknownCount = rows.filter((r) => r.analysis.status === 'unknown').length;
    const lossCount = rows.filter((r) => r.analysis.status === 'loss').length;

    return { revenue, cost, profit, margin, fabric, labor, rail, unknownCount, lossCount };
  }, [rows]);

  const handleTargetChange = (delta: number) => {
    trigger('selection');
    setTargetMargin((p) => Math.max(5, Math.min(95, p + delta)));
  };

  const toggleExpand = (id: string) => {
    trigger('light');
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="ภาพรวมกำไรขาดทุน" variant="fullscreen">
      <div className="flex flex-col h-full bg-background pb-safe-area overflow-hidden">
        {/* ── 1. Summary Ring + Target Control ── */}
        <div className="bg-gradient-to-b from-muted/40 to-background border-b border-border/50 shrink-0">
          <FinancialRing
            revenue={totals.revenue}
            cost={totals.cost}
            profit={totals.profit}
            targetMargin={targetMargin}
          />

          <div className="flex items-center justify-center gap-6 pb-4">
            <button
              onClick={() => handleTargetChange(-5)}
              className="w-9 h-9 rounded-full bg-muted hover:bg-muted/70 flex items-center justify-center active:scale-90 transition-all"
            >
              <TrendingDown className="w-4 h-4 text-muted-foreground" />
            </button>
            <div className="text-center">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Target Margin
              </div>
              <div className="text-xl font-bold tabular-nums">{targetMargin}%</div>
            </div>
            <button
              onClick={() => handleTargetChange(5)}
              className="w-9 h-9 rounded-full bg-muted hover:bg-muted/70 flex items-center justify-center active:scale-90 transition-all"
            >
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* ── 2. Summary Cards ── */}
        <div className="grid grid-cols-3 gap-2 px-4 pt-3 pb-1 shrink-0">
          {[
            { label: 'ยอดขายรวม', value: totals.revenue, color: 'text-emerald-600' },
            { label: 'ต้นทุนรวม', value: totals.cost, color: 'text-rose-500' },
            {
              label: 'กำไรสุทธิ',
              value: totals.profit,
              color: totals.profit >= 0 ? 'text-emerald-600' : 'text-rose-500',
            },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className="bg-card border border-border/50 rounded-xl p-2.5 text-center"
            >
              <div className="text-[9px] text-muted-foreground uppercase tracking-wide mb-1">
                {label}
              </div>
              <div className={cn('text-sm font-bold tabular-nums leading-tight', color)}>
                {blind ? '••••' : fmtTH(value)}
              </div>
            </div>
          ))}
        </div>

        {/* ── 3. Cost Structure Bar ── */}
        {totals.cost > 0 && (
          <CostStructureBar
            fabric={totals.fabric}
            labor={totals.labor}
            rail={totals.rail}
            total={totals.cost}
          />
        )}

        {/* ── 4. Alert Banners ── */}
        {(totals.lossCount > 0 || totals.unknownCount > 0) && (
          <div className="px-4 pb-2 space-y-1.5 shrink-0">
            {totals.lossCount > 0 && (
              <div className="flex items-center gap-2 p-2.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200/50 rounded-xl text-xs text-rose-700 dark:text-rose-400">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>
                  มี <strong>{totals.lossCount}</strong> รายการขาดทุน — ราคาขายต่ำกว่าต้นทุน
                </span>
              </div>
            )}
            {totals.unknownCount > 0 && (
              <div className="flex items-center gap-2 p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/50 rounded-xl text-xs text-amber-700 dark:text-amber-400">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>
                  มี <strong>{totals.unknownCount}</strong> รายการที่ต้องการต้นทุน — ตั้งค่าใน{' '}
                  <strong>Vault</strong>
                </span>
              </div>
            )}
          </div>
        )}

        {/* ── 5. Item List ── */}
        <div className="flex-1 overflow-y-auto">
          {/* List header */}
          <div className="flex items-center justify-between px-4 py-2 sticky top-0 bg-background/80 backdrop-blur z-10 border-b border-border/30">
            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
              <DollarSign className="w-3.5 h-3.5" />
              รายการสินค้า ({rows.length})
            </div>
            <button
              onClick={() => setBlind((p) => !p)}
              className="text-muted-foreground hover:text-foreground transition-colors p-1"
            >
              {blind ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>

          {/* Items */}
          <div
            className={cn(
              'px-4 py-3 space-y-2',
              blind && 'blur-sm pointer-events-none select-none'
            )}
          >
            {rows.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <DollarSign className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">ไม่มีรายการในโครงการนี้</p>
              </div>
            ) : (
              rows.map((row) => (
                <ItemCard
                  key={row.id}
                  row={row}
                  expanded={expandedId === row.id}
                  onToggle={() => toggleExpand(row.id)}
                  onJumpToInventory={handleJumpToInventory}
                />
              ))
            )}
          </div>

          {/* Low margin warning (global) */}
          {totals.margin < targetMargin && totals.revenue > 0 && (
            <div className="mx-4 mb-4 flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/50 rounded-xl text-amber-700 dark:text-amber-400 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <strong>อัตรากำไรต่ำกว่าเป้าหมาย</strong>
                <p className="mt-0.5 opacity-90">
                  กำไรปัจจุบัน {totals.margin.toFixed(1)}% — ต่ำกว่าเป้า {targetMargin}%
                  อาจเกิดจากต้นทุนผ้าสูงหรือยังไม่ได้บวกค่าแรงในราคาขาย
                </p>
              </div>
            </div>
          )}

          <div className="h-8" />
        </div>
      </div>
    </Modal>
  );
};
