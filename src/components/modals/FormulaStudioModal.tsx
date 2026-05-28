import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useAppStore } from '@/store/useAppStore';
import { Button } from '@/components/ui/Button';
import {
  Calculator,
  ScrollText,
  Ruler,
  RefreshCw,
  CheckCircle2,
  Lock,
  Unlock,
  Save,
} from 'lucide-react';
import { useConfirm } from '@/hooks/useConfirm';
import { useHaptic } from '@/hooks/useHaptic';
import { useUIStore } from '@/store/useUIStore';
import { cn } from '@/lib/utils';
import { FormulaConfig } from '@/store/slices/FormulaSlice';

interface FormulaStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// --- 1. Sub-Component: Input Row (Clean & Big) ---
const FormulaRow = ({ 
  label, 
  desc,
  value, 
  suffix, 
  isLocked,
  onChange,
  warning
}: { 
  label: string; 
  desc?: string;
  value: number; 
  suffix: string; 
  isLocked: boolean;
  onChange: (val: string) => void;
  warning?: boolean;
}) => {
  const [localVal, setLocalVal] = useState(value.toString());

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalVal(value.toString());
  }, [value]);

  return (
    <div className="flex flex-col py-4 border-b border-border/40 last:border-0 animate-fade-in group">
      <div className="flex justify-between items-start gap-4 mb-2">
        <div className="flex-1">
          <div className={cn("text-base font-semibold leading-tight", isLocked ? "text-foreground/80" : "text-foreground")}>
            {label}
          </div>
          {desc && (
            <div className="text-sm text-muted-foreground mt-1 font-normal leading-snug">
              {desc}
            </div>
          )}
        </div>
      </div>
      
      <div className="relative mt-1">
        <input
          type="text"
          inputMode="decimal"
          disabled={isLocked}
          value={localVal} 
          onChange={(e) => setLocalVal(e.target.value)}
          onBlur={() => {
             onChange(localVal); 
             const num = parseFloat(localVal);
             if (!isNaN(num)) setLocalVal(num.toString());
          }}
          className={cn(
            "w-full bg-muted/30 border border-input rounded-xl pl-4 pr-16 py-3 text-xl font-bold font-mono text-right transition-all",
            "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:bg-background focus:border-primary",
            isLocked && "bg-transparent border-transparent shadow-none text-foreground cursor-default",
            !isLocked && "shadow-sm bg-card",
            warning && !isLocked && "text-amber-600 border-amber-200 bg-amber-50 focus:ring-amber-500"
          )}
        />
        <div className={cn(
           "absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none bg-transparent pl-2 transition-opacity",
           isLocked ? "text-muted-foreground/50" : "text-muted-foreground"
        )}>
          {suffix}
        </div>
      </div>
    </div>
  );
};

