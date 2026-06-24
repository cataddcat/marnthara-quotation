import React, { useMemo } from 'react';
import { AreaItemInput, ItemData } from '@/types';
import { PricingEngine } from '@/lib/pricing/PricingEngine';
import { useZodForm } from '@/hooks/useZodForm';
import { RollerBlindsSchema, RollerBlindsFormValues } from '../schemas';
import { Input } from '@/components/ui/Input';
import { ComboboxInput } from '@/components/ui/ComboboxInput';
import { Button } from '@/components/ui/Button';
import { Tag, ArrowLeftToLine, ArrowRightToLine, Ruler, Book } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/useAppStore';
import { useExperienceMode, useTierSize } from '@/hooks/useExperienceMode';
import { FormTwoColumn } from '@/components/ui/FormTwoColumn';
import { FormSection } from '@/components/ui/FormSection';
import { ItemSummaryCard } from '@/components/ui/ItemSummaryCard';
import { CostReadout } from '@/components/ui/CostReadout';
import { AdvancedSection } from '@/components/ui/AdvancedSection';
import { useCostStatus } from '@/hooks/useCostStatus';
import { useCodeSuggestions } from '@/hooks/useCodeSuggestions';
import { useFormAutoSave } from '@/hooks/useFormAutoSave';
import { getItemTheme, segmentedItemClass, SEGMENTED_TRACK } from '@/lib/theme-utils';
import { ITEM_TYPES, FAVORITE_CATEGORIES } from '@/config/enums';

export const ROLLER_BLINDS_FORM_ID = 'roller-blinds-edit-form';

interface RollerBlindsFormProps {
  initialData?: Partial<AreaItemInput> & { type?: string; id?: string };
  onSubmit: (data: AreaItemInput) => void;
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

  // บันทึกอัตโนมัติเมื่อ formData เปลี่ยน (จับค่าหลัง smart-parse + ค่าช่องสุดท้ายครบ)
  useFormAutoSave(formData, onAutoSave);

  const { openModal } = useAppStore();
  const { isDetail } = useExperienceMode();
  const { control } = useTierSize();
  const theme = getItemTheme(ITEM_TYPES.ROLLER_BLIND);

  // Pricing Logic
  const previewItem = useMemo<ItemData>(
    () => ({ ...DEFAULT_DATA, ...formData, type: ITEM_TYPES.ROLLER_BLIND, id: 'preview' }),
    [formData]
  );
  const pricePreview = useMemo(
    () => PricingEngine.calculateDetailedPrice(previewItem),
    [previewItem]
  );
  const analysis = useCostStatus(previewItem);

  // ตัวเลือกรหัส = แค็ตตาล็อก + ฉบับร่างในเครื่อง + รหัสที่ใช้ในงานนี้
  const suggestions = useCodeSuggestions(FAVORITE_CATEGORIES.ROLLER_BLIND);

  const handleCodeChange = (val: string) => {
    handleChange('code', val);
    const match = suggestions.find((s) => s.value.toLowerCase() === val.toLowerCase());
    if (match && match.data?.default_price_per_m) {
      handleNumberChange('price_sqyd', String(match.data.default_price_per_m));
    }
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
    <form id={ROLLER_BLINDS_FORM_ID} onSubmit={handleSubmit}>
      <FormTwoColumn full={isDetail} right={summaryPanel}>
      {/* 1. Dimensions */}
      <FormSection icon={Ruler} title="ขนาดพื้นที่ (ม.)">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="กว้าง (W)"
            placeholder="0.00"
            value={formData.width_m}
            onChange={(e) => handleNumberChange('width_m', e.target.value)}
            isDimension
            autoFocus
            size={control}            error={errors.width_m}
          />
          <Input
            label="สูง (H)"
            placeholder="0.00"
            value={formData.height_m}
            onChange={(e) => handleNumberChange('height_m', e.target.value)}
            isDimension
            size={control}            error={errors.height_m}
          />
        </div>
      </FormSection>

      {/* 2. Details */}
      <FormSection
        icon={Tag}
        iconClass={theme.icon}
        title="รหัส & ราคา"
        headerRight={
          isDetail && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 gap-1 text-muted-foreground hover:text-foreground"
              onClick={() =>
                openModal('materialSummary', { initialTab: 'catalog', initialCategory: FAVORITE_CATEGORIES.ROLLER_BLIND })
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
        </div>

        {/* Option: Fabric Variant */}
        <div className="space-y-2 pt-2 border-t border-border">
          <label className="text-[13px] font-medium text-muted-foreground">ประเภทใบ</label>
          <div className={cn(SEGMENTED_TRACK, 'grid grid-cols-3 gap-1')}>
            {['Blackout', 'Sunscreen', 'Dimout'].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => handleChange('fabric_variant', v)}
                className={segmentedItemClass(formData.fabric_variant === v, theme)}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </FormSection>

      {/* Controls: Pull Side (installation spec — collapsible escape hatch ในโหมดหน้างาน) */}
      <AdvancedSection expanded={isDetail} hint="ฝั่งดึง — ใส่ทีหลังได้">
        <div className="space-y-2">
          <label className="text-[13px] font-medium text-muted-foreground">ฝั่งดึง</label>
          <div className={cn(SEGMENTED_TRACK, 'grid grid-cols-2 gap-1')}>
            {['ซ้าย', 'ขวา'].map((side) => (
              <button
                key={side}
                type="button"
                onClick={() => handleChange('adjustment_side', side)}
                className={segmentedItemClass(formData.adjustment_side === side, theme)}
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
      </AdvancedSection>

      {/* Actions */}
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
