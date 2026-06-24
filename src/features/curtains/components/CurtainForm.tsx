// src/features/curtains/components/CurtainForm.tsx
import React, { useEffect, useMemo } from 'react';
import { CurtainItemInput, ItemData } from '@/types';
import { Input } from '@/components/ui/Input';
import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import { AdvancedSection } from '@/components/ui/AdvancedSection';
import { ItemSummaryCard } from '@/components/ui/ItemSummaryCard';
import { useExperienceMode } from '@/hooks/useExperienceMode';
import { useFormAutoSave } from '@/hooks/useFormAutoSave';
import { useCostStatus } from '@/hooks/useCostStatus';
import { PricingEngine } from '@/lib/pricing/PricingEngine';
import { fmtTH } from '@/utils/formatters';
import { ITEM_TYPES, LAYER_MODES } from '@/config/enums';
import { STYLES_WITHOUT_OPENING } from '@/config/constants';
import { MATERIAL_ACCENT } from '@/config/dataTones';
import { Tag } from 'lucide-react';

// Sections
import { DimensionSection } from './sections/DimensionSection';
import { FabricSection } from './sections/FabricSection';
import { StyleSection } from './sections/StyleSection';
import { HardwareSection } from './sections/HardwareSection';
import { CurtainCostAnalysis } from './sections/CurtainCostAnalysis';
import { useCurtainFormLogic } from '../hooks/useCurtainFormLogic';

export const CURTAIN_FORM_ID = 'curtain-edit-form';

interface CurtainFormProps {
  initialData?: Partial<CurtainItemInput>;
  onSubmit: (data: CurtainItemInput) => void;  onAutoSave?: (data: Partial<CurtainItemInput>) => void;
  mode?: 'add' | 'edit';
}

