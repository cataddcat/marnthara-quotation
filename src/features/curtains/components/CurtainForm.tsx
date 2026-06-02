// src/features/curtains/components/CurtainForm.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { CurtainItemInput, ItemData } from '@/types';
import { Input } from '@/components/ui/Input';
import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import { useExperienceMode } from '@/hooks/useExperienceMode';
import { PricingEngine } from '@/lib/pricing/PricingEngine';
import { fmtTH } from '@/utils/formatters';
import { ITEM_TYPES, LAYER_MODES } from '@/config/enums';
import { STYLES_WITHOUT_OPENING } from '@/config/constants';
import { cn } from '@/lib/utils';
import { SlidersHorizontal } from 'lucide-react';

// Sections
import { DimensionSection } from './sections/DimensionSection';
import { FabricSection } from './sections/FabricSection';
import { StyleSection } from './sections/StyleSection';
import { HardwareSection } from './sections/HardwareSection';
import { PriceSummary } from './sections/PriceSummary';
import { useCurtainFormLogic } from '../hooks/useCurtainFormLogic';

export const CURTAIN_FORM_ID = 'curtain-edit-form';

interface CurtainFormProps {
  initialData?: Partial<CurtainItemInput>;
  onSubmit: (data: CurtainItemInput) => void;
  onCancel: () => void;
  onAutoSave?: (data: Partial<CurtainItemInput>) => void;
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

  const { isLite } = useExperienceMode();
  const [showAdvancedLite, setShowAdvancedLite] = useState(false);
  // Full = แสดงทุกอย่าง; Lite = เฉพาะที่จำเป็น เว้นแต่กด "ตัวเลือกทั้งหมด"
  const showAdvanced = !isLite || showAdvancedLite;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const safeHandleChange = handleChange as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const safeHandleNumberChange = handleNumberChange as any;

  const livePrice = useMemo(
    () =>
      PricingEngine.calculatePrice({
        ...formData,
        type: ITEM_TYPES.CURTAIN,
        id: 'temp',
      } as ItemData),
    [formData]
  );

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

  const advancedToggle = isLite && (
    <button
      type="button"
      onClick={() => setShowAdvancedLite((v) => !v)}
      aria-expanded={showAdvancedLite}
      className={cn(
        'w-full flex items-center justify-between gap-2 min-h-[44px] px-3.5 rounded-xl border border-dashed transition-colors',
        showAdvancedLite
          ? 'border-primary/40 bg-primary/5 text-primary'
          : 'border-border text-muted-foreground hover:bg-muted/30'
      )}
    >
      <span className="flex items-center gap-2 text-sm font-medium text-left">
        <SlidersHorizontal className="w-4 h-4 shrink-0" />
        ตัวเลือกขั้นสูง (อุปกรณ์ผลิต · ทิศเปิด · ต้นทุน)
      </span>
      <span className="text-xs font-semibold shrink-0">{showAdvancedLite ? 'ซ่อน' : 'แสดง'}</span>
    </button>
  );

  const dimensionSection = (
    <DimensionSection data={formData} onChange={safeHandleNumberChange} errors={errors} />
  );

  // รูปแบบม่าน — อยู่ต่อจากขนาดเสมอ (เป็นตัวกำหนดอุปกรณ์/ชั้นผ้า/ทิศเปิด)
  const styleSection = (
    <StyleSection
      data={formData}
      onChange={safeHandleChange}
      errors={errors}
      showOpening={showAdvanced}
    />
  );

  // กลุ่ม input (ผ้า/อุปกรณ์) — ใช้ร่วมทั้ง Lite (ใน collapsible) และ Full (คอลัมน์ซ้าย)
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
        showCatalogTools={showAdvanced}
      />

      {showAdvanced && (
        <HardwareSection
          data={formData}
          onChange={safeHandleChange}
          errors={errors}
          warnings={warnings}
        />
      )}
    </>
  );

  const priceSummary = (
    <PriceSummary
      data={formData}
      onChange={safeHandleChange}
      onNumberChange={safeHandleNumberChange}
      showProMode={showAdvanced}
    />
  );

  return (
    <form
      id={CURTAIN_FORM_ID}
      onSubmit={handleSubmit}
      onBlur={() => onAutoSave?.(formData)}
      className="space-y-3"
    >
      {isLite ? (
        <>
          {dimensionSection}
          {styleSection}
          <CollapsibleSection
            title="รายละเอียดสินค้า"
            defaultOpen={mode === 'edit'}
            badge={
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums mr-1">
                ฿{fmtTH(livePrice)}
              </span>
            }
            hint="ผ้า • ราคา — ใส่ทีหลังได้"
          >
            {advancedToggle}
            {inputSections}
            {priceSummary}
            {notesInput}
          </CollapsibleSection>
        </>
      ) : (
        // Full (เดสก์ท็อป): 2 คอลัมน์ — input ซ้าย / สรุปราคา+ต้นทุน sticky ขวา
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
