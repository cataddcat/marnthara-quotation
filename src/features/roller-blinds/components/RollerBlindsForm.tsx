import React, { useMemo } from 'react';
import { AreaItemInput, ItemData } from '@/types';
import { PricingEngine } from '@/lib/pricing/PricingEngine';
import { toNum, fmtTH } from '@/utils/formatters';
import { useZodForm } from '@/hooks/useZodForm';
import { RollerBlindsSchema, RollerBlindsFormValues } from '../schemas';
import { Input } from '@/components/ui/Input';
import { ComboboxInput } from '@/components/ui/ComboboxInput';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import { Tag, ArrowLeftToLine, ArrowRightToLine, Minimize2, Star, Book } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/useAppStore';
import { useSaveToCatalog } from '@/hooks/useSaveToCatalog';
import { ITEM_TYPES, FAVORITE_CATEGORIES } from '@/config/enums';

export const ROLLER_BLINDS_FORM_ID = 'roller-blinds-edit-form';

interface RollerBlindsFormProps {
  initialData?: Partial<AreaItemInput> & { type?: string; id?: string };
  onSubmit: (data: AreaItemInput) => void;
  onCancel: () => void;
  onAutoSave?: (data: Partial<AreaItemInput>) => void;
}

const DEFAULT_DATA: RollerBlindsFormValues = {
  type: ITEM_TYPES.ROLLER_BLIND,
  width_m: '',
  height_m: '',
  price_sqyd: '',
  code: '',
  notes: '',
  fabric_variant: 'Blackout',
  adjustment_side: 'ขวา',
  is_suspended: false,
  enable_set_price: false,
  set_price_override: 0,
};

