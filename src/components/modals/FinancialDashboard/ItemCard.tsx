// src/components/modals/FinancialDashboard/ItemCard.tsx

import { AlertTriangle, ChevronDown, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fmtTH } from '@/utils/formatters';
import { FAVORITE_CATEGORIES } from '@/config/enums';
import { CostRow } from './CostRow';
import { CodeJumpButton } from './CodeJumpButton';
import { STATUS_STYLE, type ItemRow } from './constants';

interface ItemCardProps {
  row: ItemRow;
  expanded: boolean;
  onToggle: () => void;
  onJumpToInventory: (code: string, tab: string) => void;
}

// Expandable item card
export const ItemCard = ({ row, expanded, onToggle, onJumpToInventory }: ItemCardProps) => {
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
