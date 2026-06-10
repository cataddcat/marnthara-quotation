import React, { useMemo } from 'react';
import { CurtainItemInput, ItemData } from '@/types';
import { PricingEngine } from '@/lib/pricing/PricingEngine';
import { fmtTH } from '@/utils/formatters';
import { Switch } from '@/components/ui/Switch';
import { Input } from '@/components/ui/Input';
import { STATUS_DOT } from '@/lib/status-style';
import { ITEM_TYPES } from '@/config/enums';
import { useCostStatus } from '@/hooks/useCostStatus';
import { Wallet, Lock, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProModeControl } from './ProModeControl';

interface PriceSummaryProps {
  data: CurtainItemInput;
  onChange: (field: keyof CurtainItemInput, val: string | number | boolean) => void;
  onNumberChange: (field: keyof CurtainItemInput, val: string) => void;
  /** แสดงโหมดวิเคราะห์ต้นทุน (Pro Mode) — เฉพาะโหมดละเอียด */
  showProMode?: boolean;
}

interface SettingsRowProps {
  icon: React.ElementType;
  label: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
  iconClass?: string;
  children?: React.ReactNode;
}

const SettingsRow: React.FC<SettingsRowProps> = ({
  icon: Icon,
  label,
  description,
  checked,
  onToggle,
  iconClass,
  children,
}) => (
  <div className="px-4 py-3">
    <div
      className="flex items-center gap-3 cursor-pointer select-none active:opacity-80 transition-opacity"
      onClick={onToggle}
    >
      <div
        className={cn(
          'shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
          checked
            ? cn('bg-accent', iconClass ?? 'text-foreground')
            : 'bg-muted text-muted-foreground'
        )}
      >
        <Icon className="w-4 h-4" strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0">
        <div
          className={cn(
            'text-sm font-semibold transition-colors',
            checked ? 'text-foreground' : 'text-foreground/80'
          )}
        >
          {label}
        </div>
        <div className="text-xs text-muted-foreground leading-tight mt-0.5">
          {description}
        </div>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={() => {}}
        size="sm"
        className="pointer-events-none shrink-0"
      />
    </div>
    {children && (
      <div className="pl-11 pr-1 mt-3 animate-in slide-in-from-top-1 fade-in duration-200">
        {children}
      </div>
    )}
  </div>
);

export const PriceSummary: React.FC<PriceSummaryProps> = ({
  data,
  onChange,
  onNumberChange,
  showProMode = true,
}) => {
  const curtainItem = useMemo<ItemData>(
    () => ({ ...data, type: ITEM_TYPES.CURTAIN, id: 'temp' }) as ItemData,
    [data]
  );
  const price = useMemo(() => PricingEngine.calculatePrice(curtainItem), [curtainItem]);

  const analysis = useCostStatus(curtainItem);
  const status = analysis?.status ?? 'unknown';
  const isProMode = data._is_pro_mode || false;
  const isOverride = data.enable_set_price || false;

  const showTrafficLight = !isOverride && status !== 'unknown';

  return (
    <div className="space-y-3">
      {/* === Card 1: Price + Settings === */}
      <div className="bg-card rounded-xl border border-border overflow-hidden divide-y divide-border/60">
        {/* Header — Net Price */}
        <div className="px-4 py-4 flex items-center justify-between gap-3 bg-muted/30">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-foreground shrink-0">
              {isOverride ? <Lock className="w-4 h-4" strokeWidth={1.5} /> : <Wallet className="w-4 h-4" strokeWidth={1.5} />}
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                ราคาสุทธิ
              </div>
              <div className="text-xs text-muted-foreground/70 leading-tight">
                {isOverride ? 'กำหนดราคาเอง' : 'คำนวณอัตโนมัติ'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={cn(
                'text-2xl font-bold font-mono tracking-tight tabular-nums transition-colors duration-300',
                isOverride
                  ? 'text-amber-500'
                  : 'text-emerald-600 dark:text-emerald-400',
                isProMode && status === 'loss' && !isOverride && 'text-destructive'
              )}
            >
              {fmtTH(price)}
            </span>
            {showTrafficLight && (
              <span
                className={cn(
                  'inline-flex h-2.5 w-2.5 rounded-full ring-2 ring-background shrink-0 transition-colors',
                  STATUS_DOT[status],
                  (status === 'warning' || status === 'loss') && 'animate-pulse'
                )}
                title={status}
              />
            )}
          </div>
        </div>

        {/* Row 1: Manual Override */}
        <SettingsRow
          icon={Lock}
          label="กำหนดราคาเอง"
          description="ตั้งราคาคงที่ ข้ามการคำนวณตามผ้า"
          checked={isOverride}
          onToggle={() => onChange('enable_set_price', !isOverride)}
          iconClass="text-amber-500"
        >
          {isOverride && (
            <Input
              type="text"
              inputMode="decimal"
              placeholder="0"
              suffix="฿"
              value={data.set_price_override || ''}
              onChange={(e) => onNumberChange('set_price_override', e.target.value)}
              className="text-right font-mono font-bold text-amber-600 dark:text-amber-500 bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40"
              autoFocus
            />
          )}
        </SettingsRow>

        {/* Row 2: Pro Mode (full mode only) */}
        {showProMode && (
          <SettingsRow
            icon={BarChart3}
            label="วิเคราะห์ต้นทุน"
            description="ดูต้นทุน กำไร และราคาแนะนำ"
            checked={isProMode}
            onToggle={() => onChange('_is_pro_mode', !isProMode)}
            iconClass="text-foreground"
          />
        )}
      </div>

      {/* === Card 2: Pro Mode Dashboard (separate card for clarity) === */}
      {showProMode && isProMode && (
        <div className="rounded-xl border border-border overflow-hidden bg-slate-900 text-slate-100 animate-in slide-in-from-top-2 fade-in duration-300">
          <div className="px-4 py-2.5 flex items-center justify-between border-b border-slate-800 bg-slate-950/50">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                การวิเคราะห์ต้นทุน
              </span>
            </div>
            <span className="text-xs text-emerald-400/80 flex items-center gap-1">
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </span>
          </div>
          <div className="p-3">
            <ProModeControl formData={data} onChange={onChange} simpleView={true} />
          </div>
        </div>
      )}
    </div>
  );
};