export const CurtainForm: React.FC<CurtainFormProps> = ({
  initialData,
  onSubmit,
  onAutoSave,
  mode = 'add',
}) => {
  const {
    formData,
    errors,
    warnings,
    handleChange,
    handleNumberChange,
    handleSubmit,
    handleMainFabricSelect,
    handleSheerFabricSelect,
  } = useCurtainFormLogic(initialData, onSubmit);

  // บันทึกอัตโนมัติเมื่อ formData เปลี่ยน (จับค่าหลัง smart-parse + ค่าช่องสุดท้ายครบ)
  useFormAutoSave(formData, onAutoSave);

  // Detail = แสดงทุกอย่าง; Field (หน้างาน) = อุปกรณ์ติดตั้งยุบใน AdvancedSection (escape hatch
  // มาตรฐานเดียวกับฟอร์มอื่น — DESIGN.md §8) ส่วนเครื่องมือคลังรหัส/ต้นทุน = งานโหมดละเอียด
  const { isField, isDetail } = useExperienceMode();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const safeHandleChange = handleChange as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const safeHandleNumberChange = handleNumberChange as any;

  // ราคา + breakdown (หลาผ้า) คำนวณที่เดียว — ใช้ทั้ง badge, summary rows และ cost status
  const previewItem = useMemo<ItemData>(
    () => ({ ...formData, type: ITEM_TYPES.CURTAIN, id: 'preview' }) as ItemData,
    [formData]
  );
  const pricePreview = useMemo(
    () => PricingEngine.calculateDetailedPrice(previewItem),
    [previewItem]
  );
  const analysis = useCostStatus(previewItem);

  // Coercion ตามรูปแบบม่าน (ครอบคลุมทั้งตอนเปลี่ยน style และโหลด edit ข้อมูลเก่า)
  // - พับ/แป๊บ: ไม่มีทิศทางการเปิด → เคลียร์ค่าค้าง
  // - แป๊บ (สอดราง): ทำ 2 ชั้นไม่ได้ → ถ้าเคยเลือก ทึบ+โปร่ง บังคับกลับเป็นทึบ
  // เงื่อนไขกันยิงซ้ำ → ไม่ loop
  useEffect(() => {
    if (STYLES_WITHOUT_OPENING.includes(formData.style) && formData.opening_style) {
      handleChange('opening_style', '');
    }
    if (formData.style === 'แป๊บ' && formData.layer_mode === LAYER_MODES.DOUBLE) {
      handleChange('layer_mode', LAYER_MODES.MAIN);
    }
  }, [formData.style, formData.opening_style, formData.layer_mode, handleChange]);

  const notesInput = (
    <Input
      label="หมายเหตุ"
      value={formData.notes || ''}
      onChange={(e) => handleChange('notes', e.target.value)}
      className="bg-muted/50 border-transparent focus:bg-background"
      error={errors.notes}
    />
  );

  const dimensionSection = (
    <DimensionSection data={formData} onChange={safeHandleNumberChange} errors={errors} />
  );

  // รูปแบบม่าน — อยู่ต่อจากขนาดเสมอ (เป็นตัวกำหนดอุปกรณ์/ชั้นผ้า/ทิศเปิด)
  // ทิศเปิดแสดงทุกโหมด: บังคับเลือกก่อนออกเอกสารอยู่แล้ว — คนหน้างานคือคนที่รู้คำตอบ
  const styleSection = (
    <StyleSection data={formData} onChange={safeHandleChange} errors={errors} />
  );

  // กลุ่ม input (ผ้า/อุปกรณ์) — ใช้ร่วมทั้ง Field (ใน collapsible) และ Detail (คอลัมน์ซ้าย)
  // อุปกรณ์ราง = installation spec → AdvancedSection (Detail กางตรง ๆ / Field ยุบแต่กางได้เสมอ)
  const inputSections = (
    <>
      <FabricSection
        data={formData}
        onChange={safeHandleChange}
        onNumberChange={safeHandleNumberChange}
        onMainFabricSelect={handleMainFabricSelect}
        onSheerFabricSelect={handleSheerFabricSelect}
        errors={errors}
        warnings={warnings}
        showCatalogTools={isDetail}
        stack={isField}
      />

      <AdvancedSection expanded={isDetail} hint="ราง · สี · ขายึด — ใส่ทีหลังได้">
        <HardwareSection
          data={formData}
          onChange={safeHandleChange}
          errors={errors}
          warnings={warnings}
        />
      </AdvancedSection>
    </>
  );

  // สรุปราคา — ItemSummaryCard เดียวกับอีก 7 ฟอร์ม (DESIGN.md §8 ⑤); ของเฉพาะม่านอยู่ใน proSlot
  const fabricYards = pricePreview.breakdown?.fabricYards ?? 0;
  const sheerYards = pricePreview.breakdown?.sheerYards ?? 0;
  const priceSummary = (
    <ItemSummaryCard
      title="สรุปรายการคำนวณ"
      titleIcon={Tag}
      rows={[
        ...(fabricYards > 0
          ? [{ label: 'ผ้าทึบ (หลา):', value: fabricYards.toFixed(2), valueClass: MATERIAL_ACCENT.fabric }]
          : []),
        ...(sheerYards > 0
          ? [{ label: 'ผ้าโปร่ง (หลา):', value: sheerYards.toFixed(2), valueClass: MATERIAL_ACCENT.sheer }]
          : []),
      ]}
      total={pricePreview.total}
      enableSetPrice={formData.enable_set_price || false}
      onToggleSetPrice={(c) => safeHandleChange('enable_set_price', c)}
      setPriceValue={formData.set_price_override}
      onSetPriceChange={(v) => safeHandleNumberChange('set_price_override', v)}
      status={analysis?.status}
      showStatus={isDetail && (analysis?.totalCost ?? 0) > 0}
      proSlot={
        isDetail ? <CurtainCostAnalysis formData={formData} onChange={safeHandleChange} /> : null
      }
    />
  );

  return (
    <form
      id={CURTAIN_FORM_ID}
      onSubmit={handleSubmit}
      className="space-y-3"
    >
      {isField ? (
        <>
          {dimensionSection}
          {styleSection}
          <CollapsibleSection
            title="รายละเอียดสินค้า"
            defaultOpen={mode === 'edit'}
            badge={
              <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 eeert:text-emerald-800 tabular-nums mr-1">
                ฿{fmtTH(pricePreview.total)}
              </span>
            }
            hint="ผ้า • ราคา — ใส่ทีหลังได้"
          >
            {inputSections}
            {priceSummary}
            {notesInput}
          </CollapsibleSection>
        </>
      ) : (
        // Detail: 2 คอลัมน์เมื่อจอกว้างพอ (lg) — input ซ้าย / สรุปราคา+ต้นทุน sticky ขวา; จอแคบ = stack
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-5 lg:items-start space-y-4 lg:space-y-0">
          <div className="space-y-4">
            {dimensionSection}
            {styleSection}
            {inputSections}
            {notesInput}
          </div>
          <div className="lg:sticky lg:top-0 space-y-4">{priceSummary}</div>
        </div>
      )}
    </form>
  );
};