export const RollerBlindsForm: React.FC<RollerBlindsFormProps> = ({
  initialData,
  onSubmit,
  onAutoSave,
}) => {
  const { formData, errors, warnings, handleChange, handleNumberChange, handleSubmit } = useZodForm<RollerBlindsFormValues>({
    schema: RollerBlindsSchema,
    initialData: { ...DEFAULT_DATA, ...initialData } as RollerBlindsFormValues,
    onSubmit: (data) => onSubmit(data as unknown as AreaItemInput),
  });

  const { favorites, openModal } = useAppStore();
  const { saveToCatalog, isInCatalog } = useSaveToCatalog();

  // Pricing Logic
  const pricePreview = useMemo(() => {
    const previewItem: ItemData = {
      ...DEFAULT_DATA,
      ...formData,
      type: ITEM_TYPES.ROLLER_BLIND,
      id: 'preview',
    };
    return PricingEngine.calculateDetailedPrice(previewItem);
  }, [formData]);

  // Favorites Logic
  const suggestions = useMemo(
    () =>
      (favorites[FAVORITE_CATEGORIES.ROLLER_BLIND] || []).map((f) => ({
        label: f.code,
        value: f.code,
        desc: `${f.default_price_per_m}`,
        data: f,
      })),
    [favorites]
  );

  const handleCodeChange = (val: string) => {
    handleChange('code', val);
    const match = suggestions.find((s) => s.value.toLowerCase() === val.toLowerCase());
    if (match && match.data?.default_price_per_m) {
      handleNumberChange('price_sqyd', String(match.data.default_price_per_m));
    }
  };

  return (
    <form id={ROLLER_BLINDS_FORM_ID} onSubmit={handleSubmit} onBlur={() => onAutoSave?.(formData)} className="space-y-6">
      {/* 1. Dimensions */}
      <div className="bg-card p-4 rounded-2xl border border-border shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-foreground font-bold">
          <Minimize2 className="w-5 h-5 text-sky-500" />
          <h2>ขนาดพื้นที่ (ม.)</h2>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="กว้าง (W)"
            placeholder="0.00"
            value={formData.width_m}
            onChange={(e) => handleNumberChange('width_m', e.target.value)}
            isDimension
            autoFocus
            className="text-lg font-bold text-sky-600 dark:text-sky-400 bg-sky-500/10"
            error={errors.width_m}
          />
          <Input
            label="สูง (H)"
            placeholder="0.00"
            value={formData.height_m}
            onChange={(e) => handleNumberChange('height_m', e.target.value)}
            isDimension
            className="text-lg font-bold text-sky-600 dark:text-sky-400 bg-sky-500/10"
            error={errors.height_m}
          />
        </div>
      </div>

      {/* 2. Details */}
      <div className="bg-muted/50 p-4 rounded-xl border border-border space-y-4">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-sm font-bold text-foreground flex items-center gap-2">
              <Tag className="w-4 h-4 text-muted-foreground" /> รหัส/รุ่น
            </label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 gap-1 text-muted-foreground hover:text-teal-600"
              onClick={() =>
                openModal('materialSummary', { initialTab: 'catalog', initialCategory: FAVORITE_CATEGORIES.ROLLER_BLIND })
              }
            >
              <Book className="w-3.5 h-3.5" />
              <span className="text-xs">จัดการรายการ</span>
            </Button>
          </div>

          <ComboboxInput
            placeholder="ระบุรุ่น/รหัส..."
            value={formData.code || ''}
            onChange={handleCodeChange}
            options={suggestions}
          />

          <div className="relative">
            <Input
              placeholder="ราคา (บาท/ตร.ล.)"
              inputMode="decimal"
              value={formData.price_sqyd || ''}
              onChange={(e) => handleNumberChange('price_sqyd', e.target.value)}
              warning={warnings.price_sqyd}
            />
            {formData.code && toNum(formData.price_sqyd) > 0 && (
              <button
                type="button"
                onClick={() =>
                  saveToCatalog(
                    FAVORITE_CATEGORIES.ROLLER_BLIND,
                    formData.code,
                    formData.price_sqyd
                  )
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 z-10 hover:scale-110 transition-transform"
              >
                <Star
                  className={cn(
                    'w-5 h-5 transition-colors',
                    isInCatalog(FAVORITE_CATEGORIES.ROLLER_BLIND, formData.code)
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-muted-foreground hover:text-amber-400'
                  )}
                />
              </button>
            )}
          </div>
        </div>

        {/* Option: Fabric Variant */}
        <div className="space-y-2 pt-2 border-t border-border">
          <label className="text-[13px] font-medium text-muted-foreground">ประเภทใบ</label>
          <div className="grid grid-cols-3 gap-2 bg-muted/50 p-1 rounded-xl">
            {['Blackout', 'Sunscreen', 'Dimout'].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => handleChange('fabric_variant', v)}
                className={cn(
                  'flex items-center justify-center py-2 rounded-lg text-xs font-medium transition-all',
                  formData.fabric_variant === v
                    ? 'bg-teal-600 text-white shadow-md'
                    : 'text-muted-foreground hover:bg-background/50'
                )}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Controls: Pull Side */}
        <div className="space-y-2">
          <label className="text-[13px] font-medium text-muted-foreground">ฝั่งดึง</label>
          <div className="grid grid-cols-2 gap-3">
            {['ซ้าย', 'ขวา'].map((side) => (
              <button
                key={side}
                type="button"
                onClick={() => handleChange('adjustment_side', side)}
                className={cn(
                  'flex items-center justify-center gap-2 py-3 rounded-xl border transition-all',
                  formData.adjustment_side === side
                    ? 'border-teal-500 bg-teal-500/10 text-teal-600 dark:text-teal-400'
                    : 'border-border text-muted-foreground hover:bg-muted'
                )}
              >
                {side === 'ซ้าย' ? (
                  <ArrowLeftToLine className="w-4 h-4" />
                ) : (
                  <ArrowRightToLine className="w-4 h-4" />
                )}
                {side}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Summary */}
      <div className="bg-card border border-border p-5 rounded-2xl shadow-sm space-y-4 text-foreground relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>พื้นที่ (ตร.ล.):</span>
            <span className="text-teal-600 dark:text-teal-400 tabular-nums">
              {pricePreview.breakdown?.areaSqyd?.toFixed(2) || '0.00'}
            </span>
          </div>
          <div className="flex justify-between items-end pt-2 border-t border-border mt-2">
            <span className="text-muted-foreground pb-1">ราคาสุทธิ</span>
            <span className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
              {fmtTH(pricePreview.total)}
            </span>
          </div>
          {/* Override UI */}
          <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Switch
                checked={formData.enable_set_price || false}
                onCheckedChange={(c) => handleChange('enable_set_price', c)}
                className="data-[state=checked]:bg-emerald-500"
              />
              <span className="text-sm text-muted-foreground">กำหนดราคาเอง</span>
            </div>
            {formData.enable_set_price && (
              <div className="w-32">
                <input
                  type="text"
                  inputMode="decimal"
                  value={formData.set_price_override || ''}
                  onChange={(e) => handleNumberChange('set_price_override', e.target.value)}
                  className="w-full bg-muted/50 text-foreground border border-input rounded-lg px-3 py-1.5 text-right font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="pt-2 space-y-4">
        <Input
          label="หมายเหตุ"
          value={formData.notes || ''}
          onChange={(e) => handleChange('notes', e.target.value)}
          className="bg-muted/50 border-transparent focus:bg-background"
        />
      </div>
    </form>
  );
};
