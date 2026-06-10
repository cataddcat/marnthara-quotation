import React, { useMemo } from 'react';
import { AreaItemInput, ItemData } from '@/types';
import { PricingEngine } from '@/lib/pricing/PricingEngine';
import { toNum } from '@/utils/formatters';
import { useZodForm } from '@/hooks/useZodForm';
import { VerticalBlindsSchema, VerticalBlindsFormValues } from '../schemas';
import { Input } from '@/components/ui/Input';
import { ComboboxInput } from '@/components/ui/ComboboxInput';
import { Button } from '@/components/ui/Button';
import { Tag, Columns, Star, Book, ArrowLeftToLine, ArrowRightToLine } from 'lucide-react';
import { OpeningStyleSelector } from '@/components/ui/OpeningStyleSelector';
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
import { useFormAutoSave } from '@/hooks/useFormAutoSave';
import { getItemTheme, segmentedItemClass, SEGMENTED_TRACK } from '@/lib/theme-utils';
import { ITEM_TYPES, FAVORITE_CATEGORIES } from '@/config/enums';

export const VERTICAL_BLINDS_FORM_ID = 'vertical-blinds-edit-form';

interface VerticalBlindsFormProps {
  initialData?: Partial<AreaItemInput> & { type?: string; id?: string };
  onSubmit: (data: AreaItemInput) => void;
  onCancel: () => void;
  onAutoSave?: (data: Partial<AreaItemInput>) => void;
}

const DEFAULT_DATA: VerticalBlindsFormValues = {
  type: ITEM_TYPES.VERTICAL_BLIND,
  width_m: '',
  height_m: '',
  price_sqyd: '',
  code: '',
  notes: '',
  fabric_variant: 'Dimout',
  adjustment_side: 'ขวา',
  opening_style: '', // ไม่มีค่าตั้งต้น — ผู้ใช้ต้องเลือกเอง (การ์ดจะเตือนถ้ายังไม่เลือก)
  is_suspended: false,
  enable_set_price: false,
  set_price_override: 0,
};

export const VerticalBlindsForm: React.FC<VerticalBlindsFormProps> = ({
  initialData,
  onSubmit,
  onAutoSave,
}) => {
  const { formData, errors, warnings, handleChange, handleNumberChange, handleSubmit } = useZodForm<VerticalBlindsFormValues>({
    schema: VerticalBlindsSchema,
    initialData: { ...DEFAULT_DATA, ...initialData } as VerticalBlindsFormValues,
    onSubmit: (data) => onSubmit(data as unknown as AreaItemInput),
  });

  // บันทึกอัตโนมัติเมื่อ formData เปลี่ยน (จับค่าหลัง smart-parse + ค่าช่องสุดท้ายครบ)
  useFormAutoSave(formData, onAutoSave);

  const { favorites, openModal } = useAppStore();
  const { saveToCatalog, isInCatalog } = useSaveToCatalog();
  const { isDetail } = useExperienceMode();
  const { control } = useTierSize();
  const theme = getItemTheme(ITEM_TYPES.VERTICAL_BLIND);

  const previewItem = useMemo<ItemData>(
    () => ({ ...DEFAULT_DATA, ...formData, type: ITEM_TYPES.VERTICAL_BLIND, id: 'preview' }),
    [formData]
  );
  const pricePreview = useMemo(
    () => PricingEngine.calculateDetailedPrice(previewItem),
    [previewItem]
  );
  const analysis = useCostStatus(previewItem);

  const suggestions = useMemo(
    () =>
      (favorites[FAVORITE_CATEGORIES.VERTICAL_BLIND] || []).map((f) => ({
        label: f.code,
        value: f.code,
        desc: `${f.default_price_per_m}`,
        data: f,
      })),
    [favorites]
  );

  // Reuse logic for favorites handling...
  const handleCodeChange = (val: string) => {
    handleChange('code', val);
    const match = suggestions.find((s) => s.value.toLowerCase() === val.toLowerCase());
    if (match && match.data?.default_price_per_m)
      handleNumberChange('price_sqyd', String(match.data.default_price_per_m));
  };

  const summaryPanel = (
    <ItemSummaryCard
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
      showStatus={isDetail && (analysis?.totalCost ?? 0) > 0}
      proSlot={
        isDetail && analysis && analysis.totalCost > 0 ? (
          <CostReadout analysis={analysis} />
        ) : null
      }
    />
  );

  return (
    <form id={VERTICAL_BLINDS_FORM_ID} onSubmit={handleSubmit}>
      <FormTwoColumn full={isDetail} right={summaryPanel}>
      <FormSection icon={Columns} title="ขนาดพื้นที่ (ม.)">
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

      <FormSection
        icon={Tag}
        iconClass={theme.icon}
        title="รหัส/รุ่น"
        headerRight={
          isDetail && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 gap-1 text-muted-foreground hover:text-foreground"
              onClick={() =>
                openModal('materialSummary', { initialTab: 'catalog', initialCategory: FAVORITE_CATEGORIES.VERTICAL_BLIND })
              }
            >
              <Book className="w-3.5 h-3.5" />
              <span className="text-xs">จัดการรายการ</span>
            </Button>
          )
        }
      >
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
          {isDetail && formData.code && toNum(formData.price_sqyd) > 0 && (
            <button
              type="button"
              onClick={() =>
                saveToCatalog(
                  FAVORITE_CATEGORIES.VERTICAL_BLIND,
                  formData.code,
                  formData.price_sqyd
                )
              }
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 z-10 hover:scale-110 transition-transform"
            >
              <Star
                className={cn(
                  'w-5 h-5',
                  isInCatalog(FAVORITE_CATEGORIES.VERTICAL_BLIND, formData.code)
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-muted-foreground'
                )}
              />
            </button>
          )}
        </div>
      </FormSection>

      {/* ทิศเก็บใบ/ฝั่งดึง (installation spec — collapsible escape hatch ในโหมดหน้างาน) */}
      <AdvancedSection expanded={isDetail} hint="ทิศเก็บใบ · ฝั่งดึง — ใส่ทีหลังได้">
        <div className="space-y-3">
          {/* เก็บใบ — ตัวเลือกทิศทางการเปิดมาตรฐาน (ยังไม่เลือก/แยกกลาง/เก็บข้างเดียว) */}
          <OpeningStyleSelector
            label="เก็บใบ"
            value={formData.opening_style}
            onChange={(v) => handleChange('opening_style', v)}
          />
          <div className="space-y-2">
            <label className="text-[13px] font-medium text-muted-foreground">ฝั่งดึง</label>
            <div className={cn(SEGMENTED_TRACK, 'grid grid-cols-2 gap-1')}>
              <button
                type="button"
                onClick={() => handleChange('adjustment_side', 'ขวา')}
                className={segmentedItemClass(formData.adjustment_side === 'ขวา', theme)}
              >
                <ArrowRightToLine className="w-3.5 h-3.5" />
                ขวา
              </button>
              <button
                type="button"
                onClick={() => handleChange('adjustment_side', 'ซ้าย')}
                className={segmentedItemClass(formData.adjustment_side === 'ซ้าย', theme)}
              >
                <ArrowLeftToLine className="w-3.5 h-3.5" />
                ซ้าย
              </button>
            </div>
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
