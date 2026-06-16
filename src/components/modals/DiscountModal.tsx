import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useAppStore } from '@/store/useAppStore';
import { Switch } from '@/components/ui/Switch';
import { Input } from '@/components/ui/Input';
import { useCalculations } from '@/hooks/useCalculations';
import { useHaptic } from '@/hooks/useHaptic'; // Don't forget Haptics!
import { Calculator, Percent, Coins, Tag, CheckCircle2, Eye, EyeOff } from 'lucide-react';
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
  const [type, setType] = useState<'amount' | 'percent' | 'target'>(discount.type);
  const [valueStr, setValueStr] = useState<string>(
    discount.value === 0 ? '' : discount.value.toString()
  );
  // target mode: แสดงรายการส่วนลดที่คิดย้อนบนเอกสารลูกค้าหรือไม่ (default ซ่อน = ราคาเดียวสะอาด)
  const [hideBreakdown, setHideBreakdown] = useState<boolean>(discount.hide_breakdown ?? true);

  const MODES: { key: 'amount' | 'percent' | 'target'; label: string; icon: typeof Coins }[] = [
    { key: 'amount', label: 'บาท', icon: Coins },
    { key: 'percent', label: '%', icon: Percent },
    { key: 'target', label: 'เคาะราคา', icon: Tag },
  ];

  // --- Smart Logic ---
  const handleModeChange = (next: 'amount' | 'percent' | 'target') => {
    if (next === type) return;
    trigger('selection');
    const currentVal = toNum(valueStr);

    if (type !== 'target' && next !== 'target') {
      // สลับ บาท ↔ % — แปลงค่าให้อัตโนมัติ (smart convert)
      if (currentVal > 0 && grandTotal > 0) {
        setValueStr(
          next === 'percent'
            ? ((currentVal / grandTotal) * 100).toFixed(2)
            : ((currentVal * grandTotal) / 100).toFixed(0)
        );
      }
    } else if (next === 'target') {
      // เข้าโหมดเคาะราคา → เติมยอดรวมปัจจุบันให้ผู้ใช้แก้ลง (ค่าเดิม = ส่วนลด คนละความหมาย)
      setValueStr(grandTotal > 0 ? Math.round(grandTotal).toString() : '');
    } else {
      // ออกจากเคาะราคา → ค่าเดิมคือราคา ไม่ใช่ส่วนลด → ล้าง
      setValueStr('');
    }
    setType(next);
  };

  const handleSave = () => {
    trigger('success');
    setDiscount({
      type,
      value: toNum(valueStr),
      is_enabled: isEnabled,
      ...(type === 'target' ? { hide_breakdown: hideBreakdown } : {}),
    });
    onClose();
  };

  // Real-time Preview Calculation
  const preview = (() => {
    const val = toNum(valueStr);
    const vatRate = shopConfig.baseVatRate;

    if (isEnabled && type === 'target' && val >= 0) {
      // เคาะราคา: val = ยอดสุทธิที่ต้องการ → คิดย้อน
      const afterDiscount = vatRate > 0 ? val / (1 + vatRate / 100) : val;
      const vatAmt = val - afterDiscount;
      return {
        discountAmt: grandTotal - afterDiscount, // ติดลบได้ถ้าเคาะราคา > ยอดรวม
        afterDiscount,
        vatAmt,
        netTotal: val,
      };
    }

    let discountAmt = 0;
    if (isEnabled && val > 0) {
      discountAmt = type === 'percent' ? (grandTotal * val) / 100 : val;
    }
    const afterDiscount = Math.max(0, grandTotal - discountAmt);
    const vatAmt = vatRate > 0 ? (afterDiscount * vatRate) / 100 : 0;

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
            'relative overflow-hidden rounded-xl border transition-all duration-300',
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
                  <span className="text-xs text-muted-foreground">Apply Discount</span>
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
                'transition-all duration-300 space-y-3',
                isEnabled
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-30 pointer-events-none translate-y-2'
              )}
            >
              {/* Mode selector: บาท · % · เคาะราคา */}
              <div
                role="radiogroup"
                aria-label="รูปแบบส่วนลด"
                className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-muted/60 border border-border"
              >
                {MODES.map((m) => {
                  const Icon = m.icon;
                  const active = type === m.key;
                  return (
                    <button
                      key={m.key}
                      role="radio"
                      aria-checked={active}
                      onClick={() => handleModeChange(m.key)}
                      className={cn(
                        'flex items-center justify-center gap-1.5 min-h-[44px] rounded-lg text-sm font-semibold transition-all active:scale-95',
                        active
                          ? 'bg-card text-success border border-success/40 shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <Icon className="w-4 h-4" strokeWidth={1.5} />
                      {m.label}
                    </button>
                  );
                })}
              </div>

              <div className="relative">
                <Input
                  type="number"
                  inputMode="decimal"
                  aria-label={type === 'target' ? 'ยอดสุทธิที่ต้องการ' : 'จำนวนส่วนลด'}
                  placeholder={type === 'target' ? '0' : '0.00'}
                  value={valueStr}
                  onChange={(e) => setValueStr(e.target.value)}
                  className="pr-14 text-lg font-mono font-bold text-success border-success/30 focus:border-success"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-success/70 pointer-events-none">
                  {type === 'percent' ? '%' : 'บาท'}
                </div>
              </div>

              {/* เคาะราคา — ทางเลือกแสดง/ซ่อนรายการส่วนลดบนเอกสารลูกค้า */}
              {type === 'target' && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    ระบบจะคิดส่วนลดให้อัตโนมัติ — ยอดสุทธิ = ราคาที่กรอก
                  </p>
                  <div className="w-full flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2.5">
                    <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                      {hideBreakdown ? (
                        <EyeOff className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                      ) : (
                        <Eye className="w-4 h-4 text-success" strokeWidth={1.5} />
                      )}
                      แสดงรายการส่วนลดในเอกสารลูกค้า
                    </span>
                    <Switch
                      aria-label="แสดงรายการส่วนลดในเอกสารลูกค้า"
                      checked={!hideBreakdown}
                      onCheckedChange={(c) => {
                        trigger('light');
                        setHideBreakdown(!c);
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {hideBreakdown
                      ? 'เอกสารลูกค้าจะเห็นเฉพาะยอดสุทธิ (ราคาเดียว)'
                      : 'เอกสารลูกค้าจะเห็น ยอดรวมสินค้า → ส่วนลด → ยอดสุทธิ'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* --- 2. VAT Section (Fixed 7%) --- */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-info/10 text-info">
                <Percent className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <div>
                <div className="font-semibold text-sm text-foreground">
                  ภาษีมูลค่าเพิ่ม (VAT 7%)
                </div>
                <div className="text-sm text-muted-foreground">คำนวณจากยอดหลังหักส่วนลด</div>
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
        <div className="bg-primary text-primary-foreground/80 rounded-xl p-5 space-y-3">
          <div className="flex justify-between text-sm">
            <span>ยอดรวมสินค้า</span>
            <span className="font-mono tabular-nums text-primary-foreground">{fmtTH(grandTotal)}</span>
          </div>

          {/* Dynamic Lines */}
          {isEnabled && type !== 'target' && preview.discountAmt > 0 && (
            <div className="flex justify-between text-sm text-success animate-fade-in font-medium">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3" strokeWidth={1.5} /> ส่วนลด (
                {type === 'percent' ? `${valueStr}%` : 'ระบุเอง'})
              </span>
              <span className="font-mono tabular-nums font-bold">-{fmtTH(preview.discountAmt)}</span>
            </div>
          )}

          {/* เคาะราคา — โชว์ส่วนต่างที่คิดย้อน (preview ในโมดัลโชว์เต็มเสมอ ไม่ขึ้นกับ hide_breakdown) */}
          {isEnabled && type === 'target' && preview.discountAmt > 0.5 && (
            <div className="flex justify-between text-sm text-success animate-fade-in font-medium">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3" strokeWidth={1.5} /> ส่วนลด (เคาะราคา)
              </span>
              <span className="font-mono tabular-nums font-bold">-{fmtTH(preview.discountAmt)}</span>
            </div>
          )}

          {isEnabled && type === 'target' && preview.discountAmt < -0.5 && (
            <div className="flex justify-between text-sm text-amber-300 animate-fade-in font-medium">
              <span>ปรับราคาขึ้น</span>
              <span className="font-mono tabular-nums font-bold">
                +{fmtTH(-preview.discountAmt)}
              </span>
            </div>
          )}

          {preview.vatAmt > 0 && (
            <div className="flex justify-between text-sm text-info animate-fade-in font-medium">
              <span>VAT 7%</span>
              <span className="font-mono tabular-nums font-bold">+{fmtTH(preview.vatAmt)}</span>
            </div>
          )}

          <div className="h-px bg-primary-foreground/10 my-2" />

          <div className="flex justify-between items-end">
            <span className="text-primary-foreground font-medium">ยอดสุทธิ (Net Total)</span>
            {/* ตัวเลข 16px — เน้นด้วย plate (พื้นหลัง/กรอบ tint บนพื้น primary) แทนขนาด */}
            <span className="text-base font-bold font-mono text-primary-foreground tracking-tight tabular-nums border border-primary-foreground/20 bg-primary-foreground/10 rounded-lg px-2 py-1">
              {fmtTH(preview.netTotal)}
            </span>
          </div>
        </div>

        {/* --- Actions --- */}
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={onClose} className="h-12">
            ยกเลิก
          </Button>
          <Button
            onClick={handleSave}
            className="h-12 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            บันทึกการตั้งค่า
          </Button>
        </div>
      </div>
    </Modal>
  );
};
