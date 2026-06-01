import React from 'react';
import { CurtainItemInput } from '@/types';
import { CURTAIN_STYLE_FEATURES } from '@/config/constants';
import { FORMULAS } from '@/config/formulas';
import { Input } from '@/components/ui/Input';
import { FormSection } from '@/components/ui/FormSection';
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
          ? 'border-primary bg-primary/10 text-primary shadow-md'
          : 'border-border bg-card text-muted-foreground hover:bg-muted/30 hover:border-primary/50'
      )}
    >
      <Icon
        className={cn('w-6 h-6 mb-1', isSelected ? 'text-primary' : 'text-slate-400')}
        strokeWidth={1.5}
      />
      <span className="text-xs font-semibold leading-tight text-center">{label}</span>
      {description && (
        <span className="text-[10px] text-muted-foreground/80 mt-0.5 text-center">
          {description}
        </span>
      )}
      {isSelected && (
        <div className="absolute top-1 right-1 bg-primary text-white rounded-full p-0.5">
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
  const features = CURTAIN_STYLE_FEATURES[data.style] || {
    hasRail: false,
    hasHook: false,
    hasChain: false,
    hasEyelet: false,
  };
  const isPleated = data.style === 'จีบ';
  const isWave = data.style === 'ลอน';
  const hasAnyHardware =
    features.hasRail ||
    features.hasHook ||
    features.hasChain ||
    features.hasEyelet ||
    isPleated ||
    isWave;

  return (
    <FormSection
      icon={Wrench}
      iconClass="text-primary"
      title="อุปกรณ์ม่าน"
      headerRight={
        <span className="text-xs text-muted-foreground">ข้อมูลสำหรับฝ่ายผลิต</span>
      }
    >
      {!hasAnyHardware && (
        <div className="flex flex-col items-center justify-center py-6 text-muted-foreground gap-2">
          <CheckCircle2 className="w-10 h-10 text-emerald-500/40" />
          <p className="text-sm">ไม่มีอุปกรณ์เพิ่มเติมสำหรับรูปแบบนี้</p>
        </div>
      )}

      {/* Rail Color */}
      {features.hasRail && (
        <div className="animate-fade-in">
          <Input
            label="สีราง / อุปกรณ์"
            prefix={<Palette className="w-4 h-4 text-muted-foreground" />}
            placeholder="ระบุสีราง..."
            value={data.rail_color || ''}
            onChange={(e) => onChange('rail_color', e.target.value)}
            error={errors?.rail_color}
            warning={warnings?.rail_color}
            className="h-12"
          />
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
          <p className="text-[11px] text-muted-foreground/80 ml-1 mt-1">
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
