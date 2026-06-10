import React, { useMemo } from 'react';
import { AreaItemInput, ItemData } from '@/types';
import { PricingEngine } from '@/lib/pricing/PricingEngine';
import { useZodForm } from '@/hooks/useZodForm';
import { PleatedScreenSchema, PleatedScreenFormValues } from '../schemas';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Tag, Grid3X3, Book } from 'lucide-react';
import { cn } from '@/lib/utils';
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
      title="สรุปรายการคำนวณ"
      titleIcon={Tag}
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

      <FormSection
        icon={Tag}
        iconClass={theme.icon}
        title="สเปค / ราคา"
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
                  initialCategory: FAVORITE_CATEGORIES.PLEATED_SCREEN,
                })
              }
            >
              <Book className="w-3.5 h-3.5" />
              <span className="text-xs">จัดการรายการ</span>
            </Button>
          )
        }
      >
        {/* คนละบรรทัดในโหมดหน้างาน + จอแคบ; แบ่ง 2 คอลัมน์เฉพาะโหมดละเอียดบนจอกว้าง */}
        <div className={cn('grid gap-3 grid-cols-1', isDetail && 'sm:grid-cols-2')}>
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
