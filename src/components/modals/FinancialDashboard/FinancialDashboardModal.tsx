// src/components/modals/FinancialDashboard/FinancialDashboardModal.tsx
//
// "การเงินของงาน" — บอกเท่าที่รู้ ไม่อ้างกำไร (2026-06: เจ้าของยืนยันว่าทุนหลายส่วน
// ไม่แน่นอน — ราคาผ้า/ค่าเย็บ/ขนส่ง/ช่างเหมา — จึงห้ามสรุป "กำไรสุทธิ"):
//   • หัว = เงินสดจริง: รับแล้ว − จ่ายแล้ว = คงเหลือในมือ (+ ราคางาน/ค้างเก็บ อ้างอิง)
//   • แถบประมาณการ = ทุนที่รู้ Σ + coverage "รู้ทุน N/M" + ส่วนที่ไม่นับ
//   • แท็บ "เงินเข้า-ออก" (มัดจำ + เช็คลิสท์จ่าย) | "ทุนที่รู้" (รายการ + alert เดิม)

import React, { useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useAppStore } from '@/store/useAppStore';
import { fmtTH } from '@/utils/formatters';
import { CostEngine } from '@/lib/pricing/CostEngine';
import { PricingEngine } from '@/lib/pricing/PricingEngine';
import { useCalculations } from '@/hooks/useCalculations';
import { ITEM_CONFIG } from '@/config/constants';
import { cn } from '@/lib/utils';
import { Metric } from '@/components/ui/Metric';
import { Alert } from '@/components/ui/Alert';
import { useHaptic } from '@/hooks/useHaptic';
import {
  ArrowLeftRight,
  Scale,
  Eye,
  EyeOff,
  Info,
} from 'lucide-react';
import { CostStructureBar } from './CostStructureBar';
import { ItemCard } from './ItemCard';
import { MoneyTab } from './MoneyTab';
import { STATUS_ORDER, type ItemRow } from './constants';

