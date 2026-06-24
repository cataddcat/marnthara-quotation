// RemovalForm.tsx
import React, { useMemo } from 'react';
import { RemovalItemInput } from '@/types';
import { PricingEngine } from '@/lib/pricing/PricingEngine';
import { ITEM_TYPES } from '@/config/enums';
import { toNum } from '@/utils/formatters';
import { useZodForm } from '@/hooks/useZodForm';
import { RemovalSchema, RemovalFormValues } from '../schemas';
import { Input } from '@/components/ui/Input';
import { Scissors, DollarSign } from 'lucide-react';
import { useExperienceMode, useTierSize } from '@/hooks/useExperienceMode';
import { useFormAutoSave } from '@/hooks/useFormAutoSave';
import { FormTwoColumn } from '@/components/ui/FormTwoColumn';
import { FormSection } from '@/components/ui/FormSection';
import { ItemSummaryCard } from '@/components/ui/ItemSummaryCard';
import { DATA_TONE_TEXT } from '@/config/dataTones';

export const REMOVAL_FORM_ID = 'removal-edit-form';

// Helper: format string|number → comma-separated display
const fmtDisplay = (val: string | number | undefined): string => {
  if (val === '' || val === undefined || val === 0) return '';
  const num = Number(val);
  return isNaN(num) ? '' : num.toLocaleString('en-US');
};

interface RemovalFormProps {
  initialData?: Partial<RemovalItemInput>;
  onSubmit: (data: RemovalItemInput) => void;
  onAutoSave?: (data: Partial<RemovalItemInput>) => void;
}

const DEFAULT_DATA: RemovalFormValues = {
  type: ITEM_TYPES.REMOVAL,
  quantity: 1,
  price_per_item: 0,
  description: '',
  notes: '',
  is_suspended: false,
  enable_set_price: false,
  set_price_override: 0,
};

export const RemovalForm: React.FC<RemovalFormProps> = ({ initialData, onSubmit, onAutoSave }) => {
  const {
    formData,
    errors,
    handleChange,
    handleNumberChange,
    handleSubmit,
  } = useZodForm<RemovalFormValues>({
    schema: RemovalSchema,
    initialData: { ...DEFAULT_DATA, ...initialData } as RemovalFormValues,
    onSubmit: (data) => {
      // Normalize string → number ก่อนส่งให้ caller (เดิมทำใน handleSubmit)
      const submission: RemovalItemInput = {
        ...data,
        quantity: toNum(data.quantity),
        price_per_item: toNum(data.price_per_item),
        set_price_override: toNum(data.set_price_override),
      };
      onSubmit(submission);
    },
  });

  // บันทึกอัตโนมัติเมื่อ formData เปลี่ยน (จับค่าหลัง smart-parse + ค่าช่องสุดท้ายครบ)
  useFormAutoSave(formData, onAutoSave);

  const pricePreview = useMemo(() => {
    const previewItem = {
      ...formData,
      type: ITEM_TYPES.REMOVAL,
      id: 'preview',
    };
    return PricingEngine.calculateDetailedPrice(
      previewItem as unknown as import('@/types').ItemData
    );
  }, [formData]);

  const { isDetail } = useExperienceMode();
  const { control } = useTierSize();

  const summaryPanel = (
    <ItemSummaryCard
      title="สรุปค่าใช้จ่าย"
      titleIcon={DollarSign}
      titleClass="text-destructive"
      rows={[
        {
          label: 'จำนวน × ราคา/จุด:',
          value: `${toNum(formData.quantity)} × ${toNum(formData.price_per_item).toLocaleString('en-US')}`,
          valueClass: DATA_TONE_TEXT.cost,
        },
      ]}
      totalLabel="รวมเป็นเงิน"
      totalClass="text-base font-bold font-mono tabular-nums text-destructive border rounded-lg px-2 py-1 bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:border-rose-900"
      total={pricePreview.total}
      enableSetPrice={formData.enable_set_price || false}
      onToggleSetPrice={(c) => handleChange('enable_set_price', c)}
      setPriceValue={fmtDisplay(formData.set_price_override)}
      onSetPriceChange={(v) => handleNumberChange('set_price_override', v)}
    />
  );

  return (
    <form id={REMOVAL_FORM_ID} onSubmit={handleSubmit}>
      <FormTwoColumn full={isDetail} right={summaryPanel}>
      <FormSection icon={Scissors} iconClass="text-destructive" title="รายละเอียดงานรื้อถอน">
        <div className="space-y-3">
          <Input
            label="รายการ / รายละเอียด"
            placeholder="เช่น รื้อถอนม่านเก่า, รื้อวอลเปเปอร์..."
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            autoFocus
            size={control}
            className="bg-muted/50"
            error={errors.description}
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <label className="text-sm font-bold text-foreground mb-1.5 block">จำนวน</label>
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() =>
                    handleNumberChange(
                      'quantity',
                      String(Math.max(1, toNum(formData.quantity) - 1))
                    )
                  }
                  className="w-12 h-12 rounded-l-xl bg-muted text-muted-foreground hover:bg-accent flex items-center justify-center border-y border-l border-input"
                >
                  -
                </button>
                <input
                  type="number"
                  inputMode="numeric"
                  value={formData.quantity}
                  onChange={(e) => handleNumberChange('quantity', e.target.value)}
                  className="w-full h-12 text-center border-y border-input bg-background text-foreground font-bold"
                />
                <button
                  type="button"
                  onClick={() =>
                    handleNumberChange('quantity', String(toNum(formData.quantity) + 1))
                  }
                  className="w-12 h-12 rounded-r-xl bg-muted text-muted-foreground hover:bg-accent flex items-center justify-center border-y border-r border-input"
                >
                  +
                </button>
              </div>
            </div>
            <Input
              label="ราคาต่อหน่วย"
              placeholder="0.00"
              value={formData.price_per_item}
              onChange={(e) => handleNumberChange('price_per_item', e.target.value)}
              inputMode="decimal"
              className="bg-muted/50"
              error={errors.price_per_item}
            />
          </div>
        </div>
      </FormSection>

      <Input
        label="หมายเหตุ"
        value={formData.notes}
        onChange={(e) => handleChange('notes', e.target.value)}
        className="bg-muted/50 border-transparent focus:bg-background transition-colors"
      />
      </FormTwoColumn>
    </form>
  );
};
