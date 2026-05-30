import React, { useMemo } from 'react';
import { AreaItemInput, ItemData } from '@/types';
import { PricingEngine } from '@/lib/pricing/PricingEngine';
import { fmtTH } from '@/utils/formatters';
import { useZodForm } from '@/hooks/useZodForm';
import { PleatedScreenSchema, PleatedScreenFormValues } from '../schemas';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { Tag, Grid3X3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ITEM_TYPES, OPENING_STYLES } from '@/config/enums';

export const PLEATED_SCREEN_FORM_ID = 'pleated-screen-edit-form';

interface PleatedScreenFormProps {
  initialData?: Partial<AreaItemInput> & { type?: string; id?: string };
  onSubmit: (data: AreaItemInput) => void;
  onCancel: () => void;
  onAutoSave?: (data: Partial<AreaItemInput>) => void;
}

const DEFAULT_DATA: PleatedScreenFormValues = {
  type: ITEM_TYPES.PLEATED_SCREEN,
  width_m: '',
  height_m: '',
  price_sqyd: '',
  code: '',
  notes: '',
  fabric_variant: 'มุ้งจีบ',
  opening_style: OPENING_STYLES.SIDE,
  is_suspended: false,
  enable_set_price: false,
  set_price_override: 0,
};

export const PleatedScreenForm: React.FC<PleatedScreenFormProps> = ({
  initialData,
  onSubmit,
  onAutoSave,
}) => {
  const { formData, errors, handleChange, handleNumberChange, handleSubmit } = useZodForm<PleatedScreenFormValues>({
    schema: PleatedScreenSchema,
    initialData: { ...DEFAULT_DATA, ...initialData } as PleatedScreenFormValues,
    onSubmit: (data) => onSubmit(data as unknown as AreaItemInput),
  });


  const pricePreview = useMemo(() => {
    const previewItem: ItemData = {
      ...DEFAULT_DATA,
      ...formData,
      type: ITEM_TYPES.PLEATED_SCREEN,
      id: 'preview',
    };
    return PricingEngine.calculateDetailedPrice(previewItem);
  }, [formData]);

  // Note: The following functions are commented out as they are not used in the current JSX
  // but kept for future reference if needed

  // const suggestions = useMemo(() => (favorites[FAVORITE_CATEGORIES.PLEATED_SCREEN] || []).map(f => ({ label: f.code, value: f.code, desc: `${f.default_price_per_m}`, data: f })), [favorites]);

  // const handleCodeChange = (val: string) => {
  //   handleChange('code', val);
  //   const match = suggestions.find((s) => s.value.toLowerCase() === val.toLowerCase());
  //   if (match && match.data?.default_price_per_m) handleNumberChange('price_sqyd', String(match.data.default_price_per_m));
  // };

  // const handleSaveFav = async () => { /* Reuse Logic */
  //    const code = formData.code; const price = toNum(formData.price_sqyd);
  //    if (!code || price <= 0) return addToast('warning', 'ระบุรหัสและราคา');
  //    const existing = (favorites[FAVORITE_CATEGORIES.PLEATED_SCREEN] || []).find(f => f.code === code);
  //    if(existing && existing.default_price_per_m !== price) {
  //       if(await confirm({ title: 'อัพเดทราคา?', description: `เปลี่ยน ${existing.default_price_per_m} -> ${price}?` })) updateFavorite(FAVORITE_CATEGORIES.PLEATED_SCREEN, existing.id, { default_price_per_m: price });
  //    } else if(!existing) { addFavorite(FAVORITE_CATEGORIES.PLEATED_SCREEN, { code, default_price_per_m: price }); addToast('success', 'บันทึกแล้ว'); }
  // };
  // const isFav = (code?: string) => !!code && (favorites[FAVORITE_CATEGORIES.PLEATED_SCREEN] || []).some(f => f.code === code);


  return (
    <form id={PLEATED_SCREEN_FORM_ID} onSubmit={handleSubmit} onBlur={() => onAutoSave?.(formData)} className="space-y-6 pb-20 sm:pb-0">
      <div className="bg-card p-4 rounded-2xl border border-border shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-foreground font-bold">
          <Grid3X3 className="w-5 h-5 text-sky-500" />
          <h2>ขนาดพื้นที่ (ม.)</h2>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="กว้าง (W)"
            value={formData.width_m}
            onChange={(e) => handleNumberChange('width_m', e.target.value)}
            isDimension
            autoFocus
            className="text-lg font-bold text-sky-600 dark:text-sky-400 bg-sky-500/10"
            error={errors.width_m}
          />
          <Input
            label="สูง (H)"
            value={formData.height_m}
            onChange={(e) => handleNumberChange('height_m', e.target.value)}
            isDimension
            className="text-lg font-bold text-sky-600 dark:text-sky-400 bg-sky-500/10"
            error={errors.height_m}
          />
        </div>
      </div>

      <div className="bg-card p-4 rounded-2xl border border-border shadow-sm space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="สีเฟรม"
            value={formData.code || ''}
            onChange={(e) => handleChange('code', e.target.value)}
            className="bg-muted/50"
            placeholder="ระบุสี..."
          />
          <Input
            label="ราคาขาย (บาท/ตร.ม.)"
            value={formData.price_sqyd || ''}
            onChange={(e) => handleNumberChange('price_sqyd', e.target.value)}
            className="bg-muted/50"
            inputMode="decimal"
          />
        </div>

        {/* Opening Style */}
        <div className="pt-2">
          <label className="text-sm font-bold text-foreground mb-2 block">รูปแบบการเปิด</label>
          <div className="grid grid-cols-2 gap-2">
            {Object.values(OPENING_STYLES).map((style) => (
              <button
                key={style}
                type="button"
                onClick={() => handleChange('opening_style', style)}
                className={cn(
                  'py-2 px-3 rounded-lg text-xs font-medium border transition-all',
                  formData.opening_style === style
                    ? 'bg-pink-500/10 border-pink-500/50 text-pink-600 dark:text-pink-400'
                    : 'bg-background border-border text-muted-foreground hover:bg-muted'
                )}
              >
                {style}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-card border border-border p-5 rounded-2xl shadow-sm space-y-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
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
