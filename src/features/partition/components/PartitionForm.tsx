import React, { useMemo } from 'react';
import { AreaItemInput, ItemData } from '@/types';
import { PricingEngine } from '@/lib/pricing/PricingEngine';
import { toNum } from '@/utils/formatters';
import { useZodForm } from '@/hooks/useZodForm';
import { PartitionSchema, PartitionFormValues } from '../schemas';
import { Input } from '@/components/ui/Input';
import { ComboboxInput } from '@/components/ui/ComboboxInput';
import { Button } from '@/components/ui/Button';
import { Tag, Grid3X3, SplitSquareHorizontal, ArrowRight, Star, Book } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/useAppStore';
import { useSaveToCatalog } from '@/hooks/useSaveToCatalog';
import { useExperienceMode, useTierSize } from '@/hooks/useExperienceMode';
import { FormTwoColumn } from '@/components/ui/FormTwoColumn';
import { FormSection } from '@/components/ui/FormSection';
import { ItemSummaryCard } from '@/components/ui/ItemSummaryCard';
import { CostReadout } from '@/components/ui/CostReadout';
import { AdvancedSection } from '@/components/ui/AdvancedSection';
import { useCostStatus } from '@/hooks/useCostStatus';
import { getItemTheme, segmentedItemClass, SEGMENTED_TRACK } from '@/lib/theme-utils';
import { ITEM_TYPES, FAVORITE_CATEGORIES, OPENING_STYLES } from '@/config/enums';

export const PARTITION_FORM_ID = 'partition-edit-form';

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
  onAutoSave,
}) => {
  const { formData, errors, warnings, handleChange, handleNumberChange, handleSubmit } = useZodForm<PartitionFormValues>({
    schema: PartitionSchema,
    initialData: { ...DEFAULT_DATA, ...initialData } as PartitionFormValues,
    onSubmit: (data) => onSubmit(data as unknown as AreaItemInput),
  });

  const { favorites, openModal } = useAppStore();
  const { saveToCatalog, isInCatalog } = useSaveToCatalog();
  const { isFull } = useExperienceMode();
  const { control } = useTierSize();
  const theme = getItemTheme(ITEM_TYPES.PARTITION);

  const previewItem = useMemo<ItemData>(
    () => ({ ...DEFAULT_DATA, ...formData, type: ITEM_TYPES.PARTITION, id: 'preview' }),
    [formData]
  );
  const pricePreview = useMemo(
    () => PricingEngine.calculateDetailedPrice(previewItem),
    [previewItem]
  );
  const analysis = useCostStatus(previewItem);

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

  const summaryPanel = (
    <ItemSummaryCard
      accentClass={theme.bgSoft}
      title="สรุปรายการคำนวณ"
      titleIcon={Tag}
      rows={[
        {
          label: 'พื้นที่ (ตร.ล.):',
          value: pricePreview.breakdown?.areaSqyd?.toFixed(2) || '0.00',
          valueClass: theme.text,
        },
      ]}
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
    <form id={PARTITION_FORM_ID} onSubmit={handleSubmit} onBlur={() => onAutoSave?.(formData)}>
      <FormTwoColumn full={isFull} right={summaryPanel}>
      {/* 1. Dimension Section */}
      <FormSection icon={Grid3X3} title="ขนาดพื้นที่ (ม.)">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="กว้าง (W)"
            placeholder="0.00"
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
            placeholder="0.00"
            value={formData.height_m}
            onChange={(e) => handleNumberChange('height_m', e.target.value)}
            isDimension
            size={control}
            className="text-lg font-bold text-sky-600 dark:text-sky-400 bg-sky-500/10"
            error={errors.height_m}
          />
        </div>
      </FormSection>

      {/* 2. Options Section */}
      <FormSection
        icon={Tag}
        iconClass={theme.icon}
        title="รุ่น/สเปค"
        headerRight={
          isFull && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 gap-1 text-muted-foreground hover:text-foreground"
              onClick={() =>
                openModal('materialSummary', { initialTab: 'catalog', initialCategory: FAVORITE_CATEGORIES.PARTITION })
              }
            >
              <Book className="w-3.5 h-3.5" />
              <span className="text-xs">จัดการรายการ</span>
            </Button>
          )
        }
      >
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
          {isFull && formData.code && toNum(formData.price_sqyd) > 0 && (
            <button
              type="button"
              onClick={() =>
                saveToCatalog(
                  FAVORITE_CATEGORIES.PARTITION,
                  formData.code,
                  formData.price_sqyd
                )
              }
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 z-10 hover:scale-110 transition-transform"
            >
              <Star
                className={cn(
                  'w-5 h-5',
                  isInCatalog(FAVORITE_CATEGORIES.PARTITION, formData.code)
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-muted-foreground'
                )}
              />
            </button>
          )}
        </div>
      </FormSection>

      {/* รูปแบบการเปิด (installation spec — collapsible escape hatch in Lite) */}
      <AdvancedSection expanded={isFull} hint="รูปแบบการเปิด — ใส่ทีหลังได้">
        <div className="space-y-2">
          <label className="text-[13px] font-medium text-muted-foreground">รูปแบบการเปิด</label>
          <div className={cn(SEGMENTED_TRACK, 'flex gap-1')}>
            {[
              { l: 'เก็บข้างเดียว', v: OPENING_STYLES.SIDE, i: ArrowRight },
              { l: 'แยกกลาง', v: OPENING_STYLES.CENTER, i: SplitSquareHorizontal },
            ].map((opt) => (
              <button
                key={opt.v}
                type="button"
                onClick={() => handleChange('opening_style', opt.v)}
                className={cn('flex-1', segmentedItemClass(formData.opening_style === opt.v, theme))}
              >
                <opt.i className="w-4 h-4" />
                {opt.l}
              </button>
            ))}
          </div>
        </div>
      </AdvancedSection>

      {/* 4. Notes & Actions */}
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
