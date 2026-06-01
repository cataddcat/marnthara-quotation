import React, { useMemo } from 'react';
import { AreaItemInput, ItemData } from '@/types';
import { PricingEngine } from '@/lib/pricing/PricingEngine';
import { useZodForm } from '@/hooks/useZodForm';
import { PleatedScreenSchema, PleatedScreenFormValues } from '../schemas';
import { Input } from '@/components/ui/Input';
import { Tag, Grid3X3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useExperienceMode, useTierSize } from '@/hooks/useExperienceMode';
import { FormTwoColumn } from '@/components/ui/FormTwoColumn';
import { FormSection } from '@/components/ui/FormSection';
import { ItemSummaryCard } from '@/components/ui/ItemSummaryCard';
import { CostReadout } from '@/components/ui/CostReadout';
import { AdvancedSection } from '@/components/ui/AdvancedSection';
import { useCostStatus } from '@/hooks/useCostStatus';
import { getItemTheme, segmentedItemClass, SEGMENTED_TRACK } from '@/lib/theme-utils';
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

  const { isFull } = useExperienceMode();
  const { control } = useTierSize();
  const theme = getItemTheme(ITEM_TYPES.PLEATED_SCREEN);

  const previewItem = useMemo<ItemData>(
    () => ({ ...DEFAULT_DATA, ...formData, type: ITEM_TYPES.PLEATED_SCREEN, id: 'preview' }),
    [formData]
  );
  const pricePreview = useMemo(
    () => PricingEngine.calculateDetailedPrice(previewItem),
    [previewItem]
  );
  const analysis = useCostStatus(previewItem);

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


  const summaryPanel = (
    <ItemSummaryCard
      accentClass={theme.bgSoft}
      title="สรุปรายการคำนวณ"
      titleIcon={Tag}
      total={pricePreview.total}
      enableSetPrice={formData.enable_set_price || false}
      onToggleSetPrice={(c) => handleChange('enable_set_price', c)}
      setPriceValue={formData.set_price_override}
      onSetPriceChange={(v) => handleNumberChange('set_price_override', v)}
      status={analysis?.status}
      showStatus={isFull && (analysis?.totalCost ?? 0) > 0}
      proSlot={
        isFull && analysis && analysis.totalCost > 0 ? (
          <CostReadout analysis={analysis} />
        ) : null
      }
    />
  );

  return (
    <form id={PLEATED_SCREEN_FORM_ID} onSubmit={handleSubmit} onBlur={() => onAutoSave?.(formData)}>
      <FormTwoColumn full={isFull} right={summaryPanel}>
      <FormSection icon={Grid3X3} title="ขนาดพื้นที่ (ม.)">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="กว้าง (W)"
            value={formData.width_m}
            onChange={(e) => handleNumberChange('width_m', e.target.value)}
            isDimension
            autoFocus
            size={control}
            className="text-lg font-bold text-sky-600 dark:text-sky-400 bg-sky-500/10"
            error={errors.width_m}
          />
          <Input
            label="สูง (H)"
            value={formData.height_m}
            onChange={(e) => handleNumberChange('height_m', e.target.value)}
            isDimension
            size={control}
            className="text-lg font-bold text-sky-600 dark:text-sky-400 bg-sky-500/10"
            error={errors.height_m}
          />
        </div>
      </FormSection>

      <FormSection icon={Tag} iconClass={theme.icon} title="สเปค / ราคา">
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
      </FormSection>

      {/* Opening Style (installation spec — collapsible escape hatch in Lite) */}
      <AdvancedSection expanded={isFull} hint="รูปแบบการเปิด — ใส่ทีหลังได้">
        <div className="space-y-2">
          <label className="text-[13px] font-medium text-muted-foreground">รูปแบบการเปิด</label>
          <div className={cn(SEGMENTED_TRACK, 'grid grid-cols-2 gap-1')}>
            {Object.values(OPENING_STYLES).map((style) => (
              <button
                key={style}
                type="button"
                onClick={() => handleChange('opening_style', style)}
                className={segmentedItemClass(formData.opening_style === style, theme)}
              >
                {style}
              </button>
            ))}
          </div>
        </div>
      </AdvancedSection>

      <Input
        label="หมายเหตุ"
        value={formData.notes || ''}
        onChange={(e) => handleChange('notes', e.target.value)}
        className="bg-muted/50 border-transparent focus:bg-background"
      />
      </FormTwoColumn>
    </form>
  );
};
