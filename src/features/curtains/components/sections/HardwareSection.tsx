import React, { useState } from 'react';
import { CurtainItemInput } from '@/types';
import { CURTAIN_STYLE_FEATURES } from '@/config/constants';
import { FORMULAS } from '@/config/formulas';
import { RAIL_COLORS } from '@/config/railProducts';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { FormSection } from '@/components/ui/FormSection';
import { useInventory } from '@/hooks/useInventory';
import { useThemeStore } from '@/store/standalone/useThemeStore';
import {
  Wrench,
  Palette,
  Link2,
  Circle,
  Ruler,
  CheckCircle2,
  Check,
  ArrowLeftToLine,
  ArrowRightToLine,
  Hexagon,
  Eye,
  GripVertical,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// style → หมวดราง catalog (ตรงกับ CATALOG_CATEGORIES / STYLE_TO_RAIL)
const STYLE_TO_RAIL: Record<string, string> = {
  ลอน: 'rail_wave',
  จีบ: 'rail_pleated',
  ตาไก่: 'rail_eyelet',
  พับ: 'rail_roman',
  แป๊บ: 'rail_rod',
  หลุยส์: 'rail_louis',
};

// ป้าย SKU ราง — ยี่ห้อ · รุ่น · สี (fallback รหัส)
const railSkuLabel = (s: { brand?: string; model?: string; color?: string; code: string }): string =>
  [s.brand, s.model, s.color].filter(Boolean).join(' · ') || s.code;

// สีราง/อุปกรณ์ — 6 สีมาตรฐาน THONG DECOR (จาก config) + "กำหนดเอง" (พิมพ์ข้อความเอง)
const RAIL_COLOR_CUSTOM = '__custom__';
const RAIL_COLOR_PRESETS = RAIL_COLORS.map((c) => c.value);
const RAIL_COLOR_OPTIONS = [
  { label: 'เลือกสี...', value: '' },
  ...RAIL_COLORS.map((c) => ({ label: c.label, value: c.value, color: c.hex })),
  { label: 'กำหนดเอง', value: RAIL_COLOR_CUSTOM },
];

interface HardwareSectionProps {
  data: CurtainItemInput;
  onChange: (field: keyof CurtainItemInput, val: string | number | boolean) => void;
  errors?: Partial<Record<keyof CurtainItemInput, string>>;
  warnings?: Partial<Record<keyof CurtainItemInput, string>>;
}

interface PillButtonProps {
  value: string;
  label: string;
  description?: string;
  icon: React.ElementType;
  currentValue: string | undefined;
  onChange: (val: string) => void;
}

const PillButton: React.FC<PillButtonProps> = ({
  value,
  label,
  description,
  icon: Icon,
  currentValue,
  onChange,
}) => {
  const isSelected = currentValue === value;
  return (
    <button
      type="button"
      onClick={() => onChange(value)}
      className={cn(
        'relative flex flex-col items-center justify-center min-h-20 py-2 px-3 rounded-xl border-2 transition-all active:scale-95',
        isSelected
          ? 'border-foreground bg-accent text-foreground'
          : 'border-border bg-card text-muted-foreground hover:bg-muted/30 hover:border-foreground/40'
      )}
    >
      <Icon
        className={cn('w-6 h-6 mb-1', isSelected ? 'text-foreground' : 'text-muted-foreground/70')}
        strokeWidth={1.5}
      />
      <span className="text-xs font-semibold text-center">{label}</span>
      {description && (
        <span className="text-xs text-muted-foreground/80 mt-0.5 text-center">
          {description}
        </span>
      )}
      {isSelected && (
        <div className="absolute top-1 right-1 bg-foreground text-background rounded-full p-0.5">
          <Check className="w-2 h-2" strokeWidth={3} />
        </div>
      )}
    </button>
  );
};

export const HardwareSection: React.FC<HardwareSectionProps> = ({
  data,
  onChange,
  errors,
  warnings,
}) => {
  // EEERT-minimal: ลบหัวข้อ FormSection (de-dup ซ้ำกับ disclosure + ตัด note ฝ่ายผลิต); ธีมอื่นคงเดิม
  const isEeert = useThemeStore((s) => s.theme === 'eeert');
  const features = CURTAIN_STYLE_FEATURES[data.style] || {
    hasRail: false,
    hasHook: false,
    hasChain: false,
    hasEyelet: false,
  };
  const isPleated = data.style === 'จีบ';
  const isWave = data.style === 'ลอน';
  const isRod = data.style === 'แป๊บ';
  const hasAnyHardware =
    features.hasRail ||
    features.hasHook ||
    features.hasChain ||
    features.hasEyelet ||
    isPleated ||
    isWave ||
    isRod;

  // สีราง: ถ้าค่าปัจจุบันไม่ใช่พรีเซ็ตและไม่ว่าง → ถือว่าเป็น "กำหนดเอง"
  const railColor = data.rail_color || '';
  const [railColorCustom, setRailColorCustom] = useState(
    () => railColor !== '' && !RAIL_COLOR_PRESETS.includes(railColor)
  );

  const handleRailColorSelect = (val: string) => {
    if (val === RAIL_COLOR_CUSTOM) {
      setRailColorCustom(true);
      // สลับจากพรีเซ็ตมา "กำหนดเอง" → เคลียร์ให้พิมพ์ใหม่
      if (RAIL_COLOR_PRESETS.includes(railColor)) onChange('rail_color', '');
    } else {
      setRailColorCustom(false);
      onChange('rail_color', val);
    }
  };

  // ── rail SKU picker (catalog) — ดึง SKU ของหมวดรางตาม style จากคลังวัสดุ ──
  const railCategory = STYLE_TO_RAIL[data.style] || '';
  const { items: railSkus } = useInventory(railCategory);
  // กัน rail_code ค้างข้ามสไตล์: ถ้า code ไม่อยู่ในหมวดปัจจุบัน → ถือว่ายังไม่เลือก
  const railCodeValid = railSkus.some((s) => s.code === data.rail_code);

  const handleRailSkuSelect = (code: string) => {
    onChange('rail_code', code);
    const sku = railSkus.find((s) => s.code === code);
    if (sku?.color) {
      onChange('rail_color', sku.color);
      setRailColorCustom(!RAIL_COLOR_PRESETS.includes(sku.color));
    }
  };

  return (
    <FormSection
      icon={isEeert ? undefined : Wrench}
      iconClass="text-foreground"
      title={isEeert ? undefined : 'อุปกรณ์ม่าน'}
      headerRight={
        isEeert ? undefined : (
          <span className="text-xs text-muted-foreground">ข้อมูลสำหรับฝ่ายผลิต</span>
        )
      }
    >
      {!hasAnyHardware && (
        <div className="flex flex-col items-center justify-center py-6 text-muted-foreground gap-2">
          <CheckCircle2 className="w-10 h-10 text-emerald-500/40" />
          <p className="text-sm">ไม่มีอุปกรณ์เพิ่มเติมสำหรับรูปแบบนี้</p>
        </div>
      )}

      {/* Rail SKU (catalog) — เลือกรุ่นรางจากคลังวัสดุ → ผูกทุนจริง (ว่าง = ใช้ค่าเริ่มต้น) */}
      {features.hasRail && railSkus.length > 0 && (
        <div className="space-y-2 animate-fade-in">
          <label className="text-sm font-medium text-muted-foreground ml-1 flex items-center gap-1.5">
            <Wrench className="w-3.5 h-3.5" /> รุ่นราง (จากข้อมูลสินค้า & ราคา)
          </label>
          <Select
            options={[
              { label: '— ไม่ระบุ (ใช้ค่าเริ่มต้น) —', value: '' },
              ...railSkus.map((s) => ({ label: railSkuLabel(s), value: s.code })),
            ]}
            value={railCodeValid ? data.rail_code || '' : ''}
            onChange={(e) => handleRailSkuSelect(e.target.value)}
          />
        </div>
      )}

      {/* Rail Color — dropdown: 6 สี THONG DECOR + กำหนดเอง (กำหนดเอง = พิมพ์ข้อความเอง) */}
      {features.hasRail && (
        <div className="space-y-2 animate-fade-in">
          <label className="text-sm font-medium text-muted-foreground ml-1 flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5" /> สีราง / อุปกรณ์
          </label>
          <Select
            options={RAIL_COLOR_OPTIONS}
            value={railColorCustom ? RAIL_COLOR_CUSTOM : railColor}
            onChange={(e) => handleRailColorSelect(e.target.value)}
            className={cn(
              errors?.rail_color && 'border-destructive focus-visible:ring-destructive'
            )}
          />
          {railColorCustom && (
            <Input
              prefix={<Palette className="w-4 h-4 text-muted-foreground" />}
              placeholder="ระบุสีราง/อุปกรณ์เอง..."
              value={data.rail_color || ''}
              onChange={(e) => onChange('rail_color', e.target.value)}
              error={errors?.rail_color}
              warning={warnings?.rail_color}
              className="h-12"
            />
          )}
          {!railColorCustom && (errors?.rail_color || warnings?.rail_color) && (
            <p
              className={cn(
                'text-xs px-1',
                errors?.rail_color ? 'text-destructive' : 'text-warning-foreground'
              )}
            >
              {errors?.rail_color || warnings?.rail_color}
            </p>
          )}
        </div>
      )}

      {/* Hook Type — ทุกสไตล์ที่มี hasHook ยกเว้น ลอน */}
      {features.hasHook && (
        <div className="space-y-2 animate-fade-in">
          <label className="text-sm font-medium text-muted-foreground ml-1">ประเภทตะขอ</label>
          <div className="grid grid-cols-2 gap-3">
            <PillButton
              value="short"
              label="ตะขอสั้น"
              description="บังราง"
              icon={Hexagon}
              currentValue={data.hook_type}
              onChange={(v) => onChange('hook_type', v)}
            />
            <PillButton
              value="long"
              label="ตะขอยาว"
              description="โชว์ราง"
              icon={Eye}
              currentValue={data.hook_type}
              onChange={(v) => onChange('hook_type', v)}
            />
          </div>
        </div>
      )}

      {/* Button Spacing — ลอน เท่านั้น (กำหนดความลึกลอน → มีผลต่อปริมาณผ้า) */}
      {isWave && (
        <div className="space-y-2 animate-fade-in">
          <label className="text-sm font-medium text-muted-foreground ml-1 flex items-center gap-1.5">
            <GripVertical className="w-3.5 h-3.5" /> ระยะกระดุม (ความลึกลอน)
          </label>
          <div className="grid grid-cols-2 gap-3">
            {FORMULAS.curtain.wave_spacings.map((wave) => (
              <PillButton
                key={wave.spacing}
                value={wave.spacing}
                label={`${wave.spacing} ซม.`}
                description={`${wave.label} · ผ้า ×${wave.multiplier}`}
                icon={GripVertical}
                currentValue={data.button_spacing}
                onChange={(v) => onChange('button_spacing', v)}
              />
            ))}
          </div>
          <p className="text-sm text-muted-foreground/80 ml-1 mt-1">
            ลอนลึกใช้ผ้าเพิ่มขึ้นเล็กน้อย — เห็นใน <span className="font-semibold">Pro Mode</span>
          </p>
        </div>
      )}

      {/* Chain Position */}
      {features.hasChain && (
        <div className="space-y-2 animate-fade-in">
          <label className="text-sm font-medium text-muted-foreground ml-1 flex items-center gap-1.5">
            <Link2 className="w-3.5 h-3.5" /> ตำแหน่งโซ่ไข่ปลา
          </label>
          <div className="grid grid-cols-2 gap-3">
            <PillButton
              value="left"
              label="ซ้าย"
              icon={ArrowLeftToLine}
              currentValue={data.chain_position}
              onChange={(v) => onChange('chain_position', v)}
            />
            <PillButton
              value="right"
              label="ขวา"
              icon={ArrowRightToLine}
              currentValue={data.chain_position}
              onChange={(v) => onChange('chain_position', v)}
            />
          </div>
        </div>
      )}

      {/* Eyelet Color */}
      {features.hasEyelet && (
        <div className="animate-fade-in">
          <Input
            label="สีตาไก่"
            prefix={<Circle className="w-4 h-4 text-muted-foreground" />}
            placeholder="ระบุสีตาไก่..."
            value={data.eyelet_color || ''}
            onChange={(e) => onChange('eyelet_color', e.target.value)}
            error={errors?.eyelet_color}
            className="h-12"
          />
        </div>
      )}

      {/* ขาจับราง — ม่านแป๊บ/สอดราง (คงที่ 4 ขา/ชุด · รวมในต้นทุนแล้ว) */}
      {isRod && (
        <div className="animate-fade-in flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3">
          <div className="shrink-0 w-9 h-9 rounded-lg bg-muted text-foreground flex items-center justify-center">
            <Wrench className="w-4 h-4" strokeWidth={1.5} />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-foreground">
              ขาจับราง {FORMULAS.materials.rod_brackets_per_set} ขา/ชุด
            </div>
            <div className="text-xs text-muted-foreground leading-tight">
              รวมในชุดรางแล้ว — เลือกรุ่นราง/ปรับทุนได้ที่ “ข้อมูลสินค้า & ราคา”
            </div>
          </div>
        </div>
      )}

      {/* Pleat Distance (จีบ only) */}
      {isPleated && (
        <div className="animate-fade-in">
          <Input
            label="ระยะจีบ"
            prefix={<Ruler className="w-4 h-4 text-muted-foreground" />}
            placeholder="เช่น 10"
            suffix="ซม."
            inputMode="decimal"
            value={data.pleat_distance || ''}
            onChange={(e) => onChange('pleat_distance', e.target.value)}
            error={errors?.pleat_distance}
            className="h-12"
          />
        </div>
      )}
    </FormSection>
  );
};
