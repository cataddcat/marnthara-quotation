import React, { useMemo } from 'react';
import { AreaItemInput, ItemData } from '@/types';
import { PricingEngine } from '@/lib/pricing/PricingEngine';
import { fmtTH } from '@/utils/formatters';
import { useZodForm } from '@/hooks/useZodForm';
import { WoodenBlindsSchema, WoodenBlindsFormValues } from '../schemas';
import { Input } from '@/components/ui/Input';
import { ComboboxInput } from '@/components/ui/ComboboxInput';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import { Tag, ArrowLeftToLine, ArrowRightToLine, Blinds } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/useAppStore';
import { FAVORITE_CATEGORIES, ITEM_TYPES } from '@/config/enums';

interface WoodenBlindsFormProps {
  // รับ Partial<AreaItemInput> ที่กว้างกว่า — รองรับ caller (ItemModal) ที่ส่ง Partial<ItemData>
  initialData?: Partial<AreaItemInput> & { type?: string; id?: string };
  onSubmit: (data: AreaItemInput) => void;
  onCancel: () => void;
  itemType?: string;
  onAutoSave?: (data: Partial<AreaItemInput>) => void;
}

const DEFAULT_DATA: WoodenBlindsFormValues = {
  type: ITEM_TYPES.WOODEN_BLIND,
  width_m: '',
  height_m: '',
  price_sqyd: '',
  code: '',
  notes: '',
  fabric_variant: 'ไม้',
  adjustment_side: 'ขวา',
  is_suspended: false,
  enable_set_price: false,
  set_price_override: 0,
};

export const WoodenBlindsForm: React.FC<WoodenBlindsFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  itemType = ITEM_TYPES.WOODEN_BLIND,
  onAutoSave,
}) => {
  const { formData, errors, handleChange, handleNumberChange, handleSubmit } = useZodForm<WoodenBlindsFormValues>({
    schema: WoodenBlindsSchema,
    initialData: { ...DEFAULT_DATA, ...initialData } as WoodenBlindsFormValues,
    onSubmit: (data) => onSubmit(data as unknown as AreaItemInput),
  });

  const { favorites } = useAppStore();

  // Determine Favorite Category based on itemType
  const favCategory =
    itemType === ITEM_TYPES.ROLLER_BLIND
      ? FAVORITE_CATEGORIES.ROLLER_BLIND
      : itemType === ITEM_TYPES.ALUMINUM_BLIND
        ? FAVORITE_CATEGORIES.ALUMINUM_BLIND
        : FAVORITE_CATEGORIES.WOODEN_BLIND;

  // Pricing Logic
  const pricePreview = useMemo(() => {
    const previewItem = {
      ...DEFAULT_DATA,
      ...formData,
      type: itemType,
      id: 'preview',
    } as unknown as ItemData;
    return PricingEngine.calculateDetailedPrice(previewItem);
  }, [formData, itemType]);

  // Favorites Logic
  const suggestions = useMemo(
    () =>
      (favorites[favCategory] || []).map((f) => ({
        label: f.code,
        value: f.code,
        desc: `${f.default_price_per_m}`,
        data: f,
      })),
    [favorites, favCategory]
  );

  const handleCodeChange = (val: string) => {
    handleChange('code', val);
    const match = suggestions.find((s) => s.value.toLowerCase() === val.toLowerCase());
    if (match && match.data?.default_price_per_m) {
      handleNumberChange('price_sqyd', String(match.data.default_price_per_m));
    }
  };

  return (
    <form onSubmit={handleSubmit} onBlur={() => onAutoSave?.(formData as unknown as AreaItemInput)} className="space-y-6 pb-20 sm:pb-0">
      {/* 1. Dimensions */}
      <div className="bg-card p-4 rounded-2xl border border-border shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-foreground font-bold">
          <Blinds className="w-5 h-5 text-sky-500" />
          <h2>ขนาดพื้นที่ (ม.)</h2>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {/* [FIX] Use Standard Input instead of Combobox to prevent random suggestions */}
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

      {/* 2. Options */}
      <div className="bg-card p-4 rounded-2xl border border-border shadow-sm space-y-4">
        {/* Tape Type Selector */}
        <div className="grid grid-cols-2 gap-2 bg-muted/50 p-1 rounded-xl">
          {['รุ่นเชือก', 'รุ่นโซ่'].map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => handleChange('fabric_variant', type)} // Using fabric_variant to store tape type/model
              className={cn(
                'flex items-center justify-center py-2 rounded-lg text-xs font-medium transition-all',
                formData.fabric_variant === type
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-muted-foreground hover:bg-background/50'
              )}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Code & Price */}
        <div className="grid grid-cols-2 gap-3">
          {/* [FIX] Keep Combobox ONLY for Code/Color */}
          <ComboboxInput
            label="รุ่น/รหัส/สี"
            options={suggestions}
            value={formData.code || ''}
            onChange={handleCodeChange}
            className="bg-muted/50" // [FIX] Remove white background
            placeholder="เช่น BW-01"
          />

          {/* [FIX] Use Standard Input for Price to stop suggesting dimensions */}
          <Input
            label="ราคาขาย (บาท/ตร.ล.)"
            value={formData.price_sqyd || ''}
            onChange={(e) => handleNumberChange('price_sqyd', e.target.value)}
            className="bg-muted/50"
            inputMode="decimal"
            placeholder="0.00"
          />
        </div>

        {/* Control Side */}
        <div className="pt-2">
          <label className="text-sm font-bold text-foreground mb-2 block">ตำแหน่งดึง (Side)</label>
          <div className="grid grid-cols-2 gap-3">
            {['ซ้าย', 'ขวา'].map((side) => (
              <button
                key={side}
                type="button"
                onClick={() => handleChange('adjustment_side', side)}
                className={cn(
                  'flex items-center justify-center gap-2 py-3 rounded-xl border transition-all',
                  formData.adjustment_side === side
                    ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400'
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
      <div className="bg-card border border-border p-5 rounded-2xl shadow-sm space-y-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold border-b border-border pb-3">
          <Tag className="w-5 h-5" />
          <h3>สรุปรายการคำนวณ</h3>
        </div>

        <div className="flex justify-between items-baseline">
          <div className="text-sm text-muted-foreground">ราคาสุทธิ</div>
          <span className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            {fmtTH(pricePreview.total)}
          </span>
        </div>

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

      {/* 4. Actions */}
      <div className="pt-2 space-y-4">
        <Input
          label="หมายเหตุ"
          value={formData.notes || ''}
          onChange={(e) => handleChange('notes', e.target.value)}
          className="bg-muted/50 border-transparent focus:bg-background"
        />
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-border mt-4">
          <Button
            variant="ghost"
            type="button"
            onClick={onCancel}
            className="h-12 px-6 text-muted-foreground"
          >
            ยกเลิก
          </Button>
          <Button
            type="submit"
            className="h-12 px-8 text-base shadow-lg shadow-amber-500/20 bg-amber-600 hover:bg-amber-700 text-white"
          >
            บันทึก
          </Button>
        </div>
      </div>
    </form>
  );
};
