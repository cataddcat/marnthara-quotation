// src/components/modals/FinancialDashboard/ItemCard.tsx

import { ChevronDown, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useThemeStore } from '@/store/standalone/useThemeStore';
import { useSquircleClip } from '@/components/ui/useSquircleClip';
import { Alert } from '@/components/ui/Alert';
import { fmtTH } from '@/utils/formatters';
import { Metric } from '@/components/ui/Metric';
import { FAVORITE_CATEGORIES } from '@/config/enums';
import { COST_BUCKET_DOT } from '@/config/dataTones';
import { CostRow } from './CostRow';
import { CodeJumpButton } from './CodeJumpButton';
import { STATUS_STYLE, type ItemRow } from './constants';

interface ItemCardProps {
  row: ItemRow;
  expanded: boolean;
  onToggle: () => void;
  onOpenCodeDetail: (code: string, tab: string) => void;
}

// Expandable item card
export const ItemCard = ({ row, expanded, onToggle, onOpenCodeDetail }: ItemCardProps) => {
  const { analysis, typeName, roomName, item } = row;
  const st = STATUS_STYLE[analysis.status];
  // EEERT-minimal: bigger row hero (type name). Other themes unchanged.
  const isEeert = useThemeStore((s) => s.theme === 'eeert');
  const clipRef = useSquircleClip<HTMLDivElement>();

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

  // Map item type → หมวดในคลังรหัส (MaterialSummary)
  // area items (มู่ลี่/ฉาก/มุ้ง): หมวดในแค็ตตาล็อก = item.type ตรงๆ (ตรงกับ FAVORITE_CATEGORIES)
  const mainTab = isCurtain
    ? FAVORITE_CATEGORIES.CURTAIN_MAIN
    : isWallpaper
      ? FAVORITE_CATEGORIES.WALLPAPER
      : item.type;

  // ป้ายกำกับวัสดุหลัก: ผ้าม่าน=ผ้าทึบ, วอลเปเปอร์, อื่นๆ (มู่ลี่/ฉาก/มุ้ง)=ชื่อชนิดสินค้า
  const mainLabel = isWallpaper ? 'วอลเปเปอร์' : isCurtain ? 'ผ้าทึบ' : typeName;

  const marginLabel =
    analysis.status === 'unknown'
      ? st.label
      : `${analysis.marginPercent >= 0 ? '+' : ''}${analysis.marginPercent.toFixed(0)}%`;

  return (
    <div
      ref={clipRef}
      className={cn('bg-card border border-border/60 border-l-[3px] rounded-2xl overflow-hidden', st.accent)}
    >
      {/* ── Main row (always visible) ── */}
      <button
        onClick={onToggle}
        className="w-full p-3.5 flex items-start gap-3 text-left active:bg-muted/40 active:scale-[0.99] transition-[background-color,transform]"
      >
        {/* Status dot */}
        <div className={cn('w-2 h-2 rounded-full mt-1.5 shrink-0', st.dot)} />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={cn(
                'font-semibold text-sm text-foreground leading-tight',
                isEeert && 'text-base'
              )}
            >
              {typeName}
            </span>
            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full leading-tight">
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
            strokeWidth={1.5}
          />
        </div>
      </button>

      {/* ── Expanded detail ── */}
      {expanded && (
        <div className="border-t border-border/50 bg-muted/20 px-3 py-3 space-y-1.5 text-sm">
          {analysis.status === 'unknown' && (
            <Alert variant="warning" className="mb-2">
              <span>
                ยังไม่มีราคาทุน{mainLabel} — กดรหัส (
                <span className="font-mono font-bold">{mainCode || sheerCode || '?'}</span>)
                ด้านล่างเพื่อเพิ่มทุนได้เลย
              </span>
            </Alert>
          )}

          {/* ── Fabric codes + cost — แสดงเสมอถ้ามีรหัส ── */}
          {(mainCode || isCurtain || isWallpaper) && (
            <>
              {/* Main fabric / wallpaper */}
              <div className="flex justify-between items-center gap-2">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0" />
                  <span className="text-xs text-muted-foreground shrink-0">{mainLabel}</span>
                  {mainCode ? (
                    <CodeJumpButton code={mainCode} tab={mainTab} onJump={onOpenCodeDetail} />
                  ) : (
                    <span className="text-xs text-muted-foreground/40 italic">
                      ยังไม่ระบุรหัส
                    </span>
                  )}
                  {analysis.usedQuantity > 0 && (
                    <span className="text-xs text-muted-foreground/50 font-mono">
                      {analysis.usedQuantity.toFixed(2)} {analysis.unit}
                    </span>
                  )}
                </div>
                <span
                  className={cn(
                    'font-mono tabular-nums text-xs shrink-0',
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
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
                    <span className="text-xs text-muted-foreground shrink-0">ผ้าโปร่ง</span>
                    <CodeJumpButton
                      code={sheerCode!}
                      tab={FAVORITE_CATEGORIES.CURTAIN_SHEER}
                      onJump={onOpenCodeDetail}
                    />
                    {(analysis.sheerQuantity ?? 0) > 0 && (
                      <span className="text-xs text-muted-foreground/50 font-mono">
                        {(analysis.sheerQuantity ?? 0).toFixed(2)} {analysis.unit}
                      </span>
                    )}
                  </div>
                  <span
                    className={cn(
                      'font-mono tabular-nums text-xs shrink-0',
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
              dotClass={COST_BUCKET_DOT.labor}
            />
          )}

          {/* Rail */}
          {railTotal > 0 && (
            <CostRow label="ราง + อุปกรณ์" value={railTotal} dotClass={COST_BUCKET_DOT.hardware} />
          )}

          {/* No cost data at all */}
          {analysis.totalCost === 0 && analysis.status !== 'unknown' && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Info className="w-3.5 h-3.5" strokeWidth={1.5} /> ไม่มีต้นทุนที่บันทึกไว้
            </div>
          )}

          {/* ส่วนที่ปิดสวิตช์ไม่นับ (costInclude) — บอกชัดว่าทุนนี้ไม่ครบเพราะอะไร */}
          {analysis.excludedComponents.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Info className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
              ไม่นับ: {analysis.excludedComponents.join(' · ')} — บันทึกจ่ายจริงแทน
            </div>
          )}

          {/* Divider + totals — 2-up KPI footer (ทุนที่รู้ cost · ส่วนต่าง money) */}
          <div className="pt-3 mt-1 border-t border-border/50 grid grid-cols-2 gap-2">
            <Metric
              label="ทุนที่รู้"
              value={`฿${fmtTH(analysis.totalCost)}`}
              tone="cost"
            />
            <Metric
              label="ส่วนต่าง"
              value={`${analysis.profitAmount >= 0 ? '+' : ''}฿${fmtTH(analysis.profitAmount)}`}
              tone={analysis.profitAmount >= 0 ? 'money' : 'cost'}
              plate
              align="right"
            />
          </div>
        </div>
      )}
    </div>
  );
};