// --- 2. Main Component ---
export const FormulaStudioModal: React.FC<FormulaStudioModalProps> = ({ isOpen, onClose }) => {
  const formulas = useAppStore((state) => state.formulas);
  const updateFormula = useAppStore((state) => state.updateFormula);
  const resetFormulas = useAppStore((state) => state.resetFormulas);
  
  const { confirm } = useConfirm();
  const { trigger } = useHaptic();
  const addToast = useUIStore((state) => state.addToast);

  const [draft, setDraft] = useState<FormulaConfig | null>(() => 
    formulas ? JSON.parse(JSON.stringify(formulas)) : null
  );
  const [activeTab, setActiveTab] = useState<'curtain' | 'wallpaper' | 'area'>('curtain');
  const [hasChanges, setHasChanges] = useState(false);
  const [isLocked, setIsLocked] = useState(true);

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDraft(formulas ? JSON.parse(JSON.stringify(formulas)) : null);
      setHasChanges(false);
      setIsLocked(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const TABS = [
    { id: 'curtain' as const, label: 'ผ้าม่าน', icon: Calculator },
    { id: 'wallpaper' as const, label: 'วอลล์', icon: ScrollText },
    { id: 'area' as const, label: 'พื้นที่', icon: Ruler },
  ];

  // ฟิลด์ที่ต้องเป็น > 0 เพราะเป็นตัวหาร หรือตัวคูณหลัก
  const MUST_BE_POSITIVE: Record<string, string[]> = {
    curtain: ['multiplier_wave', 'multiplier_pleated', 'multiplier_eyelet', 'multiplier_roman', 'yard_conversion'],
    wallpaper: ['roll_width', 'roll_length'],
    area: ['sqm_to_sqyd'],
  };

  const handleDraftChange = (category: keyof FormulaConfig, field: string, val: string) => {
    if (!draft) return;

    const num = parseFloat(val);
    if (isNaN(num)) return;

    if (num < 0) {
      trigger('error');
      addToast('warning', 'ค่าต้องไม่ติดลบ');
      return;
    }

    if ((MUST_BE_POSITIVE[category] ?? []).includes(field) && num <= 0) {
      trigger('error');
      addToast('error', `ค่านี้ต้องมากกว่า 0 (ป้องกันหารด้วยศูนย์)`);
      return;
    }

    setDraft(prev => {
      if (!prev) return null;
      return {
        ...prev,
        [category]: {
          ...prev[category],
          [field]: num
        }
      };
    });
    setHasChanges(true);
  };

  const handleSave = () => {
    if (!draft) return;
    trigger('success');
    (Object.keys(draft) as Array<keyof FormulaConfig>).forEach((key) => {
      updateFormula(key, draft[key]);
    });
    setHasChanges(false);
    addToast('success', 'บันทึกสูตรเรียบร้อย');
  };

  const handleDiscard = () => {
    trigger('light');
    setDraft(formulas ? JSON.parse(JSON.stringify(formulas)) : null);
    setHasChanges(false);
  };

  const handleReset = async () => {
    trigger('warning');
    const isConfirmed = await confirm({
      title: 'รีเซ็ตเป็นค่ามาตรฐาน?',
      description: 'ค่าทั้งหมดจะถูกคืนเป็นค่าเริ่มต้นของระบบ (Factory Default)',
      confirmLabel: 'ยืนยันรีเซ็ต',
      variant: 'destructive',
    });

    if (isConfirmed) {
      resetFormulas();
      onClose();
    }
  };

  const handleClose = async () => {
    if (hasChanges) {
      trigger('warning');
      const isConfirmed = await confirm({
        title: 'ทิ้งการเปลี่ยนแปลง?',
        description: 'คุณมีการแก้ไขค่าสูตรที่ยังไม่ได้บันทึก ต้องการปิดโดยไม่บันทึกหรือไม่?',
        confirmLabel: 'ทิ้งการแก้ไข',
        cancelLabel: 'กลับไปแก้ไข',
        variant: 'destructive',
      });
      if (!isConfirmed) return;
    }
    onClose();
  };

  const toggleLock = () => {
    trigger(isLocked ? 'medium' : 'light');
    setIsLocked(!isLocked);
  };

  if (!draft) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="ตั้งค่าสูตรคำนวณ"
      variant="fullscreen"
      headerAction={
        <button
          onClick={toggleLock}
          className={cn(
            "h-9 w-9 rounded-xl flex items-center justify-center transition-all border",
            isLocked
              ? "bg-muted/20 border-transparent text-muted-foreground hover:bg-muted/50"
              : "bg-amber-100 border-amber-200 text-amber-700 shadow-sm dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-400"
          )}
        >
          {isLocked ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
        </button>
      }
    >
      <div className="pb-safe-area">

        {/* Tabs */}
        <div className="flex bg-muted/50 p-1 rounded-xl mb-4">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                trigger('selection');
              }}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                activeTab === tab.id
                  ? "bg-white dark:bg-slate-800 text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Unsaved Changes Banner */}
        {hasChanges && (
          <div className="mb-4 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-300 font-medium">
              <span>⚠️</span>
              <span>มีการแก้ไขที่ยังไม่ได้บันทึก</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="ghost"
                onClick={handleDiscard}
                className="h-8 px-3 text-sm text-muted-foreground"
              >
                ยกเลิก
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                className="h-8 px-3 text-sm font-bold"
              >
                <Save className="w-4 h-4 mr-1" />
                บันทึกสูตร
              </Button>
            </div>
          </div>
        )}

        {/* Info Banner */}
        <div className="mb-6 p-4 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl flex gap-3 items-start">
          <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900 dark:text-blue-200">
            <span className="font-bold">พื้นที่สำคัญ:</span> การแก้ไขในหน้านี้จะมีผลต่อการคำนวณราคาทันทีเมื่อกดบันทึก กรุณาตรวจสอบให้แน่ใจ
          </div>
        </div>

        {/* CURTAIN */}
        {activeTab === 'curtain' && (
          <div className="space-y-8 pb-8">
            <section>
              <h3 className="text-sm font-bold text-primary uppercase tracking-wider mb-2 border-l-4 border-primary pl-2">
                ตัวคูณผ้า (Multipliers)
              </h3>
              <FormulaRow
                label="ม่านลอน (Wave)"
                desc="สูตร: กว้าง x ตัวคูณนี้"
                value={draft.curtain.multiplier_wave}
                suffix="เท่า"
                isLocked={isLocked}
                onChange={(v) => handleDraftChange('curtain', 'multiplier_wave', v)}
              />
              <FormulaRow
                label="ม่านจีบ (Pleated)"
                value={draft.curtain.multiplier_pleated}
                suffix="เท่า"
                isLocked={isLocked}
                onChange={(v) => handleDraftChange('curtain', 'multiplier_pleated', v)}
              />
              <FormulaRow
                label="ม่านตาไก่ (Eyelet)"
                value={draft.curtain.multiplier_eyelet}
                suffix="เท่า"
                isLocked={isLocked}
                onChange={(v) => handleDraftChange('curtain', 'multiplier_eyelet', v)}
              />
            </section>

            <section>
              <h3 className="text-sm font-bold text-primary uppercase tracking-wider mb-2 border-l-4 border-primary pl-2">
                สูตรพิเศษ & การเผื่อ
              </h3>
              <FormulaRow
                label="ม่านพับ (Roman)"
                desc="ระบบ Additive: ความกว้าง + ค่าเผื่อนี้"
                value={draft.curtain.roman_blind_offset}
                suffix="เมตร"
                isLocked={isLocked}
                onChange={(v) => handleDraftChange('curtain', 'roman_blind_offset', v)}
              />
              <FormulaRow
                label="แปลงเมตรเป็นหลา"
                desc="ค่ามาตรฐานสากล = 1.0936 (แนะนำ 1.10-1.12 เพื่อเผื่อเสีย)"
                value={draft.curtain.yard_conversion}
                suffix="เท่า"
                isLocked={isLocked}
                onChange={(v) => handleDraftChange('curtain', 'yard_conversion', v)}
                warning={draft.curtain.yard_conversion < 1.09}
              />
              <FormulaRow
                label="เผื่อริมผ้า (Hem)"
                desc="ระยะเย็บเก็บขอบซ้าย-ขวา"
                value={draft.curtain.hem_offset}
                suffix="เมตร"
                isLocked={isLocked}
                onChange={(v) => handleDraftChange('curtain', 'hem_offset', v)}
              />
            </section>
          </div>
        )}

        {/* WALLPAPER */}
        {activeTab === 'wallpaper' && (
          <div className="space-y-8 pb-8">
            <section>
              <h3 className="text-sm font-bold text-orange-600 uppercase tracking-wider mb-2 border-l-4 border-orange-500 pl-2">
                สเปคสินค้า (Specs)
              </h3>
              <FormulaRow
                label="หน้ากว้างวอลล์"
                value={draft.wallpaper.roll_width}
                suffix="เมตร"
                isLocked={isLocked}
                onChange={(v) => handleDraftChange('wallpaper', 'roll_width', v)}
              />
              <FormulaRow
                label="ความยาวต่อม้วน"
                value={draft.wallpaper.roll_length}
                suffix="เมตร"
                isLocked={isLocked}
                onChange={(v) => handleDraftChange('wallpaper', 'roll_length', v)}
              />
            </section>

            <section>
              <h3 className="text-sm font-bold text-orange-600 uppercase tracking-wider mb-2 border-l-4 border-orange-500 pl-2">
                การคำนวณ (Calculation)
              </h3>
              <FormulaRow
                label="เผื่อตัดทิ้ง (Waste)"
                desc="ระยะที่ตัดทิ้งหัว-ท้าย ต่อแผ่น"
                value={draft.wallpaper.waste_margin}
                suffix="เมตร"
                isLocked={isLocked}
                onChange={(v) => handleDraftChange('wallpaper', 'waste_margin', v)}
              />
            </section>

            <div className="p-4 rounded-xl bg-orange-50 border border-orange-100 text-orange-800 text-xs leading-relaxed">
              ℹ️ <strong>Strip Method:</strong> ระบบใช้วิธีคำนวณแบบ "นับแผ่น" (Strip Counting) ซึ่งแม่นยำกว่าการคำนวณพื้นที่
            </div>
          </div>
        )}

        {/* AREA */}
        {activeTab === 'area' && (
          <div className="space-y-8 pb-8">
            <section>
              <h3 className="text-sm font-bold text-teal-600 uppercase tracking-wider mb-2 border-l-4 border-teal-500 pl-2">
                มู่ลี่ / ฉาก / มุ้ง
              </h3>
              <FormulaRow
                label="แปลง ตร.ม. -> ตร.ล."
                desc="ตัวคูณสำหรับแปลงหน่วยพื้นที่"
                value={draft.area.sqm_to_sqyd}
                suffix="เท่า"
                isLocked={isLocked}
                onChange={(v) => handleDraftChange('area', 'sqm_to_sqyd', v)}
              />
              <FormulaRow
                label="คิดขั้นต่ำ (Minimum)"
                desc="ถ้าคำนวณได้น้อยกว่านี้ ให้ปัดขึ้นมาเท่านี้"
                value={draft.area.min_yield}
                suffix="ตร.ล."
                isLocked={isLocked}
                onChange={(v) => handleDraftChange('area', 'min_yield', v)}
              />
            </section>
          </div>
        )}

        {/* Factory Reset Zone */}
        {!isLocked && (
          <div className="mt-8 pt-8 border-t border-border flex justify-center pb-8">
            <button
              onClick={handleReset}
              className="text-xs text-muted-foreground flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              คืนค่ามาตรฐานโรงงาน (Factory Reset)
            </button>
          </div>
        )}

      </div>
    </Modal>
  );
};