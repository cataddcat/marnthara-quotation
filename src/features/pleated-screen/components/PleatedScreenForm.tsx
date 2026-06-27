import React, { useMemo } from 'react';
import { AreaItemInput, ItemData } from '@/types';
import { PricingEngine } from '@/lib/pricing/PricingEngine';
import { useZodForm } from '@/hooks/useZodForm';
import { PleatedScreenSchema, PleatedScreenFormValues } from '../schemas';
import { Input } from '@/components/ui/Input';
import { ComboboxInput } from '@/components/ui/ComboboxInput';
import { Button } from '@/components/ui/Button';
import { Tag, Ruler, Book } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/useAppStore';
import { useExperienceMode, useTierSize } from '@/hooks/useExperienceMode';
import { useThemeStore } from '@/store/standalone/useThemeStore';
import { FormTwoColumn } from '@/components/ui/FormTwoColumn';
import { FormSection } from '@/components/ui/FormSection';
import { ItemSummaryCard } from '@/components/ui/ItemSummaryCard';
import { CostReadout } from '@/components/ui/CostReadout';
import { AdvancedSection } from '@/components/ui/AdvancedSection';
import { OpeningStyleSelector } from '@/components/ui/OpeningStyleSelector';
import { useCostStatus } from '@/hooks/useCostStatus';
import { useCodeSuggestions } from '@/hooks/useCodeSuggestions';
import { useFormAutoSave } from '@/hooks/useFormAutoSave';
import { getItemTheme } from '@/lib/theme-utils';
import { ITEM_TYPES, FAVORITE_CATEGORIES } from '@/config/enums';

export const PLEATED_SCREEN_FORM_ID = 'pleated-screen-edit-form';

interface PleatedScreenFormProps {
  initialData?: Partial<AreaItemInput> & { type?: string; id?: string };
  onSubmit: (data: AreaItemInput) => void;
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
  opening_style: '', // ไม่มีค่าตั้งต้น — ผู้ใช้ต้องเลือกเอง (การ์ดจะเตือนถ้ายังไม่เลือก)
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

  // บันทึกอัตโนมัติเมื่อ formData เปลี่ยน (จับค่าหลัง smart-parse + ค่าช่องสุดท้ายครบ)
  useFormAutoSave(formData, onAutoSave);

  const { openModal } = useAppStore();
  const { isDetail } = useExperienceMode();
  const { control } = useTierSize();
  // EEERT minimal: ลบหัวข้อ section + ย้ายป้าย กว้าง/สูง เข้าใน field (prefix); ธีมอื่นคงเดิม
  const isEeert = useThemeStore((s) => s.theme === 'eeert');
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

  // ตัวเลือกรหัส/สีเฟรม = แค็ตตาล็อก + ฉบับร่างในเครื่อง + รหัสที่ใช้ในงานนี้ (auto-fill ราคาเมื่อเลือก)
  const suggestions = useCodeSuggestions(FAVORITE_CATEGORIES.PLEATED_SCREEN);

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
          // มุ้งจีบคิดราคา/ตร.ม. (vault.isSqmPriced) — โชว์หน่วยเดียวกับที่คิดเงิน
          label: 'พื้นที่ (ตร.ม.):',
          value: pricePreview.breakdown?.areaSqm?.toFixed(2) || '0.00',
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
    <form id={PLEATED_SCREEN_FORM_ID} onSubmit={handleSubmit}>
      <FormTwoColumn full={isDetail} right={summaryPanel}>
      <FormSection
        icon={isEeert ? undefined : Ruler}
        title={isEeert ? undefined : 'ขนาดพื้นที่ (ม.)'}
      >
        <div className="grid grid-cols-2 gap-4">
          <Input
            label={isEeert ? undefined : 'กว้าง (W)'}
            prefix={isEeert ? 'W' : undefined}
            aria-label={isEeert ? 'กว้าง (W)' : undefined}
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
            value={formData.height_m}
            onChange={(e) => handleNumberChange('height_m', e.target.value)}
            isDimension
            size={control}            error={errors.height_m}
          />
        </div>
      </FormSection>

      <FormSection
        icon={isEeert ? undefined : Tag}
        iconClass={theme.icon}
        title={isEeert ? undefined : 'สเปค & ราคา'}
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
                  initialCategory: FAVORITE_CATEGORIES.PLEATED_SCREEN,
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
                  initialCategory: FAVORITE_CATEGORIES.PLEATED_SCREEN,
                })
              }
            >
              <Book className="w-3.5 h-3.5" />
              <span className="text-xs">จัดการรายการ</span>
            </Button>
          ))
        }
      >
        {/* คนละบรรทัดในโหมดหน้างาน + จอแคบ; แบ่ง 2 คอลัมน์เฉพาะโหมดละเอียดบนจอกว้าง */}
        <div className={cn('grid gap-3 grid-cols-1', isDetail && 'sm:grid-cols-2')}>
          <ComboboxInput
            label="สีเฟรม"
            value={formData.code || ''}
            onChange={handleCodeChange}
            options={suggestions}
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

      {/* Opening Style (installation spec — collapsible escape hatch ในโหมดหน้างาน)
          ใช้ตัวเลือกมาตรฐานร่วมกับผ้าม่าน/ม่านปรับแสง — ปุ่มเดิมโชว์ค่า enum ดิบ 'center'/'side' เป็นป้าย */}
      <AdvancedSection expanded={isDetail} hint="รูปแบบการเปิด — ใส่ทีหลังได้">
        <OpeningStyleSelector
          label="รูปแบบการเปิด"
          value={formData.opening_style}
          onChange={(v) => handleChange('opening_style', v)}
        />
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
