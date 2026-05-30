import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useAppStore } from '@/store/useAppStore';
import { Switch } from '@/components/ui/Switch';
import { Input } from '@/components/ui/Input';
import { useCalculations } from '@/hooks/useCalculations';
import { useHaptic } from '@/hooks/useHaptic'; // Don't forget Haptics!
import { Calculator, Percent, Coins, ArrowRightLeft, CheckCircle2 } from 'lucide-react';
import { fmtTH, toNum } from '@/utils/formatters';
import { cn } from '@/lib/utils';

interface DiscountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DiscountModal: React.FC<DiscountModalProps> = ({ isOpen, onClose }) => {
  const discount = useAppStore((state) => state.discount);
  const setDiscount = useAppStore((state) => state.setDiscount);
  const shopConfig = useAppStore((state) => state.shopConfig);
  const updateShopConfig = useAppStore((state) => state.updateShopConfig);
  const { grandTotal } = useCalculations(); // ยอดรวมสินค้าดิบๆ
  const { trigger } = useHaptic();

  // Local State - Initialize directly from store props (assumes Modal remounts on open via key prop in ModalManager)
  const [isEnabled, setIsEnabled] = useState<boolean>(discount.is_enabled ?? discount.value > 0);
  const [type, setType] = useState<'amount' | 'percent'>(discount.type);
  const [valueStr, setValueStr] = useState<string>(
    discount.value === 0 ? '' : discount.value.toString()
  );

  // --- Smart Logic ---
  const handleToggleType = () => {
    trigger('selection');
    const currentVal = toNum(valueStr);

    if (currentVal > 0 && grandTotal > 0) {
      if (type === 'amount') {
        // Convert Baht -> %
        const percent = (currentVal / grandTotal) * 100;
        setValueStr(percent.toFixed(2)); // Smart Convert
      } else {
        // Convert % -> Baht
        const amount = (currentVal * grandTotal) / 100;
        setValueStr(amount.toFixed(0)); // Smart Convert
      }
    }
    setType((prev) => (prev === 'amount' ? 'percent' : 'amount'));
  };

  const handleSave = () => {
    trigger('success');
    setDiscount({
      type,
      value: toNum(valueStr),
      is_enabled: isEnabled,
    });
    onClose();
  };

