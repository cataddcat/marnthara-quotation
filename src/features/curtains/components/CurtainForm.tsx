// src/features/curtains/components/CurtainForm.tsx
import React from 'react';
import { CurtainItemInput } from '@/types';
import { Input } from '@/components/ui/Input';

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
}

export const CurtainForm: React.FC<CurtainFormProps> = ({
  initialData,
  onSubmit,
  onAutoSave,
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const safeHandleChange = handleChange as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const safeHandleNumberChange = handleNumberChange as any;

  return (
    <form
      id={CURTAIN_FORM_ID}
      onSubmit={handleSubmit}
      onBlur={() => onAutoSave?.(formData)}
      className="space-y-4"
    >
      <DimensionSection
        data={formData}
        onChange={safeHandleNumberChange}
        errors={errors}
      />

      <FabricSection
        data={formData}
        onChange={safeHandleChange}
        onNumberChange={safeHandleNumberChange}
        onMainFabricSelect={handleMainFabricSelect}
        onSheerFabricSelect={handleSheerFabricSelect}
        errors={errors}
        warnings={warnings}
      />

      <StyleSection data={formData} onChange={safeHandleChange} errors={errors} />

      <HardwareSection
        data={formData}
        onChange={safeHandleChange}
        errors={errors}
        warnings={warnings}
      />

      <PriceSummary
        data={formData}
        onChange={safeHandleChange}
        onNumberChange={safeHandleNumberChange}
      />

      <Input
        label="หมายเหตุ"
        value={formData.notes || ''}
        onChange={(e) => handleChange('notes', e.target.value)}
        className="bg-muted/30"
        error={errors.notes}
      />
    </form>
  );
};
