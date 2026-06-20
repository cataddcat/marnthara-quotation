import React, { useState, useMemo } from 'react';
import { ItemData } from '@/types';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAppStore } from '@/store/useAppStore';
import { useConfirm } from '@/hooks/useConfirm';
import { fmtTH, toNum } from '@/utils/formatters';
import { PricingEngine } from '@/lib/pricing/PricingEngine';
import { ITEM_TYPES, LAYER_MODES, FAVORITE_CATEGORIES } from '@/config/enums';
import { isItemIncomplete, incompleteLabel, requiresOpeningStyle } from '@/lib/item-status';
import { itemTitle } from '@/lib/item-display';
import { openingStyleLabel } from '@/lib/opening-style';
import { Metric } from '@/components/ui/Metric';
import { DATA_TONE_TEXT, DATA_TONE_PILL, MATERIAL_ACCENT, MATERIAL_PILL } from '@/config/dataTones';
import { useThemeStore, isColorfulTheme } from '@/store/useThemeStore';
import { getItemTheme } from '@/lib/theme-utils';
import {
  ChevronDown,
  Edit2,
  Copy,
  Trash2,
  PauseCircle,
  CheckCircle2,
  AlertTriangle,
  Ruler,
  ExternalLink,
} from 'lucide-react';
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
  const openModal = useAppStore((state) => state.openModal);
  const { confirm } = useConfirm();

  const [isExpanded, setIsExpanded] = useState(false);

  // สี brand ประจำชนิดสินค้า (ทะเบียน §2.1 ชั้น Identity) — ใช้กับชิปสเปค ให้ตรงหัว section ของฟอร์ม
  const theme = getItemTheme(item.type);

  // Colorful themes (EEERT + Dark Vivid): ตัวเลขขนาด/วัสดุ สวม pill โทนนุ่ม (text สี AAA+ จากทะเบียน) — ธีมอื่นไม่เปลี่ยน
  const isColorful = useThemeStore((s) => isColorfulTheme(s.theme));
  const pillCls = (bg: string) => (isColorful ? cn('rounded-full px-2 py-0.5', bg) : undefined);

  const priceResult = useMemo(() => PricingEngine.calculateDetailedPrice(item), [item]);

  // "ยังไม่เสร็จ" — มีขนาดแล้วแต่ยังไม่ได้ใส่ผ้า/รายละเอียดที่จำเป็น
  const incomplete = useMemo(() => !item.is_suspended && isItemIncomplete(item), [item]);

  const { title, dimSpec } = useMemo(() => {
    const rawSpecs = PricingEngine.getItemSpecs(item);
    const cleanSpecs = rawSpecs.filter((s) => s && s.trim() !== '');
    // First spec = dimensions (ใช้เป็น fallback ของ hero), ส่วนอื่นสร้างเป็นชิปด้านล่าง
    return {
      title: itemTitle(item),
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

  // ขนาดแบบ "W x H" (ตัวเลขล้วน) — ป้าย "กว้าง/สูง :" แยกแสดงในแถวด้วยสีจาง (ไม่เด่นเท่าตัวเลข)
  // ช่องที่ยังไม่กรอกใช้ "—" (กันค่าว่างทำให้ดูเหมือนบันทึกไม่ครบ / หลุดไปฟอร์แมตเก่าจาก getSpecs)
  const dimNumbers = useMemo(() => {
    if (item.type === ITEM_TYPES.REMOVAL) return '';
    const w =
      item.type === ITEM_TYPES.WALLPAPER
        ? (item.widths || []).reduce((sum, x) => sum + toNum(x), 0)
        : width;
    const h = item.type === ITEM_TYPES.WALLPAPER ? toNum(item.height_m) : height;
    if (w <= 0 && h <= 0) return '';
    const wStr = w > 0 ? w.toFixed(2) : '—';
    const hStr = h > 0 ? h.toFixed(2) : '—';
    return `${wStr} × ${hStr}`;
  }, [item, width, height]);

  // แถวขนาดบนการ์ด — สินค้ามีมิติใช้ dimNumbers (รูปแบบใหม่เสมอ), งานรื้อถอนใช้ spec สรุป
  const dimLine = item.type === ITEM_TYPES.REMOVAL ? dimSpec : dimNumbers;

  // ชิป Row 3 — ชนิด + รูปแบบเก็บ + รายละเอียดรอง (สร้างจาก field ตรงๆ ไม่มี prefix)
  const typeChips = useMemo<string[]>(() => {
    const chips: string[] = [];
    switch (item.type) {
      case ITEM_TYPES.CURTAIN:
        // รูปแบบ (ลอน/จีบ) ย้ายไปอยู่ใน title แล้ว — ชิปเหลือทิศเปิด/ชั้นผ้า
        if (item.opening_style) chips.push(openingStyleLabel(item.opening_style));
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
        if (opening) chips.push(openingStyleLabel(opening));
        if (side) chips.push(`ปรับ ${side}`);
        if (code) chips.push(code);
        break;
      }
    }
    return chips;
  }, [item]);

  // รหัสสินค้าที่อ้างถึงในรายการนี้ → กดเปิด "รายละเอียดรหัส (Code Detail)" ดูจุดที่ใช้ทั้งโครงการ
  const codeRefs = useMemo<{ code: string; category: string }[]>(() => {
    const refs: { code: string; category: string }[] = [];
    if (item.type === ITEM_TYPES.CURTAIN) {
      if (item.code) refs.push({ code: item.code, category: FAVORITE_CATEGORIES.CURTAIN_MAIN });
      if (item.sheer_code)
        refs.push({ code: item.sheer_code, category: FAVORITE_CATEGORIES.CURTAIN_SHEER });
    } else if (item.type === ITEM_TYPES.WALLPAPER) {
      if (item.wallpaper_code)
        refs.push({ code: item.wallpaper_code, category: FAVORITE_CATEGORIES.WALLPAPER });
    } else if (item.type !== ITEM_TYPES.REMOVAL) {
      const code = (item as { code?: string }).code;
      if (code) refs.push({ code, category: item.type });
    }
    return refs;
  }, [item]);

  const handleOpenCodeDetail = (e: React.MouseEvent, code: string, category: string) => {
    e.stopPropagation();
    openModal('codeDetail', { code, category });
  };

  // ปุ่มรหัส (กดดูรายละเอียด/จุดที่ใช้รหัสนี้ทั้งโครงการ)
  // ใช้ร่วมทั้งแถวผ้าทึบ/ผ้าโปร่ง (ผ้าม่าน) + แถว "รหัส" ของ non-curtain
  const renderCodeButton = (code: string, category: string) => (
    <button
      key={`${category}-${code}`}
      onClick={(e) => handleOpenCodeDetail(e, code, category)}
      className="inline-flex items-center gap-0.5 text-xs font-mono font-semibold text-foreground hover:underline underline-offset-2 active:opacity-70"
      title={`ดูรายละเอียด/จุดที่ใช้รหัส ${code}`}
    >
      {code}
      <ExternalLink className="w-3 h-3 opacity-70" strokeWidth={1.5} />
    </button>
  );

  const isAreaType =
    item.type === ITEM_TYPES.WOODEN_BLIND ||
    item.type === ITEM_TYPES.ROLLER_BLIND ||
    item.type === ITEM_TYPES.VERTICAL_BLIND ||
    item.type === ITEM_TYPES.ALUMINUM_BLIND ||
    item.type === ITEM_TYPES.PARTITION ||
    item.type === ITEM_TYPES.PLEATED_SCREEN;

  // หน้างานต้องการ "ขนาด" เป็นเมตริกซ้าย, "ยอดสุทธิ" เป็นฮีโร่ขวา — เฉพาะสินค้าที่มีมิติตัวเลข
  const showDim = item.type !== ITEM_TYPES.REMOVAL && !!dimNumbers;

  // แจ้งเตือนบนการ์ด: สินค้าที่เริ่มแล้ว (มีขนาด) + ต้องเลือกทิศเปิด แต่ยังไม่ได้เลือก (ไม่มีค่าตั้งต้นแล้ว)
  // เกณฑ์ "ประเภทไหนต้องมีทิศ" ใช้ requiresOpeningStyle (single source — ตัวเดียวกับ gate ออกเอกสาร)
  const needsOpening =
    hasSize && requiresOpeningStyle(item) && !('opening_style' in item && item.opening_style);

  return (
    <div
      className={cn(
        'rounded-2xl border bg-card transition-[border-color] duration-200',
        item.is_suspended
          ? 'opacity-60 grayscale border-dashed border-border'
          : 'border-border hover:border-foreground/20'
      )}
    >
      {/* Collapsed header — always visible, clickable */}
      <div
        className="flex flex-col gap-2.5 p-4 cursor-pointer select-none transition-transform duration-100 active:scale-[0.99]"
        onClick={() => setIsExpanded((prev) => !prev)}
      >
        {/* Row 1: Index chip + Title + status + Chevron */}
        <div className="flex items-center gap-2">
          {/* รายการว่าง (index = -1) ไม่ให้เลขลำดับ */}
          {index >= 0 && (
            <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-muted-foreground">
              {String(index + 1).padStart(2, '0')}
            </span>
          )}
          <span className="flex-1 min-w-0 font-semibold text-foreground truncate text-base">
            {title}
          </span>
          {incomplete ? (
            <span className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/60 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/40">
              <AlertTriangle className="w-3 h-3" strokeWidth={1.5} />
              {incompleteLabel(item)}
            </span>
          ) : needsOpening ? (
            <span className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/60 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/40">
              <AlertTriangle className="w-3 h-3" strokeWidth={1.5} />
              เลือกทิศเปิด
            </span>
          ) : null}
          <ChevronDown
            className={cn(
              'w-4 h-4 text-muted-foreground/60 shrink-0 transition-transform duration-200',
              isExpanded && 'rotate-180'
            )}
            strokeWidth={1.5}
          />
        </div>

        {/* Row 2: Metric strip — ขนาด (blue) ซ้าย · ยอดสุทธิ (emerald hero) ขวา */}
        <div className="flex items-end justify-between gap-3">
          {showDim ? (
            <Metric
              label="กว้าง×สูง"
              icon={<Ruler className="w-3.5 h-3.5" strokeWidth={1.5} />}
              value={dimLine}
              tone="dimension"
              plate
            />
          ) : (
            // งานรื้อถอน/ไม่มีมิติ — ยังคงโชว์รายละเอียดสรุปไว้ฝั่งซ้ายแบบเงียบ
            dimLine && (
              <Metric label="รายละเอียด" value={dimLine} tone="muted" />
            )
          )}
          <Metric
            label="ยอดสุทธิ"
            value={fmtTH(priceResult.total)}
            tone="money"
            size="sm"
            plate
            align="right"
            struck={item.is_suspended}
            className="shrink-0"
          />
        </div>

        {/* Row 3: ชนิด + รูปแบบเก็บ — ชิป */}
        {typeChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {typeChips.map((chip, i) => (
              <span
                key={i}
                className={cn(
                'text-xs leading-normal px-2.5 py-1 rounded-full font-medium',
                theme.badge
              )}
              >
                {chip}
              </span>
            ))}
          </div>
        )}

        {/* Fallback: no specs at all */}
        {!dimLine && typeChips.length === 0 && (
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
            {/* ขนาด */}
            {hasSize && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">ขนาด</span>
                <span
                  className={cn('font-semibold font-mono', DATA_TONE_TEXT.dimension, pillCls(DATA_TONE_PILL.dimension))}
                >
                  {width.toFixed(2)} × {height.toFixed(2)} ม.
                </span>
              </div>
            )}

            {/* ผ้าม่าน: ผ้าหลัก — รหัสเกาะข้าง label */}
            {item.type === ITEM_TYPES.CURTAIN && fabricYards > 0 && (
              <div className="flex justify-between items-center text-sm gap-3">
                <span className="text-muted-foreground inline-flex items-center gap-1.5 min-w-0">
                  ผ้าทึบ
                  {item.code && renderCodeButton(item.code, FAVORITE_CATEGORIES.CURTAIN_MAIN)}
                </span>
                <span
                  className={cn('font-semibold font-mono shrink-0', MATERIAL_ACCENT.fabric, pillCls(MATERIAL_PILL.fabric))}
                >
                  {fabricYards.toFixed(2)}
                </span>
              </div>
            )}

            {/* ผ้าม่าน: ผ้าโปร่ง (ทึบ+โปร่ง) — รหัสเกาะข้าง label */}
            {item.type === ITEM_TYPES.CURTAIN && sheerYards > 0 && (
              <div className="flex justify-between items-center text-sm gap-3">
                <span className="text-muted-foreground inline-flex items-center gap-1.5 min-w-0">
                  ผ้าโปร่ง
                  {item.sheer_code &&
                    renderCodeButton(item.sheer_code, FAVORITE_CATEGORIES.CURTAIN_SHEER)}
                </span>
                <span
                  className={cn('font-semibold font-mono shrink-0', MATERIAL_ACCENT.sheer, pillCls(MATERIAL_PILL.sheer))}
                >
                  {sheerYards.toFixed(2)}
                </span>
              </div>
            )}

            {/* วอลล์เปเปอร์: จำนวนม้วน */}
            {item.type === ITEM_TYPES.WALLPAPER && rolls > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">จำนวนม้วน</span>
                <span
                  className={cn('font-semibold font-mono', MATERIAL_ACCENT.wallpaper, pillCls(MATERIAL_PILL.wallpaper))}
                >
                  {Math.ceil(rolls)} ม้วน
                </span>
              </div>
            )}

            {/* สินค้าพื้นที่: ตร.ม. · ตร.ล. (บรรทัดเดียว) */}
            {isAreaType && (areaSqm > 0 || areaSqyd > 0) && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">พื้นที่</span>
                <span
                  className={cn('font-semibold font-mono', DATA_TONE_TEXT.dimension, pillCls(DATA_TONE_PILL.dimension))}
                >
                  {areaSqm > 0 && `${areaSqm.toFixed(2)} ตร.ม.`}
                  {areaSqm > 0 && areaSqyd > 0 && ' · '}
                  {areaSqyd > 0 && `${areaSqyd.toFixed(2)} ตร.ล.`}
                </span>
              </div>
            )}

            {/* รหัสสินค้า (non-curtain) — กดเพื่อดูรายละเอียด/จุดที่ใช้รหัสนี้ทั้งโครงการ
                ผ้าม่านย้ายรหัสไปเกาะข้างผ้าทึบ/ผ้าโปร่งแล้ว */}
            {item.type !== ITEM_TYPES.CURTAIN && codeRefs.length > 0 && (
              <div className="flex justify-between items-center text-sm gap-3">
                <span className="text-muted-foreground shrink-0">รหัส</span>
                <div className="flex flex-wrap items-center justify-end gap-1.5 min-w-0">
                  {codeRefs.map((ref) => renderCodeButton(ref.code, ref.category))}
                </div>
              </div>
            )}

            {/* หมายเหตุ */}
            {item.notes && (
              <div className="flex justify-between items-start text-sm gap-4">
                <span className="text-muted-foreground shrink-0">หมายเหตุ</span>
                <span className="font-medium text-slate-500 dark:text-slate-400 text-right">
                  {item.notes}
                </span>
              </div>
            )}
          </div>

          {/* Action buttons — touch targets ≥ 44px (HIG) */}
          <div className="flex gap-2 pt-3 border-t border-border/40">
            <button
              onClick={handleEdit}
              className="flex-1 flex items-center justify-center gap-1.5 h-11 rounded-xl bg-muted text-foreground text-sm font-medium hover:bg-muted/70 transition-[background-color,transform] active:scale-[0.97]"
            >
              <Edit2 className="w-4 h-4" strokeWidth={1.5} />
              แก้ไข
            </button>
            <button
              onClick={handleDuplicate}
              className="flex items-center justify-center h-11 w-11 rounded-xl text-muted-foreground hover:bg-muted transition-[background-color,transform] active:scale-90"
              title="คัดลอก"
            >
              <Copy className="w-4 h-4" strokeWidth={1.5} />
            </button>
            <button
              onClick={handleToggleSuspension}
              className="flex items-center justify-center h-11 w-11 rounded-xl text-muted-foreground hover:bg-muted transition-[background-color,transform] active:scale-90"
              title={item.is_suspended ? 'เปิดใช้งาน' : 'พักรายการ (ไม่นับยอด)'}
            >
              {item.is_suspended ? (
                <CheckCircle2 className="w-4 h-4" strokeWidth={1.5} />
              ) : (
                <PauseCircle className="w-4 h-4" strokeWidth={1.5} />
              )}
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center justify-center h-11 w-11 rounded-xl text-destructive hover:bg-destructive/10 transition-[background-color,transform] active:scale-90"
              title="ลบรายการ"
            >
              <Trash2 className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const ItemCardSkeleton: React.FC = () => (
  <div className="rounded-xl border border-border bg-card p-3.5 space-y-2.5">
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
