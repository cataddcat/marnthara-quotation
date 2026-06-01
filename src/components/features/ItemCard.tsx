import React, { useState, useMemo } from 'react';
import { ItemData } from '@/types';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAppStore } from '@/store/useAppStore';
import { useConfirm } from '@/hooks/useConfirm';
import { fmtTH, toNum } from '@/utils/formatters';
import { PricingEngine } from '@/lib/pricing/PricingEngine';
import { CostEngine } from '@/lib/pricing/CostEngine';
import { ITEM_CONFIG } from '@/config/constants';
import { ITEM_TYPES, LAYER_MODES } from '@/config/enums';
import { isItemIncomplete, incompleteLabel } from '@/lib/item-status';
import { ChevronDown, Edit2, Copy, Trash2, EyeOff, CheckCircle2, AlertTriangle, Ruler } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ItemCardProps {
  item: ItemData;
  index: number;
  roomId: string;
  onEdit: () => void;
}

export const ItemCard: React.FC<ItemCardProps> = ({ item, index, roomId, onEdit }) => {
  const removeItem = useAppStore((state) => state.removeItem);
  const duplicateItem = useAppStore((state) => state.duplicateItem);
  const updateItem = useAppStore((state) => state.updateItem);
  const { confirm } = useConfirm();

  const [isExpanded, setIsExpanded] = useState(false);

  const priceResult = useMemo(() => PricingEngine.calculateDetailedPrice(item), [item]);

  const costAnalysis = useMemo(() => {
    if (item.is_suspended) return null;
    const result = CostEngine.analyze(item);
    return result.status !== 'unknown' ? result : null;
  }, [item]);

  // "ยังไม่เสร็จ" — มีขนาดแล้วแต่ยังไม่ได้ใส่ผ้า/รายละเอียดที่จำเป็น
  const incomplete = useMemo(
    () => !item.is_suspended && isItemIncomplete(item),
    [item]
  );

  const { title, dimSpec } = useMemo(() => {
    const config = ITEM_CONFIG[item.type];
    const rawSpecs = PricingEngine.getItemSpecs(item);
    const cleanSpecs = rawSpecs.filter((s) => s && s.trim() !== '');
    // First spec = dimensions (ใช้เป็น fallback ของ hero), ส่วนอื่นสร้างเป็นชิปด้านล่าง
    return {
      title: config?.name || 'สินค้า',
      dimSpec: cleanSpecs[0] || '',
    };
  }, [item]);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const isConfirmed = await confirm({
      title: 'ลบรายการนี้?',
      description: `คุณต้องการลบ "${title}" ออกจากห้องใช่หรือไม่?`,
      confirmLabel: 'ลบรายการ',
      variant: 'destructive',
    });
    if (isConfirmed) removeItem(roomId, item.id);
  };

  const handleToggleSuspension = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateItem(roomId, item.id, { is_suspended: !item.is_suspended });
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit();
  };

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation();
    duplicateItem(roomId, item.id);
  };

  // Extract breakdown values safely
  const bd = priceResult.breakdown;
  const fabricYards = bd?.fabricYards ?? 0;
  const sheerYards = bd?.sheerYards ?? 0;
  const rolls = bd?.rolls ?? 0;
  const areaSqm = bd?.areaSqm ?? 0;
  const areaSqyd = bd?.areaSqyd ?? 0;

  // Size (safe cast — all non-removal types have width_m/height_m)
  const itemRec = item as unknown as Record<string, unknown>;
  const width = toNum(itemRec.width_m as string | number | null | undefined);
  const height = toNum(itemRec.height_m as string | number | null | undefined);
  const hasSize = width > 0 && height > 0;

  // ขนาดแบบตัวเลขล้วน "กว้าง × สูง" — ผู้ใช้รู้อยู่แล้วว่าเป็นเมตร (hero)
  const dimNumbers = useMemo(() => {
    if (item.type === ITEM_TYPES.REMOVAL) return '';
    if (item.type === ITEM_TYPES.WALLPAPER) {
      const widthTotal = (item.widths || []).reduce((sum, w) => sum + toNum(w), 0);
      const h = toNum(item.height_m);
      return widthTotal > 0 && h > 0 ? `${widthTotal.toFixed(2)} × ${h.toFixed(2)}` : '';
    }
    return hasSize ? `${width.toFixed(2)} × ${height.toFixed(2)}` : '';
  }, [item, hasSize, width, height]);

  // ชิป Row 3 — ชนิด + รูปแบบเก็บ + รายละเอียดรอง (สร้างจาก field ตรงๆ ไม่มี prefix)
  const typeChips = useMemo<string[]>(() => {
    const chips: string[] = [];
    switch (item.type) {
      case ITEM_TYPES.CURTAIN:
        if (item.style) chips.push(item.style);
        if (item.opening_style) chips.push(item.opening_style);
        if (item.layer_mode === LAYER_MODES.DOUBLE) chips.push('ทึบ+โปร่ง');
        else if (item.layer_mode === LAYER_MODES.SHEER) chips.push('โปร่ง');
        break;
      case ITEM_TYPES.WALLPAPER:
        if (item.wallpaper_code) chips.push(item.wallpaper_code);
        break;
      case ITEM_TYPES.REMOVAL: {
        const qty = toNum(item.quantity);
        if (qty > 0) chips.push(`${qty} จุด/ชุด`);
        break;
      }
      default: {
        const rec = item as unknown as Record<string, unknown>;
        const s = (k: string) => (typeof rec[k] === 'string' ? (rec[k] as string).trim() : '');
        const variant = s('fabric_variant');
        const opening = s('opening_style');
        const side = s('adjustment_side');
        const code = s('code');
        if (variant) chips.push(variant);
        if (opening) chips.push(opening);
        if (side) chips.push(`ปรับ ${side}`);
        if (code) chips.push(code);
        break;
      }
    }
    return chips;
  }, [item]);

  const isAreaType =
    item.type === ITEM_TYPES.WOODEN_BLIND ||
    item.type === ITEM_TYPES.ROLLER_BLIND ||
    item.type === ITEM_TYPES.VERTICAL_BLIND ||
    item.type === ITEM_TYPES.ALUMINUM_BLIND ||
    item.type === ITEM_TYPES.PARTITION ||
    item.type === ITEM_TYPES.PLEATED_SCREEN;

  return (
    <div
      className={cn(
        'rounded-2xl border bg-card transition-all duration-200',
        item.is_suspended
          ? 'opacity-60 grayscale border-dashed border-border'
          : 'border-border shadow-sm hover:shadow-md hover:border-primary/20'
      )}
    >
      {/* Collapsed header — always visible, clickable */}
      <div
        className="flex flex-col gap-1.5 p-3.5 cursor-pointer select-none"
        onClick={() => setIsExpanded((prev) => !prev)}
      >
        {/* Row 1: Index + Title + Price + Chevron */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-xs font-bold text-muted-foreground/70 tracking-wider uppercase shrink-0">
              #{index + 1}
            </span>
            <span className="font-semibold text-foreground truncate text-[15px]">{title}</span>
            {incomplete && (
              <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/60 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/40">
                <AlertTriangle className="w-3 h-3" />
                {incompleteLabel(item)}
              </span>
            )}
          </div>
          <div className="flex items-center shrink-0">
            <span
              className={cn(
                'text-base font-bold tabular-nums tracking-tight',
                item.is_suspended
                  ? 'text-muted-foreground line-through'
                  : 'text-emerald-600 dark:text-emerald-400'
              )}
            >
              {fmtTH(priceResult.total)}
            </span>
          </div>
          <ChevronDown
            className={cn(
              'w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200',
              isExpanded && 'rotate-180'
            )}
          />
        </div>

        {/* Row 2: Dimensions — hero ตัวเลขล้วน (priority #1 หน้างาน) */}
        {(dimNumbers || dimSpec) && (
          <div className="flex items-center gap-1.5 text-[15px] font-bold text-sky-600 dark:text-sky-400 leading-snug">
            {dimNumbers && <Ruler className="w-3.5 h-3.5 shrink-0" />}
            <span className="truncate">{dimNumbers || dimSpec}</span>
          </div>
        )}

        {/* Row 3: ชนิด + รูปแบบเก็บ — ชิป */}
        {typeChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            {typeChips.map((chip, i) => (
              <span
                key={i}
                className="text-[11px] leading-none px-1.5 py-1 rounded-md bg-muted text-muted-foreground font-medium"
              >
                {chip}
              </span>
            ))}
          </div>
        )}

        {/* Fallback: no specs at all */}
        {!dimNumbers && !dimSpec && typeChips.length === 0 && (
          <div className="text-xs text-muted-foreground/50 italic leading-relaxed">
            ยังไม่ระบุรายละเอียด
          </div>
        )}
      </div>

      {/* Expanded detail panel */}
      {isExpanded && (
        <div className="border-t border-border/50 px-4 pb-4 pt-3 animate-fade-in">
          {/* Detail rows */}
          <div className="space-y-2 mb-4">
            {/* ต้นทุน / กำไร */}
            {costAnalysis && (
              <div className="flex justify-between text-sm pb-2 mb-1 border-b border-border/40">
                <span className="text-muted-foreground">ต้นทุน / กำไร</span>
                <div className="flex items-center gap-2 tabular-nums font-medium">
                  <span className="text-rose-500 dark:text-rose-400">
                    {fmtTH(costAnalysis.totalCost)}
                  </span>
                  <span className="text-muted-foreground/40">/</span>
                  <span
                    className={cn(
                      costAnalysis.profitAmount >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-500 dark:text-rose-400'
                    )}
                  >
                    {costAnalysis.profitAmount >= 0 ? '+' : ''}
                    {fmtTH(costAnalysis.profitAmount)}
                  </span>
                </div>
              </div>
            )}

            {/* ขนาด */}
            {hasSize && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">ขนาด</span>
                <span className="font-semibold text-sky-600 dark:text-sky-400">
                  {width.toFixed(2)} × {height.toFixed(2)} ม.
                </span>
              </div>
            )}

            {/* ผ้าม่าน: ผ้าหลัก */}
            {item.type === ITEM_TYPES.CURTAIN && fabricYards > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">ผ้าทึบ</span>
                <span className="font-semibold text-orange-500">{fabricYards.toFixed(2)} หลา</span>
              </div>
            )}

            {/* ผ้าม่าน: ผ้าโปร่ง (ทึบ+โปร่ง) */}
            {item.type === ITEM_TYPES.CURTAIN && sheerYards > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">ผ้าโปร่ง</span>
                <span className="font-semibold text-orange-400">{sheerYards.toFixed(2)} หลา</span>
              </div>
            )}

            {/* วอลล์เปเปอร์: จำนวนม้วน */}
            {item.type === ITEM_TYPES.WALLPAPER && rolls > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">จำนวนม้วน</span>
                <span className="font-semibold text-orange-500">{Math.ceil(rolls)} ม้วน</span>
              </div>
            )}

            {/* สินค้าพื้นที่: ตร.ม. */}
            {isAreaType && areaSqm > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">พื้นที่</span>
                <span className="font-semibold text-sky-600 dark:text-sky-400">
                  {areaSqm.toFixed(2)} ตร.ม.
                </span>
              </div>
            )}

            {/* สินค้าพื้นที่: ตร.ล. */}
            {isAreaType && areaSqyd > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground" />
                <span className="font-semibold text-sky-500 dark:text-sky-400">
                  {areaSqyd.toFixed(2)} ตร.ล.
                </span>
              </div>
            )}

            {/* หมายเหตุ */}
            {item.notes && (
              <div className="flex justify-between items-start text-sm gap-4">
                <span className="text-muted-foreground shrink-0">หมายเหตุ</span>
                <span className="font-medium text-slate-500 dark:text-slate-400 text-right">{item.notes}</span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-2 border-t border-border/40">
            <button
              onClick={handleEdit}
              className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors active:scale-95"
            >
              <Edit2 className="w-3.5 h-3.5" />
              แก้ไข
            </button>
            <button
              onClick={handleDuplicate}
              className="flex items-center justify-center h-10 w-10 rounded-xl text-muted-foreground hover:bg-muted transition-colors active:scale-90"
              title="คัดลอก"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleToggleSuspension}
              className="flex items-center justify-center h-10 w-10 rounded-xl text-muted-foreground hover:bg-muted transition-colors active:scale-90"
              title={item.is_suspended ? 'เปิดใช้งาน' : 'ซ่อนรายการ'}
            >
              {item.is_suspended ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <EyeOff className="w-3.5 h-3.5" />
              )}
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center justify-center h-10 w-10 rounded-xl text-destructive hover:bg-destructive/10 transition-colors active:scale-90"
              title="ลบรายการ"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const ItemCardSkeleton: React.FC = () => (
  <div className="rounded-2xl border border-border bg-card p-3.5 space-y-2.5">
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Skeleton className="w-5 h-2.5 shrink-0" />
        <Skeleton className="h-4 w-28" />
      </div>
      <Skeleton className="w-16 h-4 shrink-0" />
      <Skeleton className="w-4 h-4 shrink-0 rounded-full" />
    </div>
    <Skeleton className="h-3 w-3/4" />
    <Skeleton className="h-3 w-1/2" />
  </div>
);
