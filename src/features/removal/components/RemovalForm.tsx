// RemovalForm.tsx
import React, { useMemo } from 'react';
import { RemovalItemInput } from '@/types';
import { PricingEngine } from '@/lib/pricing/PricingEngine';
import { ITEM_TYPES } from '@/config/enums';
import { fmtTH, toNum } from '@/utils/formatters';
import { useZodForm } from '@/hooks/useZodForm';
import { RemovalSchema, RemovalFormValues } from '../schemas';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import { Scissors, DollarSign } from 'lucide-react';

// Helper: format string|number → comma-separated display
const fmtDisplay = (val: string | number | undefined): string => {
  if (val === '' || val === undefined || val === 0) return '';
  const num = Number(val);
  return isNaN(num) ? '' : num.toLocaleString('en-US');
};

interface RemovalFormProps {
  initialData?: Partial<RemovalItemInput>;
  onSubmit: (data: RemovalItemInput) => void;
  onCancel: () => void;
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

export const RemovalForm: React.FC<RemovalFormProps> = ({ initialData, onSubmit, onCancel, onAutoSave }) => {
  const {
    formData,
    errors,
    isDirty,
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

  return (
    <form onSubmit={handleSubmit} onBlur={() => onAutoSave?.(formData)} className="space-y-6 pb-20 sm:pb-0">
      <section className="space-y-4 bg-card p-5 rounded-2xl border border-border shadow-sm">
        <div className="flex items-center gap-2 text-foreground font-bold mb-2">
          <Scissors className="w-5 h-5 text-destructive" />
          <h2>รายละเอียดงานรื้อถอน</h2>
        </div>

        <div className="space-y-3">
          <Input
            label="รายการ / รายละเอียด"
            placeholder="เช่น รื้อถอนม่านเก่า, รื้อวอลเปเปอร์..."
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            autoFocus
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
                  className="w-10 h-10 rounded-l-xl bg-muted text-muted-foreground hover:bg-accent flex items-center justify-center border-y border-l border-input"
                >
                  -
                </button>
                <input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => handleNumberChange('quantity', e.target.value)}
                  className="w-full h-10 text-center border-y border-input bg-background text-foreground font-bold"
                />
                <button
                  type="button"
                  onClick={() =>
                    handleNumberChange('quantity', String(toNum(formData.quantity) + 1))
                  }
                  className="w-10 h-10 rounded-r-xl bg-muted text-muted-foreground hover:bg-accent flex items-center justify-center border-y border-r border-input"
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
      </section>

      {/* Price Summary */}
      <section className="bg-card border border-border p-5 rounded-2xl shadow-sm space-y-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-destructive/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

        <div className="flex items-center gap-2 text-destructive font-bold border-b border-border pb-3">
          <DollarSign className="w-5 h-5" />
          <h3>สรุปค่าใช้จ่าย</h3>
        </div>

        <div className="flex justify-between items-baseline">
          <div className="text-sm text-muted-foreground">รวมเป็นเงิน</div>
          <span className="text-3xl font-bold tabular-nums text-destructive">
            {fmtTH(pricePreview.total)}
          </span>
        </div>

        {/* Override */}
        <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Switch
              checked={formData.enable_set_price || false}
              onCheckedChange={(c) => handleChange('enable_set_price', c)}
              className="data-[state=checked]:bg-primary"
            />
            <span className="text-sm text-muted-foreground">เหมาจ่าย (Override)</span>
          </div>

          {formData.enable_set_price && (
            <div className="w-32">
              <input
                type="text"
                inputMode="decimal"
                value={fmtDisplay(formData.set_price_override)}
                onChange={(e) => handleNumberChange('set_price_override', e.target.value)}
                placeholder="ราคาเหมา"
                className="w-full bg-muted/50 text-foreground border border-input rounded-lg px-3 py-1.5 text-right font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
              />
            </div>
          )}
        </div>
      </section>

      <div className="pt-2">
        <Input
          label="หมายเหตุ"
          value={formData.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          className="bg-muted/50 border-transparent focus:bg-background transition-colors"
        />

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border mt-4">
          <Button
            variant="ghost"
            type="button"
            onClick={onCancel}
            className="text-muted-foreground"
          >
            ยกเลิก
          </Button>
          <Button
            type="submit"
            className="min-w-[120px] bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            disabled={!isDirty && !initialData?.description}
          >
            บันทึกรายการ
          </Button>
        </div>
      </div>
    </form>
  );
};
