import React, { useMemo } from 'react';
import { AreaItemInput, ItemData } from '@/types';
import { PricingEngine } from '@/lib/pricing/PricingEngine';
import { toNum, fmtTH } from '@/utils/formatters';
import { useZodForm } from '@/hooks/useZodForm';
import { PartitionSchema, PartitionFormValues } from '../schemas';
import { Input } from '@/components/ui/Input';
import { ComboboxInput } from '@/components/ui/ComboboxInput';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import { Tag, Grid3X3, SplitSquareHorizontal, ArrowRight, Star, Book } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/useAppStore';
import { useUIStore } from '@/store/useUIStore';
import { useConfirm } from '@/hooks/useConfirm';
import { ITEM_TYPES, FAVORITE_CATEGORIES, OPENING_STYLES } from '@/config/enums';

interface PartitionFormProps {
  initialData?: Partial<AreaItemInput> & { type?: string; id?: string };
  onSubmit: (data: AreaItemInput) => void;
  onCancel: () => void;
  onAutoSave?: (data: Partial<AreaItemInput>) => void;
}

const DEFAULT_DATA: PartitionFormValues = {
  type: ITEM_TYPES.PARTITION,
  width_m: '',
  height_m: '',
  price_sqyd: '',
  code: '',
  notes: '',
  fabric_variant: 'PVC ทึบ',
  opening_style: OPENING_STYLES.SIDE,
  is_suspended: false,
  enable_set_price: false,
  set_price_override: 0,
};

export const PartitionForm: React.FC<PartitionFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  onAutoSave,
}) => {
  const { formData, errors, warnings, handleChange, handleNumberChange, handleSubmit } = useZodForm<PartitionFormValues>({
    schema: PartitionSchema,
    initialData: { ...DEFAULT_DATA, ...initialData } as PartitionFormValues,
    onSubmit: (data) => onSubmit(data as unknown as AreaItemInput),
  });

  const { addFavorite, favorites, updateFavorite, openModal } = useAppStore();
  const { addToast } = useUIStore();
  const { confirm } = useConfirm();

  const pricePreview = useMemo(() => {
    const previewItem: ItemData = {
      ...DEFAULT_DATA,
      ...formData,
      type: ITEM_TYPES.PARTITION,
      id: 'preview',
    };
    return PricingEngine.calculateDetailedPrice(previewItem);
  }, [formData]);

  const suggestions = useMemo(
    () =>
      (favorites[FAVORITE_CATEGORIES.PARTITION] || []).map((f) => ({
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
    if (match && match.data?.default_price_per_m)
      handleNumberChange('price_sqyd', String(match.data.default_price_per_m));
  };

  const handleSaveFav = async () => {
    const code = formData.code;
    const price = toNum(formData.price_sqyd);
    if (!code || price <= 0) return addToast('warning', 'ระบุรหัสและราคา');
    const existing = (favorites[FAVORITE_CATEGORIES.PARTITION] || []).find((f) => f.code === code);
    if (existing && existing.default_price_per_m !== price) {
      if (
        await confirm({
          title: 'อัพเดทราคา?',
          description: `เปลี่ยนราคา ${existing.default_price_per_m} -> ${price}?`,
        })
      )
        updateFavorite(FAVORITE_CATEGORIES.PARTITION, existing.id, { default_price_per_m: price });
    } else if (!existing) {
      addFavorite(FAVORITE_CATEGORIES.PARTITION, { code, default_price_per_m: price });
      addToast('success', 'บันทึกแล้ว');
    }
  };
  const isFav = (code?: string) =>
    !!code && (favorites[FAVORITE_CATEGORIES.PARTITION] || []).some((f) => f.code === code);


  return (
    <form onSubmit={handleSubmit} onBlur={() => onAutoSave?.(formData)} className="space-y-6">
      {/* 1. Dimension Section */}
      <div className="bg-card p-4 rounded-2xl border border-border shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-foreground font-bold">
          <Grid3X3 className="w-5 h-5 text-sky-500" />
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

      {/* 2. Options Section */}
      <div className="bg-card p-4 rounded-2xl border border-border shadow-sm space-y-4">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-sm font-bold text-foreground flex items-center gap-2">
              <Tag className="w-4 h-4 text-muted-foreground" />
              รุ่น/สเปค
            </label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 gap-1 text-muted-foreground hover:text-emerald-600"
              onClick={() =>
                openModal('materialSummary', { initialTab: 'catalog', initialCategory: FAVORITE_CATEGORIES.PARTITION })
              }
            >
              <Book className="w-3.5 h-3.5" />
              <span className="text-xs">จัดการรายการ</span>
            </Button>
          </div>
          <ComboboxInput
            placeholder="เลือกสเปค (เช่น PVC ทึบ)..."
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
              className="bg-muted/50"
            />
            {formData.code && toNum(formData.price_sqyd) > 0 && (
              <button
                type="button"
                onClick={handleSaveFav}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 z-10 hover:scale-110 transition-transform"
              >
                <Star
                  className={cn(
                    'w-5 h-5',
                    isFav(formData.code) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'
                  )}
                />
              </button>
            )}
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t border-border">
          <label className="text-[13px] font-medium text-muted-foreground">รูปแบบการเปิด</label>
          <div className="flex gap-2">
            {[
              { l: 'เก็บข้างเดียว', v: OPENING_STYLES.SIDE, i: ArrowRight },
              { l: 'แยกกลาง', v: OPENING_STYLES.CENTER, i: SplitSquareHorizontal },
            ].map((opt) => (
              <button
                key={opt.v}
                type="button"
                onClick={() => handleChange('opening_style', opt.v)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm border transition-all',
                  formData.opening_style === opt.v
                    ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-600 dark:text-emerald-400 font-medium'
                    : 'bg-background border-border text-muted-foreground hover:bg-muted'
                )}
              >
                <opt.i className="w-4 h-4" />
                {opt.l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Summary Section */}
      <div className="bg-card border border-border p-5 rounded-2xl shadow-sm space-y-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold border-b border-border pb-3">
          <Tag className="w-5 h-5" />
          <h3>สรุปรายการคำนวณ</h3>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>พื้นที่ (ตร.ล.):</span>
            <span className="text-teal-600 dark:text-teal-400 tabular-nums">
              {pricePreview.breakdown?.areaSqyd?.toFixed(2) || '0.00'}
            </span>
          </div>
          <div className="flex justify-between items-end pt-2 border-t border-border mt-2">
            <span className="text-muted-foreground pb-1">ราคารวมโดยประมาณ</span>
            <span className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
              {fmtTH(pricePreview.total)}
            </span>
          </div>
        </div>

        {/* Override Section */}
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

      {/* 4. Notes & Actions */}
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
            className="h-12 px-8 text-base shadow-lg shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            บันทึก
          </Button>
        </div>
      </div>
    </form>
  );
};
