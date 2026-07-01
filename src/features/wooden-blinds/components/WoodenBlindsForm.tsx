import React, { useMemo } from 'react';
import { AreaItemInput, ItemData } from '@/types';
import { PricingEngine } from '@/lib/pricing/PricingEngine';
import { useZodForm } from '@/hooks/useZodForm';
import { WoodenBlindsSchema, AluminumBlindsSchema, WoodenBlindsFormValues } from '../schemas';
import { Input } from '@/components/ui/Input';
import { CodePickerField } from '@/components/ui/CodePickerField';
import { Button } from '@/components/ui/Button';
import { Tag, ArrowLeftToLine, ArrowRightToLine, Ruler, Book, Check, Cable, Link } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/useAppStore';
import { useExperienceMode, useTierSize } from '@/hooks/useExperienceMode';
import { useThemeStore } from '@/store/standalone/useThemeStore';
import { FormTwoColumn } from '@/components/ui/FormTwoColumn';
import { FormSection } from '@/components/ui/FormSection';
import { ItemSummaryCard } from '@/components/ui/ItemSummaryCard';
import { CostReadout } from '@/components/ui/CostReadout';
import { AdvancedSection } from '@/components/ui/AdvancedSection';
import { useCostStatus } from '@/hooks/useCostStatus';
import { useCodeSuggestions } from '@/hooks/useCodeSuggestions';
import { useFormAutoSave } from '@/hooks/useFormAutoSave';
import { getItemTheme, segmentedItemClass, SEGMENTED_TRACK, radioTileClass } from '@/lib/theme-utils';
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
  // EEERT minimal: ลบหัวข้อ section + ย้ายป้าย กว้าง/สูง เข้าใน field (prefix); ธีมอื่นคงเดิม
  const isEeert = useThemeStore((s) => s.theme === 'eeert');
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

  // ตัวเลือกรหัส = แค็ตตาล็อก + ฉบับร่างในเครื่อง + รหัสที่ใช้ในงานนี้
  const suggestions = useCodeSuggestions(favCategory);

  const handleCodeChange = (val: string) => {
    handleChange('code', val);
    const match = suggestions.find((s) => s.value.toLowerCase() === val.toLowerCase());
    if (match && match.data?.default_price_per_m) {
      handleNumberChange('price_sqyd', String(match.data.default_price_per_m));
    }
  };

  // EEERT radio-tiles — ไทล์ขอบรายตัว เข้าชุดผ้าม่าน (OpeningStyleSelector); active = ✓ badge มุมขวาบน
  const renderTileGroup = (
    label: string,
    options: { value: string; icon: React.ElementType }[],
    selected: string | undefined,
    onPick: (v: string) => void,
    className?: string
  ) => (
    <div className={cn('space-y-2 pt-2', className)}>
      <label className="text-sm font-medium text-muted-foreground ml-1">{label}</label>
      <div className="grid grid-cols-2 gap-2">
        {options.map(({ value, icon: Icon }) => {
          const active = selected === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => onPick(value)}
              className={radioTileClass(active)}
            >
              <Icon
                className={cn(
                  'w-7 h-7 mb-1',
                  active ? 'text-foreground animate-bounce-short' : 'text-muted-foreground/70'
                )}
                strokeWidth={1.5}
              />
              <span className="text-sm font-medium">{value}</span>
              {active && (
                <div className="absolute top-1 right-1 bg-foreground text-background rounded-full p-0.5">
                  <Check className="w-2 h-2" strokeWidth={1.5} />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

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
      <FormSection
        icon={isEeert ? undefined : Ruler}
        title={isEeert ? undefined : 'ขนาดพื้นที่ (ม.)'}
      >
        <div className="grid grid-cols-2 gap-4">
          {/* [FIX] Use Standard Input instead of Combobox to prevent random suggestions */}
          <Input
            label={isEeert ? undefined : 'กว้าง (W)'}
            prefix={isEeert ? 'W' : undefined}
            aria-label={isEeert ? 'กว้าง (W)' : undefined}
            placeholder="0.00"
            value={formData.width_m}
            onChange={(e) => handleNumberChange('width_m', e.target.value)}
            isDimension
            autoFocus
            size={control}            error={errors.width_m}
          />
          <Input
            label={isEeert ? undefined : 'สูง (H)'}
            prefix={isEeert ? 'H' : undefined}
            aria-label={isEeert ? 'สูง (H)' : undefined}
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
        icon={isEeert ? undefined : Tag}
        iconClass={theme.icon}
        title={isEeert ? undefined : 'รหัส & ราคา'}
        headerRight={
          isDetail &&
          (isEeert ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              aria-label="จัดการรายการ"
              onClick={() =>
                openModal('materialSummary', {
                  initialTab: 'catalog',
                  initialCategory: favCategory,
                })
              }
            >
              <Book className="w-4 h-4" />
            </Button>
          ) : (
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
          ))
        }
      >
        {/* Code & Price — คนละบรรทัดในโหมดหน้างาน + จอแคบ; แบ่ง 2 คอลัมน์เฉพาะโหมดละเอียดบนจอกว้าง */}
        <div className={cn('grid gap-3 grid-cols-1', isDetail && 'sm:grid-cols-2')}>
          {/* ช่องนี้ = รหัสสินค้าเท่านั้น (รุ่นเชือก/โซ่ มีตัวเลือก "รุ่น" แยกด้านล่าง; สีอยู่ในรหัส) */}
          <CodePickerField
            label="รหัสสินค้า"
            category={favCategory}
            options={suggestions}
            value={formData.code || ''}
            onChange={handleCodeChange}
            placeholder="เช่น BW-01"
          />

          {/* [FIX] Use Standard Input for Price to stop suggesting dimensions */}
          <Input
            label="ราคาขาย (บาท/ตร.ล.)"
            value={formData.price_sqyd || ''}
            onChange={(e) => handleNumberChange('price_sqyd', e.target.value)}
            isMoney
            inputMode="decimal"
            placeholder="0.00"
          />
        </div>

        {/* ตัวเลือก ตำแหน่งดึง + รุ่น — EEERT: radio-tiles รวมในกรอบเดียว (ไม่มี collapsible, เข้าชุดผ้าม่าน);
            ธีมอื่น: "รุ่น" segmented ในกรอบ + "ตำแหน่งดึง" อยู่ใน AdvancedSection ด้านล่าง (escape hatch หน้างาน) */}
        {isEeert ? (
          <>
            {renderTileGroup(
              'ตำแหน่งดึง',
              [
                { value: 'ซ้าย', icon: ArrowLeftToLine },
                { value: 'ขวา', icon: ArrowRightToLine },
              ],
              formData.adjustment_side,
              (v) => handleChange('adjustment_side', v),
              'border-t border-border'
            )}
            {renderTileGroup(
              'รุ่น',
              [
                { value: 'รุ่นเชือก', icon: Cable },
                { value: 'รุ่นโซ่', icon: Link },
              ],
              formData.fabric_variant,
              (v) => handleChange('fabric_variant', v)
            )}
          </>
        ) : (
          /* Option: รุ่นเชือก/โซ่ — variant ท้าย section คั่น border-t (แบบแผน DESIGN.md §8) */
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
        )}
      </FormSection>

      {/* Control Side (installation spec — collapsible escape hatch ในโหมดหน้างาน)
          EEERT: ย้ายขึ้นไปเป็น radio-tiles ในกรอบบนแล้ว → ไม่ render ตรงนี้ */}
      {!isEeert && (
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
      )}

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
