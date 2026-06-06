import React, { useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useAppStore } from '@/store/useAppStore';
import { useUIStore } from '@/store/useUIStore';
import { useCalculations } from '@/hooks/useCalculations';
import { useHaptic } from '@/hooks/useHaptic';
import { cn } from '@/lib/utils';
import { Users, Scissors, Package, Train, Copy } from 'lucide-react';
import {
  generateSummaryText,
  type SummaryType,
  type SummaryInput,
  type RailFormat,
} from '@/lib/summaryGenerator';

interface CopySummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const OPTIONS: { id: SummaryType; label: string; icon: React.ElementType }[] = [
  { id: 'customer', label: 'ลูกค้า', icon: Users },
  { id: 'seamstress', label: 'ช่างเย็บ', icon: Scissors },
  { id: 'purchase_order', label: 'สั่งของ', icon: Package },
  { id: 'rail_order', label: 'สั่งราง', icon: Train },
];

export const CopySummaryModal: React.FC<CopySummaryModalProps> = ({ isOpen, onClose }) => {
  const rooms = useAppStore((state) => state.rooms);
  const customer = useAppStore((state) => state.customer);
  const shopConfig = useAppStore((state) => state.shopConfig);
  const discount = useAppStore((state) => state.discount);
  const { grandTotal, discountAmount, vatAmount, finalTotal } = useCalculations();
  const addToast = useUIStore((state) => state.addToast);
  const { trigger } = useHaptic();

  const [type, setType] = useState<SummaryType>('customer');
  // รูปแบบใบสั่งราง (ใช้เฉพาะแท็บ "สั่งราง")
  const [railFormat, setRailFormat] = useState<RailFormat>('detailed');
  // null = ยังไม่ถูกแก้ → ใช้ข้อความที่สร้างอัตโนมัติ; string = ผู้ใช้แก้ไขเอง
  const [edited, setEdited] = useState<string | null>(null);

  const input = useMemo<SummaryInput>(
    () => ({
      rooms,
      customer,
      shopConfig,
      totals: {
        grandTotal,
        discountAmount,
        vatAmount,
        vatRate: shopConfig.baseVatRate,
        finalTotal,
        discount,
      },
    }),
    [rooms, customer, shopConfig, discount, grandTotal, discountAmount, vatAmount, finalTotal]
  );

  // ข้อความที่สร้างอัตโนมัติตามแบบ/ข้อมูล — เป็น derived value (ไม่ใช้ effect)
  const generated = useMemo(
    () => generateSummaryText(input, type, railFormat),
    [input, type, railFormat]
  );
  const text = edited ?? generated;

  const handleSelectType = (next: SummaryType) => {
    trigger('selection');
    setType(next);
    setEdited(null); // สลับแบบ → รีเซ็ตการแก้ไขกลับเป็นข้อความใหม่
  };

  const handleSelectRailFormat = (next: RailFormat) => {
    trigger('selection');
    setRailFormat(next);
    setEdited(null); // สลับรูปแบบ → รีเซ็ตการแก้ไขกลับเป็นข้อความใหม่
  };

  const handleCopy = async () => {
    trigger('success');
    try {
      await navigator.clipboard.writeText(text);
      addToast('success', 'คัดลอกสำเร็จ!');
    } catch {
      addToast('error', 'คัดลอกล้มเหลว');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="คัดลอกสรุป (LINE)"
      description="เลือกแบบ แก้ข้อความได้ แล้วกดคัดลอก"
      variant="drawer"
      footer={
        <Button
          onClick={handleCopy}
          className="w-full h-12 gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Copy className="w-4 h-4" strokeWidth={1.5} />
          คัดลอกข้อความ
        </Button>
      }
    >
      <div className="flex flex-col gap-3 h-full min-h-0">
        {/* --- Segmented type selector --- */}
        <div className="grid grid-cols-4 gap-2 p-1 bg-muted/40 rounded-xl border border-border/50 shrink-0">
          {OPTIONS.map((opt) => {
            const active = type === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => handleSelectType(opt.id)}
                aria-pressed={active}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 py-2.5 rounded-lg min-h-[56px] transition-all',
                  active
                    ? 'bg-card shadow-sm text-foreground border border-border/50'
                    : 'text-muted-foreground hover:bg-card/50'
                )}
              >
                <opt.icon className="w-4 h-4" strokeWidth={1.5} />
                <span className="text-[11px] font-semibold leading-none text-center">
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* --- รูปแบบใบสั่งราง: ย่อ / ละเอียด (เฉพาะแท็บ "สั่งราง") --- */}
        {type === 'rail_order' && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] text-muted-foreground">รูปแบบ:</span>
            <div
              role="group"
              aria-label="รูปแบบใบสั่งราง"
              className="inline-flex rounded-lg border border-border/50 bg-muted/40 p-0.5"
            >
              {(['short', 'detailed'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => handleSelectRailFormat(f)}
                  aria-pressed={railFormat === f}
                  className={cn(
                    'px-3 py-1 text-[12px] font-semibold rounded-md transition-all',
                    railFormat === f
                      ? 'bg-card shadow-sm text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {f === 'short' ? 'ย่อ' : 'ละเอียด'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* --- Editable preview — เต็มความสูง drawer, มีพื้นขั้นต่ำสูง ๆ --- */}
        <textarea
          value={text}
          onChange={(e) => setEdited(e.target.value)}
          rows={18}
          aria-label="ข้อความสรุป (แก้ไขได้)"
          spellCheck={false}
          className="w-full flex-1 min-h-[55vh] rounded-xl border border-border bg-background p-3 text-[13px] leading-relaxed font-mono whitespace-pre-wrap resize-y focus:outline-none focus:ring-1 focus:ring-primary"
        />

        <p className="text-[11px] text-muted-foreground/80 px-1 shrink-0">
          แก้ไขข้อความได้ก่อนคัดลอก · สลับแบบจะรีเซ็ตเป็นข้อความใหม่
        </p>
      </div>
    </Modal>
  );
};