  // Real-time Preview Calculation
  const preview = (() => {
    const val = toNum(valueStr);
    let discountAmt = 0;
    if (isEnabled && val > 0) {
      discountAmt = type === 'percent' ? (grandTotal * val) / 100 : val;
    }
    const afterDiscount = Math.max(0, grandTotal - discountAmt);
    const vatAmt = shopConfig.baseVatRate > 0 ? (afterDiscount * shopConfig.baseVatRate) / 100 : 0;

    return {
      discountAmt,
      afterDiscount,
      vatAmt,
      netTotal: afterDiscount + vatAmt,
    };
  })();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="ส่วนลด & ภาษี (Discount & Tax)"
      variant="drawer" // ✅ เพิ่มบรรทัดนี้: เปลี่ยนเป็นลิ้นชักดึงขึ้น
    >
      <div className="space-y-6">
        {/* --- 1. Discount Section (Hero) --- */}
        <div
          className={cn(
            'relative overflow-hidden rounded-2xl border transition-all duration-300',
            isEnabled ? 'bg-success/10 border-success/30' : 'bg-muted/40 border-border'
          )}
        >
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'p-2 rounded-lg',
                    isEnabled ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'
                  )}
                >
                  <Calculator className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span
                    className={cn(
                      'font-semibold text-sm',
                      isEnabled ? 'text-success-foreground' : 'text-foreground'
                    )}
                  >
                    เปิดใช้งานส่วนลด
                  </span>
                  <span className="text-[10px] text-muted-foreground">Apply Discount</span>
                </div>
              </div>
              <Switch
                aria-label="เปิด/ปิดส่วนลด"
                checked={isEnabled}
                onCheckedChange={(c) => {
                  trigger('light');
                  setIsEnabled(c);
                }}
              />
            </div>

            {/* Smart Input Area */}
            <div
              className={cn(
                'transition-all duration-300 grid grid-cols-[1fr_auto] gap-2',
                isEnabled
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-30 pointer-events-none translate-y-2'
              )}
            >
              <div className="relative">
                <Input
                  type="number"
                  inputMode="decimal"
                  aria-label="จำนวนส่วนลด"
                  placeholder="0.00"
                  value={valueStr}
                  onChange={(e) => setValueStr(e.target.value)}
                  className="pr-12 text-lg font-mono font-bold text-success border-success/30 focus:border-success"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-success/70 pointer-events-none">
                  {type === 'percent' ? '%' : 'THB'}
                </div>
              </div>

              {/* Smart Toggle Button */}
              <button
                onClick={handleToggleType}
                aria-label="สลับหน่วยส่วนลด (บาท / เปอร์เซ็นต์)"
                className="flex items-center gap-2 px-4 rounded-xl bg-card border border-success/30 shadow-sm text-success hover:bg-success/10 active:scale-95 transition-all"
              >
                {type === 'percent' ? (
                  <Percent className="w-4 h-4" />
                ) : (
                  <Coins className="w-4 h-4" />
                )}
                <ArrowRightLeft className="w-3 h-3 opacity-50" />
              </button>
            </div>
          </div>
        </div>

        {/* --- 2. VAT Section (Fixed 7%) --- */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-info/10 text-info">
                <Percent className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold text-sm text-foreground">
                  ภาษีมูลค่าเพิ่ม (VAT 7%)
                </div>
                <div className="text-[10px] text-muted-foreground">คำนวณจากยอดหลังหักส่วนลด</div>
              </div>
            </div>
            <Switch
              aria-label="เปิด/ปิด VAT 7%"
              checked={shopConfig.baseVatRate > 0}
              onCheckedChange={(c) => {
                trigger('light');
                updateShopConfig({ baseVatRate: c ? 7 : 0 });
              }}
            />
          </div>
        </div>

        {/* --- 3. Live Preview (The Invoice) --- */}
        <div className="bg-primary text-primary-foreground/80 rounded-2xl p-5 space-y-3 shadow-xl shadow-primary/10">
          <div className="flex justify-between text-sm">
            <span>ยอดรวมสินค้า</span>
            <span className="tabular-nums text-primary-foreground">{fmtTH(grandTotal)}</span>
          </div>

          {/* Dynamic Lines */}
          {isEnabled && preview.discountAmt > 0 && (
            <div className="flex justify-between text-sm text-success animate-fade-in font-medium">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3" /> ส่วนลด (
                {type === 'percent' ? `${valueStr}%` : 'ระบุเอง'})
              </span>
              <span className="tabular-nums font-bold">-{fmtTH(preview.discountAmt)}</span>
            </div>
          )}

          {preview.vatAmt > 0 && (
            <div className="flex justify-between text-sm text-info animate-fade-in font-medium">
              <span>VAT 7%</span>
              <span className="tabular-nums font-bold">+{fmtTH(preview.vatAmt)}</span>
            </div>
          )}

          <div className="h-px bg-primary-foreground/10 my-2" />

          <div className="flex justify-between items-end">
            <span className="text-primary-foreground font-medium">ยอดสุทธิ (Net Total)</span>
            <span className="text-2xl font-bold text-primary-foreground tracking-tight tabular-nums">
              {fmtTH(preview.netTotal)}
            </span>
          </div>
        </div>

        {/* --- Actions --- */}
        <div className="grid grid-cols-2 gap-3">
          <Button variant="ghost" onClick={onClose} className="h-12">
            ยกเลิก
          </Button>
          <Button
            onClick={handleSave}
            className="h-12 bg-primary text-primary-foreground shadow-xl shadow-primary/20 hover:bg-primary/90"
          >
            บันทึกการตั้งค่า
          </Button>
        </div>
      </div>
    </Modal>
  );
};
