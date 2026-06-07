// src/components/modals/FinancialDashboard/FinancialDashboardModal.tsx

import React, { useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useAppStore } from '@/store/useAppStore';
import { fmtTH } from '@/utils/formatters';
import { CostEngine } from '@/lib/pricing/CostEngine';
import { PricingEngine } from '@/lib/pricing/PricingEngine';
import { ITEM_CONFIG } from '@/config/constants';
import { cn } from '@/lib/utils';
import { useHaptic } from '@/hooks/useHaptic';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { FinancialRing } from './FinancialRing';
import { CostStructureBar } from './CostStructureBar';
import { ItemCard } from './ItemCard';
import { STATUS_ORDER, type ItemRow } from './constants';

export const FinancialDashboardModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const rooms = useAppStore((s) => s.rooms);
  const openModal = useAppStore((s) => s.openModal);
  // ต้นทุนทุก vault — CostEngine.analyze อ่านผ่าน getState() เอง, select ที่นี่เป็น cache-invalidation hint
  const fabricCosts = useAppStore((s) => s.fabricCosts);
  const wallpaperCosts = useAppStore((s) => s.wallpaperCosts);
  const areaCosts = useAppStore((s) => s.areaCosts);
  const laborCosts = useAppStore((s) => s.laborCosts);
  const accessoryCosts = useAppStore((s) => s.accessoryCosts);
  const { trigger } = useHaptic();

  const [targetMargin, setTargetMargin] = useState(30);
  const [blind, setBlind] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // กดรหัส → เปิด "รายละเอียดรหัส (Code Detail)" — ต้นทุน/ราคา + จุดที่ใช้รหัสนี้ + กระโดดไปแก้
  const handleOpenCodeDetail = (code: string, tab: string) => {
    trigger('light');
    openModal('codeDetail', { code, category: tab });
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
    // cost maps เป็น dependency เพราะ CostEngine.analyze อ่านค่าผ่าน getState() (ไม่ได้ใช้ตรงๆ ใน memo)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rooms, fabricCosts, wallpaperCosts, areaCosts, laborCosts, accessoryCosts]);

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
        <div className="bg-muted/30 border-b border-border/50 shrink-0">
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
              <TrendingDown className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
            </button>
            <div className="text-center">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">
                Target Margin
              </div>
              <div className="text-xl font-bold font-mono tabular-nums">{targetMargin}%</div>
            </div>
            <button
              onClick={() => handleTargetChange(5)}
              className="w-9 h-9 rounded-full bg-muted hover:bg-muted/70 flex items-center justify-center active:scale-90 transition-all"
            >
              <TrendingUp className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
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
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                {label}
              </div>
              <div className={cn('text-sm font-bold font-mono tabular-nums leading-tight', color)}>
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
                  onOpenCodeDetail={handleOpenCodeDetail}
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