type TabId = 'money' | 'costs';

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
  const costInclude = useAppStore((s) => s.costInclude);
  const receipts = useAppStore((s) => s.receipts);
  const expenses = useAppStore((s) => s.expenses);
  const { finalTotal } = useCalculations();
  const { trigger } = useHaptic();

  const [activeTab, setActiveTab] = useState<TabId>('money');
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

    // Sort: loss → warning → unknown → profit; then by ส่วนต่าง asc
    return result.sort((a, b) => {
      const sDiff = STATUS_ORDER[a.analysis.status] - STATUS_ORDER[b.analysis.status];
      if (sDiff !== 0) return sDiff;
      return a.analysis.profitAmount - b.analysis.profitAmount;
    });
    // cost maps เป็น dependency เพราะ CostEngine.analyze อ่านค่าผ่าน getState() (ไม่ได้ใช้ตรงๆ ใน memo)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rooms, fabricCosts, wallpaperCosts, areaCosts, laborCosts, accessoryCosts, costInclude]);

  // ── Aggregates — ทุนที่รู้ (ประมาณการ) + เงินจริง ─────────────────────────
  const totals = useMemo(() => {
    let knownCost = 0;
    let fabric = 0;
    let labor = 0;
    let rail = 0;
    const excluded = new Set<string>();

    rows.forEach(({ analysis: a }) => {
      knownCost += a.totalCost;
      fabric += (a.fabricCost ?? 0) + (a.sheerCost ?? 0);
      labor += a.laborCost ?? 0;
      rail += (a.railCost ?? 0) + (a.accCost ?? 0);
      a.excludedComponents.forEach((c) => excluded.add(c));
    });

    const knownCount = rows.filter((r) => r.analysis.status !== 'unknown').length;
    const unknownCount = rows.filter((r) => r.analysis.status === 'unknown').length;
    const lossCount = rows.filter((r) => r.analysis.status === 'loss').length;

    const received = receipts.reduce((s, r) => s + r.amount, 0);
    const paidOut = expenses.reduce((s, e) => s + (e.paid ? e.amount : 0), 0);

    return {
      knownCost,
      fabric,
      labor,
      rail,
      excluded: [...excluded],
      knownCount,
      unknownCount,
      lossCount,
      received,
      paidOut,
      onHand: received - paidOut,
      uncollected: Math.max(finalTotal - received, 0),
    };
  }, [rows, receipts, expenses, finalTotal]);

  const mask = (v: number) => (blind ? '••••' : fmtTH(v));

  const TABS: { id: TabId; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: 'money', label: 'เงินเข้า-ออก', icon: ArrowLeftRight, badge: receipts.length + expenses.length },
    { id: 'costs', label: 'ทุนที่รู้', icon: Scale, badge: rows.length },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="การเงินของงาน" variant="fullscreen">
      <div className="flex flex-col h-full bg-background pb-safe-area overflow-hidden">
        {/* ── 1. เงินสดจริง (ความจริงเดียวที่ชัวร์ 100%) ── */}
        <div className="bg-muted/30 border-b border-border/50 shrink-0 px-4 pt-3 pb-3 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="grid grid-cols-3 gap-2.5 flex-1">
              <div className="bg-card border border-border/50 rounded-2xl p-3">
                <Metric label="รับแล้ว" value={mask(totals.received)} tone="money" size="md" />
              </div>
              <div className="bg-card border border-border/50 rounded-2xl p-3">
                <Metric label="จ่ายแล้ว" value={mask(totals.paidOut)} tone="cost" size="md" />
              </div>
              <div className="bg-card border border-border/50 rounded-2xl p-3">
                <Metric
                  label="คงเหลือในมือ"
                  value={mask(totals.onHand)}
                  tone={totals.onHand >= 0 ? 'money' : 'cost'}
                  size="md"
                />
              </div>
            </div>
            <button
              onClick={() => setBlind((p) => !p)}
              className="text-muted-foreground hover:text-foreground transition-colors p-1.5 mt-1"
              aria-label="ซ่อน/แสดงตัวเลข"
            >
              {blind ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>

          {/* แถวอ้างอิง: ราคางาน (ใบเสนอ) + ค้างเก็บ */}
          <div className="flex items-center justify-between text-xs text-muted-foreground px-0.5">
            <span>
              ราคางาน{' '}
              <span className="font-mono tabular-nums font-bold text-foreground">
                ฿{mask(finalTotal)}
              </span>
            </span>
            {finalTotal > 0 && (
              <span>
                ค้างเก็บ{' '}
                <span
                  className={cn(
                    'font-mono tabular-nums font-bold',
                    totals.uncollected > 0 ? 'text-amber-600' : 'text-emerald-600'
                  )}
                >
                  ฿{mask(totals.uncollected)}
                </span>
              </span>
            )}
          </div>

          {/* แถวประมาณการ: ทุนที่รู้ — บอกเท่าที่รู้ ไม่อ้างกำไร */}
          <div className="flex items-start gap-2 bg-card/60 border border-border/50 rounded-xl px-3 py-2 text-xs text-muted-foreground">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" strokeWidth={1.5} />
            <div className="leading-relaxed">
              ทุนที่รู้ ≈{' '}
              <span className="font-mono tabular-nums font-bold text-foreground">
                ฿{mask(totals.knownCost)}
              </span>{' '}
              · รู้ทุน {totals.knownCount}/{rows.length} รายการ
              <span className="block mt-0.5 text-muted-foreground/80">
                ยังไม่รวม:{' '}
                {[...totals.excluded.map((c) => `${c} (ปิดนับ)`), 'ค่าขนส่ง', 'ค่าใช้จ่ายอื่น'].join(
                  ' · '
                )}
              </span>
            </div>
          </div>
        </div>

        {/* ── 2. Tab bar ── */}
        <div className="flex border-b border-border/50 shrink-0">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                trigger('selection');
                setActiveTab(tab.id);
              }}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px',
                activeTab === tab.id
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <tab.icon className="w-4 h-4 shrink-0" strokeWidth={1.5} />
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span
                  className={cn(
                    'text-xs px-1.5 py-0.5 rounded-full font-bold',
                    activeTab === tab.id
                      ? 'bg-foreground text-background'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── 3. Content ── */}
        <div
          className={cn(
            'flex-1 overflow-y-auto',
            blind && 'blur-sm pointer-events-none select-none'
          )}
        >
          {activeTab === 'money' && (
            <div className="px-4 py-4">
              <MoneyTab
                jobPrice={finalTotal}
                estimates={{ fabric: totals.fabric, labor: totals.labor, rail: totals.rail }}
              />
              <div className="h-8" />
            </div>
          )}

          {activeTab === 'costs' && (
            <>
              {/* Cost Structure Bar — โครงสร้างทุนที่รู้ (ไม่ใช่คำกล่าวอ้างกำไร) */}
              {totals.knownCost > 0 && (
                <CostStructureBar
                  fabric={totals.fabric}
                  labor={totals.labor}
                  rail={totals.rail}
                  total={totals.knownCost}
                />
              )}

              {/* Alert Banners */}
              {(totals.lossCount > 0 || totals.unknownCount > 0) && (
                <div className="px-4 pt-2 pb-2 space-y-1.5">
                  {totals.lossCount > 0 && (
                    <Alert variant="destructive">
                      <span>
                        มี <strong>{totals.lossCount}</strong> รายการขายต่ำกว่าทุนที่รู้ —
                        ขาดทุนแน่นอนยิ่งรวมค่าใช้จ่ายอื่น
                      </span>
                    </Alert>
                  )}
                  {totals.unknownCount > 0 && (
                    <Alert variant="warning">
                      <span>
                        มี <strong>{totals.unknownCount}</strong> รายการที่ต้องการต้นทุน — ตั้งราคาทุนใน{' '}
                        <strong>{'ข้อมูลสินค้า & ราคา'}</strong>
                      </span>
                    </Alert>
                  )}
                </div>
              )}

              {/* Item list */}
              <div className="px-4 py-3 space-y-2">
                {rows.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground">
                    <Scale className="w-10 h-10 mx-auto mb-2 opacity-30" strokeWidth={1.5} />
                    <p className="text-sm">ไม่มีรายการในโครงการนี้</p>
                  </div>
                ) : (
                  rows.map((row) => (
                    <ItemCard
                      key={row.id}
                      row={row}
                      expanded={expandedId === row.id}
                      onToggle={() => {
                        trigger('light');
                        setExpandedId((prev) => (prev === row.id ? null : row.id));
                      }}
                      onOpenCodeDetail={handleOpenCodeDetail}
                    />
                  ))
                )}
              </div>

              <div className="h-8" />
            </>
          )}
        </div>
      </div>
    </Modal>
  );
};
