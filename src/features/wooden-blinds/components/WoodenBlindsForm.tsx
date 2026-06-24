import React, { useMemo } from 'react';
import { AreaItemInput, ItemData } from '@/types';
import { PricingEngine } from '@/lib/pricing/PricingEngine';
import { useZodForm } from '@/hooks/useZodForm';
import { WoodenBlindsSchema, AluminumBlindsSchema, WoodenBlindsFormValues } from '../schemas';
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
import { useInventory } from '@/hooks/useInventory';
import { useFormAutoSave } from '@/hooks/useFormAutoSave';
import { getItemTheme, segmentedItemClass, SEGMENTED_TRACK } from '@/lib/theme-utils';
import { FAVORITE_CATEGORIES, ITEM_TYPES } from '@/config/enums';

export const WOODEN_BLINDS_FORM_ID = 'wooden-blinds-edit-form';

interface WoodenBlindsFormProps {
  // รับ Partial<AreaItemInput> ที่กว้างกว่า — รองรับ caller (ItemModal) ที่ส่ง Partial<ItemData>
  initialData?: Partial<AreaItemInput> & { type?: string; id?: string };
  onSubmit: (data: AreaItemInput) => void;  itemType?: string;
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
  itemType = ITEM_TYPES.WOODEN_BLIND,
  onAutoSave,
}) => {
  // มู่ลี่อลูมิเนียม reuse ฟอร์มนี้ → เลือก schema ให้ literal `type` ตรงกับ item จริง
  // (cast เพราะ 2 schema โครงสร้างเหมือนกัน ต่างแค่ literal type — รัน safeParse ถูกต้องตามจริง)
  const schema = (
    itemType === ITEM_TYPES.ALUMINUM_BLIND ? AluminumBlindsSchema : WoodenBlindsSchema
  ) as unknown as typeof WoodenBlindsSchema;

  const { formData, errors, handleChange, handleNumberChange, handleSubmit } = useZodForm<WoodenBlindsFormValues>({
    schema,
    initialData: { ...DEFAULT_DATA, ...initialData, type: itemType } as WoodenBlindsFormValues,
    onSubmit: (data) => onSubmit(data as unknown as AreaItemInput),
  });

  // บันทึกอัตโนมัติเมื่อ formData เปลี่ยน (จับค่าหลัง smart-parse + ค่าช่องสุดท้ายครบ)
  useFormAutoSave(formData as unknown as AreaItemInput, onAutoSave);

  const { openModal } = useAppStore();
  const { isDetail } = useExperienceMode();
  const { control } = useTierSize();
  const theme = getItemTheme(itemType);

  // Determine Favorite Category based on itemType
  const favCategory =
    itemType === ITEM_TYPES.ROLLER_BLIND
      ? FAVORITE_CATEGORIES.ROLLER_BLIND
      : itemType === ITEM_TYPES.ALUMINUM_BLIND
        ? FAVORITE_CATEGORIES.ALUMINUM_BLIND
        : FAVORITE_CATEGORIES.WOODEN_BLIND;

  // Pricing Logic
  const previewItem = useMemo(
    () =>
      ({ ...DEFAULT_DATA, ...formData, type: itemType, id: 'preview' } as unknown as ItemData),
    [formData, itemType]
  );
  const pricePreview = useMemo(
    () => PricingEngine.calculateDetailedPrice(previewItem),
    [previewItem]
  );
  const analysis = useCostStatus(previewItem);

  // ตัวเลือกรหัส/ราคา — catalog-aware (SKU จาก DB เมื่อเชื่อม, ไม่งั้น fallback favorites)
  const { items: inventory } = useInventory(favCategory);
  const suggestions = useMemo(
    () =>
      inventory.map((f) => ({
        label: f.code,
        value: f.code,
        desc: `${f.default_price_per_m}`,
        data: f,
      })),
    [inventory]
  );

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
    <form id={WOODEN_BLINDS_FORM_ID} onSubmit={handleSubmit}>
      <FormTwoColumn full={isDetail} right={summaryPanel}>
      {/* 1. Dimensions */}
      <FormSection icon={Ruler} title="ขนาดพื้นที่ (ม.)">
        <div className="grid grid-cols-2 gap-4">
          {/* [FIX] Use Standard Input instead of Combobox to prevent random suggestions */}
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

      {/* 2. Options */}
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
                openModal('materialSummary', {
                  initialTab: 'catalog',
                  initialCategory: favCategory,
                })
              }
            >
              <Book className="w-3.5 h-3.5" />
              <span className="text-xs">จัดการรายการ</span>
            </Button>
          )
        }
      >
        {/* Code & Price — คนละบรรทัดในโหมดหน้างาน + จอแคบ; แบ่ง 2 คอลัมน์เฉพาะโหมดละเอียดบนจอกว้าง */}
        <div className={cn('grid gap-3 grid-cols-1', isDetail && 'sm:grid-cols-2')}>
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

        {/* Option: รุ่นเชือก/โซ่ — variant ท้าย section คั่น border-t (แบบแผน DESIGN.md §8) */}
        <div className="space-y-2 pt-2 border-t border-border">
          <label className="text-[13px] font-medium text-muted-foreground">รุ่น</label>
          <div className={cn(SEGMENTED_TRACK, 'grid grid-cols-2 gap-1')}>
            {['รุ่นเชือก', 'รุ่นโซ่'].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => handleChange('fabric_variant', type)} // Using fabric_variant to store tape type/model
                className={segmentedItemClass(formData.fabric_variant === type, theme)}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </FormSection>

      {/* Control Side (installation spec — collapsible escape hatch ในโหมดหน้างาน) */}
      <AdvancedSection expanded={isDetail} hint="ตำแหน่งดึง — ใส่ทีหลังได้">
        <div className="space-y-2">
          <label className="text-[13px] font-medium text-muted-foreground">ตำแหน่งดึง (Side)</label>
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

      {/* 4. Actions */}
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
