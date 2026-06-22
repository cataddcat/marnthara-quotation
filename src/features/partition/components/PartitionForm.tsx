import React, { useMemo } from 'react';
import { AreaItemInput, ItemData } from '@/types';
import { PricingEngine } from '@/lib/pricing/PricingEngine';
import { useZodForm } from '@/hooks/useZodForm';
import { PartitionSchema, PartitionFormValues } from '../schemas';
import { Input } from '@/components/ui/Input';
import { ComboboxInput } from '@/components/ui/ComboboxInput';
import { Button } from '@/components/ui/Button';
import { Tag, Ruler, Book } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useExperienceMode, useTierSize } from '@/hooks/useExperienceMode';
import { FormTwoColumn } from '@/components/ui/FormTwoColumn';
import { FormSection } from '@/components/ui/FormSection';
import { ItemSummaryCard } from '@/components/ui/ItemSummaryCard';
import { CostReadout } from '@/components/ui/CostReadout';
import { AdvancedSection } from '@/components/ui/AdvancedSection';
import { OpeningStyleSelector } from '@/components/ui/OpeningStyleSelector';
import { useCostStatus } from '@/hooks/useCostStatus';
import { useFormAutoSave } from '@/hooks/useFormAutoSave';
import { getItemTheme } from '@/lib/theme-utils';
import { ITEM_TYPES, FAVORITE_CATEGORIES } from '@/config/enums';

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
  opening_style: '', // ไม่มีค่าตั้งต้น — ผู้ใช้ต้องเลือกเอง (การ์ดจะเตือนถ้ายังไม่เลือก)
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

  // บันทึกอัตโนมัติเมื่อ formData เปลี่ยน (จับค่าหลัง smart-parse + ค่าช่องสุดท้ายครบ)
  useFormAutoSave(formData, onAutoSave);

  const { favorites, openModal } = useAppStore();
  const { isDetail } = useExperienceMode();
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
    <form id={PARTITION_FORM_ID} onSubmit={handleSubmit}>
      <FormTwoColumn full={isDetail} right={summaryPanel}>
      {/* 1. Dimension Section */}
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

      {/* 2. Options Section */}
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
        </div>
      </FormSection>

      {/* รูปแบบการเปิด (installation spec — collapsible escape hatch ในโหมดหน้างาน)
          ใช้ตัวเลือกมาตรฐานร่วมกับผ้าม่าน/ม่านปรับแสง — เก็บค่า canonical ไทย, รองรับค่าเก่า 'side'/'center' */}
      <AdvancedSection expanded={isDetail} hint="รูปแบบการเปิด — ใส่ทีหลังได้">
        <OpeningStyleSelector
          label="รูปแบบการเปิด"
          value={formData.opening_style}
          onChange={(v) => handleChange('opening_style', v)}
        />
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
