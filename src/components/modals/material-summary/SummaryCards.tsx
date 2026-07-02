import React, { useState } from 'react';
import { MATERIAL_ACCENT, MATERIAL_PILL } from '@/config/dataTones';
import { useThemeStore, isColorfulTheme } from '@/store/standalone/useThemeStore';
import { fmtTH, fmtSize } from '@/utils/formatters';
import { cn } from '@/lib/utils';
import { ChevronDown, AlertTriangle, ArrowRight } from 'lucide-react';
import { useActiveCostMaps } from '@/hooks/useActiveCostMaps';
import { useCanViewCost } from '@/hooks/useCanViewCost';
import type { FabricEntry, RailItem, AreaGroup } from '@/lib/materials/buildSummary';
// ─── Summary sub-components ───────────────────────────────────────────────────

// ยอดรวมปริมาณข้ามรหัสไม่มีความหมายต่อการสั่ง (แต่ละรหัส = สินค้าคนละตัว) →
// หัว section เก็บแค่ป้าย "(N รหัส)" + ทุนรวม ฿ (รวมได้จริง); ปริมาณต่อรหัสอยู่ในการ์ด
export const SectionHeader = ({
  label,
  totalCost,
}: {
  label: string;
  totalCost?: number;
}) => {
  const canViewCost = useCanViewCost();
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/60 mb-2">
      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{label}</span>
      {canViewCost && totalCost !== undefined && totalCost > 0 && (
        <span className="text-xs text-emerald-700 dark:text-emerald-400 eeert:text-emerald-800 font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
          ทุน ฿{fmtTH(totalCost)}
        </span>
      )}
    </div>
  );
};

/**
 * UsageRow — แถว "ใช้ที่ห้องไหน · เท่าไหร่" ที่การ์ดวัสดุใช้ร่วมกัน (จิ้ม → กระโดดไป item)
 * 2 บรรทัด ไม่ตัดข้อมูล (DESIGN.md §1: data ≥14px · 12px = chip/Meta เท่านั้น):
 *   บรรทัด 1: ห้อง 14px foreground + จำนวน 14px mono accent
 *   บรรทัด 2: spec (ขนาดน้ำเงิน mono + chips) — flex-wrap, ห้าม truncate
 */
