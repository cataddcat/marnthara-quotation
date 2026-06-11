import React from 'react';
import { CurtainItemInput } from '@/types';
import { Switch } from '@/components/ui/Switch';
import { BarChart3 } from 'lucide-react';
import { ProModeControl } from './ProModeControl';

interface CurtainCostAnalysisProps {
  formData: CurtainItemInput;
  onChange: (field: keyof CurtainItemInput, val: string | number | boolean) => void;
}

/**
 * proSlot เฉพาะม่านใน ItemSummaryCard — toggle "วิเคราะห์ต้นทุน" (`_is_pro_mode`)
 * + dashboard มืด (ProModeControl). ม่านทุนหลายถัง (ผ้า/ราง/แรง) breakdown จึงยาว
 * ต้องพับได้ — ต่างจาก CostReadout 2 บรรทัดของอีก 7 ฟอร์มที่ทุนถังเดียว (อ่านอย่างเดียว
 * เหมือนกันทั้งคู่) — DESIGN.md §8 ⑤. (ย้ายจาก PriceSummary ที่ unify เข้า ItemSummaryCard — Phase C)
 */
export const CurtainCostAnalysis: React.FC<CurtainCostAnalysisProps> = ({
  formData,
  onChange,
}) => {
  const isProMode = formData._is_pro_mode || false;

  return (
    <div className="space-y-3 pt-4 border-t border-border">
      {/* แถว toggle — กดได้ทั้งแถว สไตล์เดียวกับ override row ของ ItemSummaryCard */}
      <div
        className="flex items-center justify-between gap-3 cursor-pointer select-none active:opacity-80 transition-opacity"
        onClick={() => onChange('_is_pro_mode', !isProMode)}
      >
        <div className="min-w-0">
          <div className="text-sm font-medium text-foreground flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-muted-foreground shrink-0" strokeWidth={1.5} />
            วิเคราะห์ต้นทุน
          </div>
          <div className="text-xs text-muted-foreground leading-tight mt-0.5">
            ดูต้นทุน กำไร และราคาแนะนำ
          </div>
        </div>
        <Switch
          checked={isProMode}
          onCheckedChange={() => {}}
          className="pointer-events-none shrink-0"
        />
      </div>

      {/* Dashboard มืด — เอกลักษณ์ "โหมดโปร" (จงใจ; chrome monochrome, emerald = ค่ากำไร/Live เท่านั้น) */}
      {isProMode && (
        <div className="rounded-xl border border-border overflow-hidden bg-slate-900 text-slate-100 animate-in slide-in-from-top-2 fade-in duration-300">
          <div className="px-4 py-2.5 flex items-center justify-between border-b border-slate-800 bg-slate-950/50">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-3.5 h-3.5 text-slate-300" />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                การวิเคราะห์ต้นทุน
              </span>
            </div>
            <span className="text-xs text-emerald-400/80 flex items-center gap-1">
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </span>
          </div>
          <div className="p-3">
            <ProModeControl formData={formData} onChange={onChange} simpleView={true} />
          </div>
        </div>
      )}
    </div>
  );
};
