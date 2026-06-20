import React, { useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useAppStore } from '@/store/useAppStore';
import { useUIStore } from '@/store/useUIStore';
import { useCalculations } from '@/hooks/useCalculations';
import { useHaptic } from '@/hooks/useHaptic';
import { cn } from '@/lib/utils';
import { Users, Scissors, Package, Train, Copy, AlertTriangle } from 'lucide-react';
import {
  generateSummaryText,
  type SummaryType,
  type SummaryInput,
  type RailFormat,
} from '@/lib/summaryGenerator';
import { missingOpeningItems } from '@/lib/item-status';

// เอกสารฝั่งผลิต — ทิศเปิดมีผลต่อใบสั่ง (สไลด์/ลูกล้อ/ตับผ้า): ✅ เจ้าของร้านยืนยันให้
// "ต้องใส่ทิศเปิดก่อนออกเอกสาร" (ค่าว่างเดิมถูกตีความเป็น "แยกกลาง" เงียบ ๆ → สั่งของผิด)
const PRODUCTION_TYPES: readonly SummaryType[] = ['seamstress', 'purchase_order', 'rail_order'];

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

  // รายการที่ยังไม่เลือกทิศเปิด → บล็อกเอกสารฝั่งผลิตจนกว่าจะครบ
  const missingOpening = useMemo(() => missingOpeningItems(rooms), [rooms]);
  const blockedByOpening = PRODUCTION_TYPES.includes(type) && missingOpening.length > 0;

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
    if (blockedByOpening) {
      trigger('error');
      addToast('warning', `เลือกทิศเปิดให้ครบก่อนออกเอกสาร (ค้าง ${missingOpening.length} รายการ)`);
      return;
    }
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
          disabled={blockedByOpening}
          className="w-full h-12 gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Copy className="w-4 h-4" strokeWidth={1.5} />
          {blockedByOpening ? 'เลือกทิศเปิดให้ครบก่อน' : 'คัดลอกข้อความ'}
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
                <span className="text-xs font-semibold leading-none text-center">
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* --- รูปแบบใบสั่งราง: ย่อ / ละเอียด (เฉพาะแท็บ "สั่งราง") --- */}
        {type === 'rail_order' && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground">รูปแบบ:</span>
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
                    'px-3 min-h-[44px] flex items-center justify-center text-xs font-semibold rounded-md transition-all',
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

        {/* --- เตือน: ทิศเปิดยังไม่ครบ → เอกสารผลิตจะออก "แยกกลาง" ผิด ๆ — บล็อกจนกว่าจะเลือก --- */}
        {blockedByOpening && (
          <div className="shrink-0 rounded-xl border border-amber-200/60 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800/40 p-3 text-sm text-amber-700 dark:text-amber-400 eeert:text-amber-900">
            <div className="flex items-center gap-1.5 font-semibold mb-1">
              <AlertTriangle className="w-4 h-4 shrink-0" strokeWidth={1.5} />
              ยังไม่เลือกทิศเปิด {missingOpening.length} รายการ — ต้องครบก่อนออกเอกสารผลิต
            </div>
            <ul className="space-y-0.5 pl-5 list-disc">
              {missingOpening.slice(0, 4).map((m, i) => (
                <li key={i}>
                  {m.roomName}: {m.label}
                </li>
              ))}
              {missingOpening.length > 4 && <li>… อีก {missingOpening.length - 4} รายการ</li>}
            </ul>
          </div>
        )}

        {/* --- Editable preview — เต็มความสูง drawer, มีพื้นขั้นต่ำสูง ๆ --- */}
        <textarea
          value={text}
          onChange={(e) => setEdited(e.target.value)}
          rows={18}
          aria-label="ข้อความสรุป (แก้ไขได้)"
          spellCheck={false}
          className="w-full flex-1 min-h-[55vh] rounded-xl border border-border bg-background p-3 text-sm leading-relaxed font-mono whitespace-pre-wrap resize-y focus:outline-none focus:ring-1 focus:ring-primary"
        />

        <p className="text-sm text-muted-foreground/80 px-1 shrink-0">
          แก้ไขข้อความได้ก่อนคัดลอก · สลับแบบจะรีเซ็ตเป็นข้อความใหม่
        </p>
      </div>
    </Modal>
  );
};