const UsageRow = ({
  roomName,
  qty,
  qtyClass,
  qtyPill,
  spec,
  onJump,
}: {
  roomName: string;
  qty: string;
  qtyClass: string;
  /** MATERIAL_PILL.x — plate กัน "สีกลืน" สำหรับเลขวัสดุ (plate-required); โผล่ใน EEERT */
  qtyPill?: string;
  spec?: React.ReactNode;
  onJump: () => void;
}) => {
  const isColorful = useThemeStore((s) => isColorfulTheme(s.theme));
  return (
    <button
      onClick={onJump}
      className="w-full px-1 py-2 hover:bg-muted/40 transition-colors group text-left"
    >
      <div className="flex justify-between items-center gap-2">
        <span className="flex items-center gap-1.5 min-w-0">
          <span className="w-1 h-1 rounded-full bg-muted-foreground/40 shrink-0" />
          <span className="text-sm font-medium text-foreground truncate">{roomName}</span>
        </span>
        <span className="flex items-center gap-1 shrink-0">
          <span
            className={cn(
              'text-sm font-mono tabular-nums',
              isColorful && qtyPill && cn('rounded-full px-2 py-0.5', qtyPill),
              qtyClass
            )}
          >
            {qty}
          </span>
          <ArrowRight
            className="w-3.5 h-3.5 text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
            strokeWidth={1.5}
          />
        </span>
      </div>
      {spec && <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pl-2.5 mt-0.5">{spec}</div>}
    </button>
  );
};

/** ขนาด กว้าง×สูง — ชั้นข้อมูล #1 ของช่างหน้างาน: mono น้ำเงิน 14px (tone "dimension") */
const SpecDims = ({ children }: { children: React.ReactNode }) => (
  <span className="text-sm font-mono tabular-nums text-blue-700 dark:text-blue-400">{children}</span>
);

/** chip ป้ายหมวด (สไตล์/ชั้นผ้า) — 12px Meta โดยชอบ */
const SpecChip = ({ children }: { children: React.ReactNode }) => (
  <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">{children}</span>
);

export const FabricCard = ({
  code,
  total,
  entries,
  unit,
  accent,
  accentPill,
  costLookup,
  onJumpItem,
}: {
  code: string;
  total: number;
  entries: FabricEntry[];
  unit: string;
  accent: string;
  accentPill?: string;
  costLookup: Record<string, number>;
  onJumpItem: (roomId: string, itemId: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const canViewCost = useCanViewCost();
  const hasUnknownCode = code.startsWith('(');
  const cost = costLookup[code] ?? 0;
  const totalCost = cost > 0 ? cost * total : 0;

  return (
    <div className="bg-card border border-border/50 rounded-2xl overflow-hidden mb-2">
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full px-3 py-2.5 flex items-center gap-2 hover:bg-muted/30 active:scale-[0.99] transition-[background-color,transform]"
      >
        <div className="flex-1 text-left min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={cn('font-mono font-bold text-sm', hasUnknownCode ? 'text-muted-foreground' : accent)}>
              {code}
            </span>
            {hasUnknownCode && <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" strokeWidth={1.5} />}
            <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full shrink-0">
              {entries.length}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-0.5 shrink-0">
          <span className={cn('font-mono font-bold text-sm', accent)}>
            {fmtTH(total)} {unit}
          </span>
          {canViewCost && totalCost > 0 && (
            <span className="font-mono text-xs text-emerald-700 dark:text-emerald-400 eeert:text-emerald-800">
              ทุน ฿{fmtTH(totalCost)}
            </span>
          )}
        </div>
        <ChevronDown className={cn('w-4 h-4 text-muted-foreground/60 transition-transform shrink-0', open && 'rotate-180')} strokeWidth={1.5} />
      </button>

      {open && (
        <div className="border-t border-border/50 bg-muted/20">
          {canViewCost && (
            <div className="px-3 py-2.5 flex items-center justify-between border-b border-border/30">
              <span className="text-xs text-muted-foreground font-medium">ราคาทุนต่อหน่วย</span>
              <span className="text-sm font-mono tabular-nums text-foreground">
                {cost > 0 ? `฿${fmtTH(cost)}` : '—'}
                <span className="text-xs text-muted-foreground"> /{unit}</span>
              </span>
            </div>
          )}
          <div className="px-3 py-1 divide-y divide-border/60">
            {entries.map((e, i) => (
              <UsageRow
                key={i}
                roomName={e.roomName}
                qty={`${fmtTH(e.yards)} ${unit}`}
                qtyClass={accent}
                qtyPill={accentPill}
                onJump={() => onJumpItem(e.roomId, e.itemId)}
                spec={
                  <>
                    <SpecDims>
                      {e.width.toFixed(2)} × {e.height.toFixed(2)} ม.
                    </SpecDims>
                    <SpecChip>{e.style}</SpecChip>
                    <SpecChip>{e.layerLabel}</SpecChip>
                  </>
                }
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const WallpaperCostCard = ({
  code,
  total,
  entries,
  onJumpItem,
}: {
  code: string;
  total: number;
  entries: {
    rolls: number;
    roomId: string;
    roomName: string;
    itemId: string;
    desc: string;
    wallWidth: number;
    height: number;
  }[];
  onJumpItem: (roomId: string, itemId: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const canViewCost = useCanViewCost();
  const { wallpaperCosts } = useActiveCostMaps(); // ทุน read-only — แก้ที่เครื่องมือภายนอก
  const cost = wallpaperCosts[code] ?? 0;
  const totalCost = cost > 0 ? cost * total : 0;

  return (
    <div className="bg-card border border-border/50 rounded-2xl overflow-hidden mb-2">
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full px-3 py-2.5 flex items-center gap-2 hover:bg-muted/30 active:scale-[0.99] transition-[background-color,transform]"
      >
        <div className="flex-1 text-left min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={cn('font-mono font-bold text-sm', MATERIAL_ACCENT.wallpaper)}>{code}</span>
            <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
              {entries.length}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-0.5 shrink-0">
          <span className={cn('font-mono font-bold text-sm', MATERIAL_ACCENT.wallpaper)}>{Math.ceil(total)} ม้วน</span>
          {canViewCost && totalCost > 0 && (
            <span className="font-mono text-xs text-emerald-700 dark:text-emerald-400 eeert:text-emerald-800">
              ทุน ฿{fmtTH(totalCost)}
            </span>
          )}
        </div>
        <ChevronDown className={cn('w-4 h-4 text-muted-foreground/60 transition-transform shrink-0', open && 'rotate-180')} strokeWidth={1.5} />
      </button>

      {open && (
        <div className="border-t border-border/50 bg-muted/20">
          {canViewCost && (
            <div className="px-3 py-2.5 flex items-center justify-between border-b border-border/30">
              <span className="text-xs text-muted-foreground font-medium">ราคาทุนต่อม้วน</span>
              <span className="text-sm font-mono tabular-nums text-foreground">
                {cost > 0 ? `฿${fmtTH(cost)}` : '—'}
                <span className="text-xs text-muted-foreground"> /ม้วน</span>
              </span>
            </div>
          )}
          <div className="px-3 py-1 divide-y divide-border/60">
            {entries.map((e, i) => (
              <UsageRow
                key={i}
                roomName={e.roomName}
                qty={`${Math.ceil(e.rolls)} ม้วน`}
                qtyClass={MATERIAL_ACCENT.wallpaper}
                qtyPill={MATERIAL_PILL.wallpaper}
                onJump={() => onJumpItem(e.roomId, e.itemId)}
                spec={
                  <>
                    <SpecChip>ผนัง</SpecChip>
                    <SpecDims>
                      {fmtSize(e.wallWidth, e.height)} ม.
                    </SpecDims>
                  </>
                }
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const AreaCostCard = ({
  group,
  onJumpItem,
}: {
  group: AreaGroup;
  onJumpItem: (roomId: string, itemId: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const canViewCost = useCanViewCost();
  const { areaCosts } = useActiveCostMaps(); // ทุน read-only — แก้ที่เครื่องมือภายนอก
  const cost = areaCosts[group.costKey] ?? 0;
  const costQty = group.unit === 'ตร.ม.' ? group.totalSqm : group.totalSqyd;
  const totalCost = cost > 0 ? cost * costQty : 0;

  return (
    <div className="bg-card border border-border/50 rounded-2xl overflow-hidden mb-2">
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full px-3 py-2.5 flex items-center gap-2 hover:bg-muted/30 active:scale-[0.99] transition-[background-color,transform]"
      >
        <div className="flex-1 text-left min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-sm text-foreground">{group.typeName}</span>
            {group.code && (
              <span className="font-mono text-xs text-teal-700 dark:text-teal-400 eeert:text-teal-800 bg-teal-500/10 px-1.5 py-0.5 rounded-full">
                {group.code}
              </span>
            )}
            <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full shrink-0">
              {group.entries.length}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-0.5 shrink-0">
          <span className="font-mono font-bold text-sm text-teal-700 dark:text-teal-400 eeert:text-teal-800">
            {fmtTH(costQty)} {group.unit}
          </span>
          {canViewCost && totalCost > 0 && (
            <span className="font-mono text-xs text-emerald-700 dark:text-emerald-400 eeert:text-emerald-800">
              ทุน ฿{fmtTH(totalCost)}
            </span>
          )}
        </div>
        <ChevronDown className={cn('w-4 h-4 text-muted-foreground/60 transition-transform shrink-0', open && 'rotate-180')} strokeWidth={1.5} />
      </button>

      {open && (
        <div className="border-t border-border/50 bg-muted/20">
          {canViewCost && (
            <div className="px-3 py-2.5 flex items-center justify-between border-b border-border/30">
              <span className="text-xs text-muted-foreground font-medium">ราคาทุนต่อ{group.unit}</span>
              <span className="text-sm font-mono tabular-nums text-foreground">
                {cost > 0 ? `฿${fmtTH(cost)}` : '—'}
                <span className="text-xs text-muted-foreground"> /{group.unit}</span>
              </span>
            </div>
          )}
          <div className="px-3 py-1 divide-y divide-border/60">
            {group.entries.map((e, i) => {
              const entryQty = group.unit === 'ตร.ม.' ? e.sqm : e.sqyd;
              return (
                <UsageRow
                  key={i}
                  roomName={e.roomName}
                  qty={`${fmtTH(entryQty)} ${group.unit}`}
                  qtyClass="text-teal-700 dark:text-teal-400 eeert:text-teal-800"
                  qtyPill={MATERIAL_PILL.area}
                  onJump={() => onJumpItem(e.roomId, e.itemId)}
                  spec={
                    <SpecDims>
                      {fmtSize(e.width, e.height)} ม.
                    </SpecDims>
                  }
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export const RailCard = ({
  railKey, label, totalLength, totalSets, items,
}: {
  railKey: string;
  label: string;
  totalLength: number;
  totalSets: number;
  items: RailItem[];
}) => {
  const [open, setOpen] = useState(false);
  const isRoman = railKey === 'rail_roman';

  return (
    <div className="bg-card border border-border/50 rounded-2xl overflow-hidden mb-2">
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-muted/30 active:scale-[0.99] transition-[background-color,transform]"
      >
        <div className="flex-1 text-left min-w-0">
          <div className="font-semibold text-sm text-foreground truncate">{label}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{items.length} ชุด/หน้าต่าง</div>
        </div>
        <div className={cn('font-mono font-bold text-sm shrink-0', isRoman ? 'text-foreground' : MATERIAL_ACCENT.hardware)}>
          {isRoman ? `${totalSets} ชุด` : `${fmtTH(totalLength)} ม.`}
        </div>
        <ChevronDown className={cn('w-4 h-4 text-muted-foreground/60 transition-transform shrink-0', open && 'rotate-180')} strokeWidth={1.5} />
      </button>
      {open && (
        <div className="border-t border-border/50 bg-muted/20 px-3 py-1 divide-y divide-border/60">
          {items.map((item, i) => (
            <div key={i} className="py-2 space-y-0.5">
              <div className="flex justify-between items-center gap-2">
                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 min-w-0">
                  <span className="text-sm font-medium text-foreground">{item.roomName}</span>
                  {item.isDouble && (
                    <span className="text-xs bg-muted text-foreground px-1.5 py-0.5 rounded-full font-bold">
                      2 ชั้น
                    </span>
                  )}
                  <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                    {item.opening}
                  </span>
                </div>
                <span
                  className={cn(
                    'text-sm font-mono tabular-nums shrink-0',
                    !isRoman && MATERIAL_ACCENT.hardware
                  )}
                >
                  {isRoman ? '1 ชุด' : `${item.width.toFixed(2)} ม.`}
                </span>
              </div>
              {(item.railCode || item.railColor) && (
                <div className={cn('pl-2 text-sm font-mono', MATERIAL_ACCENT.hardware)}>
                  {item.railCode ? `รุ่น ${item.railCode}` : ''}
                  {item.railCode && item.railColor ? ' · ' : ''}
                  {item.railColor ? `สี ${item.railColor}` : ''}
                </div>
              )}
              {!isRoman && (
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground pl-2">
                  {item.brackets > 0 && <span>ขาจับ: ~{item.brackets} ชิ้น</span>}
                  {item.eyelets > 0 && <span>ห่วงตาไก่: ~{item.eyelets} วง</span>}
                  {item.pinHooks > 0 && <span>ตะขอจีบ: ~{item.pinHooks} ตัว</span>}
                  {item.waveTapeM > 0 && <span>เทปลอน: ~{item.waveTapeM} ม.</span>}
                  {item.rollers > 0 && (
                    <span>
                      ลูกล้อ:{' '}
                      {item.wavePanels === 2
                        ? `${item.rollersPerPanel}+${item.rollersPerPanel} (=${item.rollers})`
                        : item.rollers}{' '}
                      ตัว
                    </span>
                  )}
                  {item.snaps > 0 && <span>กระดุม: {item.snaps} เม็ด</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const AccRow = ({ label, value, unit, note }: { label: string; value: number; unit: string; note?: string }) => {
  if (value <= 0) return null;
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border/40 last:border-0">
      <div>
        <div className="text-sm font-medium text-foreground">{label}</div>
        {note && <div className="text-xs text-muted-foreground mt-0.5">{note}</div>}
      </div>
      <div className="text-right">
        <span className="font-mono font-bold text-sm">~{fmtTH(value)}</span>
        <span className="text-xs text-muted-foreground ml-1">{unit}</span>
      </div>
    </div>
  );
};

// ─── Main Modal ───────────────────────────────────────────────────────────────

