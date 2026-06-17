// src/components/modals/CodeDetailModal.tsx
// รายละเอียดรหัส (Code Detail) — hub กลางของรหัสหนึ่ง:
//   • ต้นทุน/ราคาขาย/หมายเหตุ จากคลังรหัส (vault ตาม category)
//   • จุดที่ใช้รหัสนี้ทั้งโครงการ (where-used) → กดเพื่อกระโดดไปแก้ที่จุดนั้น
// เปิดจากทุกที่ที่อ้างถึงรหัส (Financial Dashboard, คลังต้นทุน, การ์ดสินค้า) ผ่าน modal stack

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { useAppStore } from '@/store/useAppStore';
import { useInventory } from '@/hooks/useInventory';
import { useCodeUsage, type CodeUsage } from '@/hooks/useCodeUsage';
import { categoryVault, categoryLabel, categoryCostUnit } from '@/lib/vault';
import { fmtTH } from '@/utils/formatters';
import { cn } from '@/lib/utils';
import { Metric } from '@/components/ui/Metric';
import { ArrowRight, BookOpen, MapPin, Package, Plus } from 'lucide-react';

interface CodeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  code?: string;
  category?: string;
}

const fmtQty = (qty: number, unit: string) => (unit === 'ม้วน' ? Math.ceil(qty) : fmtTH(qty));

export const CodeDetailModal: React.FC<CodeDetailModalProps> = ({
  isOpen,
  onClose,
  code = '',
  category = '',
}) => {
  const openModal = useAppStore((s) => s.openModal);
  const fabricCosts = useAppStore((s) => s.fabricCosts);
  const wallpaperCosts = useAppStore((s) => s.wallpaperCosts);
  const areaCosts = useAppStore((s) => s.areaCosts);

  const { items } = useInventory(category);
  const { usages, totalQty, unit } = useCodeUsage(code, category);

  const vault = categoryVault(category);
  const costMap = vault === 'wallpaper' ? wallpaperCosts : vault === 'area' ? areaCosts : fabricCosts;
  const cost = costMap[code] ?? 0;
  const costUnit = categoryCostUnit(category);

  const entry = items.find((it) => it.code.toUpperCase() === code.toUpperCase());
  const isPlaceholder = code.startsWith('(');
  const totalCost = cost > 0 ? cost * totalQty : 0;

  const handleOpenCatalog = () => {
    openModal('materialSummary', {
      initialTab: 'catalog',
      initialCategory: category,
      prefillCode: code,
    });
  };

  const handleJumpItem = (u: CodeUsage) => {
    if (!u.item) return;
    openModal('item', {
      mode: 'edit',
      roomId: u.roomId,
      itemId: u.itemId,
      itemType: u.item.type,
      initialData: u.item,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`รหัส ${code}`}
      description={categoryLabel(category)}
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* ── คลังรหัส: ต้นทุน / ราคาขาย / หมายเหตุ ── */}
        <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              ราคา & รหัส
            </span>
            {cost > 0 ? (
              <span className="text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400">
                ทุน ฿{fmtTH(cost)}/{costUnit}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground/60 italic">ยังไม่มีราคาทุน</span>
            )}
          </div>

          {entry ? (
            <div className="space-y-0.5">
              {entry.default_price_per_m > 0 && (
                <div className="text-xs text-muted-foreground">
                  ราคาขาย ฿{fmtTH(entry.default_price_per_m)}/ม.
                </div>
              )}
              {entry.note && (
                <div className="text-xs text-muted-foreground/70">{entry.note}</div>
              )}
            </div>
          ) : (
            !isPlaceholder && (
              <div className="text-xs text-amber-700 dark:text-amber-400">
                ยังไม่อยู่ใน ราคา & รหัส
              </div>
            )
          )}

          {/* ปริมาณรวม + ทุนรวมทั้งโครงการ — KPI strip */}
          {totalQty > 0 && (
            <div
              className={cn(
                'pt-3 border-t border-border/40',
                totalCost > 0 && 'grid grid-cols-2 gap-2'
              )}
            >
              <Metric
                label="รวมใช้ทั้งโครงการ"
                value={`${fmtQty(totalQty, unit)} ${unit}`}
                tone="neutral"
              />
              {totalCost > 0 && (
                <Metric
                  label="ทุนรวม"
                  value={`฿${fmtTH(totalCost)}`}
                  tone="money"
                  align="right"
                />
              )}
            </div>
          )}

          {!isPlaceholder && (
            <button
              onClick={handleOpenCatalog}
              className="w-full flex items-center justify-center gap-1.5 h-11 rounded-lg bg-muted text-foreground text-sm font-medium hover:bg-muted/70 transition-colors active:scale-95"
            >
              {entry || cost > 0 ? (
                <>
                  <BookOpen className="w-3.5 h-3.5" strokeWidth={1.5} /> เปิดใน ราคา & รหัส
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" strokeWidth={1.5} /> เพิ่มใน ราคา & รหัส
                </>
              )}
            </button>
          )}
        </div>

        {/* ── จุดที่ใช้รหัสนี้ (where-used) ── */}
        <div>
          <div className="flex items-center gap-1.5 px-1 mb-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
            <MapPin className="w-3.5 h-3.5" strokeWidth={1.5} />
            ใช้ใน {usages.length} จุด
          </div>

          {usages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-2 text-muted-foreground">
              <Package className="w-8 h-8 opacity-30" strokeWidth={1.5} />
              <p className="text-sm">ยังไม่มีจุดที่ใช้รหัสนี้</p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border/50">
              {usages.map((u) => (
                <button
                  key={`${u.roomId}-${u.itemId}`}
                  onClick={() => handleJumpItem(u)}
                  disabled={!u.item}
                  className={cn(
                    'w-full text-left px-3 py-2.5 flex items-center justify-between gap-2 transition-colors group',
                    u.item ? 'hover:bg-muted/50 active:bg-muted' : 'opacity-50 cursor-default'
                  )}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground truncate group-hover:text-muted-foreground transition-colors">
                      {u.roomName}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{u.desc}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-mono text-muted-foreground/70">
                      {fmtQty(u.qty, u.unit)} {u.unit}
                    </span>
                    {u.item && (
                      <ArrowRight className="w-3.5 h-3.5 text-foreground opacity-0 group-hover:opacity-100 transition-opacity" strokeWidth={1.5} />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
