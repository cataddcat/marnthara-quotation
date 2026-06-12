import React, { useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { CurtainItemInput, ItemData } from '@/types';
// ✅ FIX: เรียกใช้ CostEngine จาก lib/pricing (Centralized Location)
import { CostEngine } from '@/lib/pricing/CostEngine';
import { toNum, fmtTH } from '@/utils/formatters';
import { TrendingUp, Lock, Ruler, Hammer, Scissors } from 'lucide-react';
import { ITEM_TYPES } from '@/config/enums';

interface ProModeControlProps {
  formData: CurtainItemInput;
  onChange: (field: keyof CurtainItemInput, val: string | number | boolean) => void;
  simpleView?: boolean; // ✅ New Prop: ถ้าเป็น true ให้แสดงเฉพาะเนื้อหา (เพราะ Parent คุมเปิดปิดแล้ว)
}

export const ProModeControl: React.FC<ProModeControlProps> = ({
  formData,
  onChange,
  simpleView = false,
}) => {
  // 📡 Subscribe to Store: ดักฟังการเปลี่ยนแปลงของต้นทุน
  // เพื่อให้ Pro Mode คำนวณใหม่ทันทีที่การตั้งค่าหลังบ้านเปลี่ยน (แม้ไม่ได้พิมพ์อะไรในฟอร์ม)
  // (formulas เป็น compile-time constant แล้ว ไม่ต้อง subscribe)
  const { fabricCosts, accessoryCosts, laborCosts, costInclude } = useAppStore();

  // 🔮 คำนวณ Real-time
  // CostEngine.analyze() อ่าน store data ผ่าน useAppStore.getState() — ESLint ไม่เห็น
  // deps ของ store พวกนี้จึงเป็น cache-invalidation hint ที่จงใจใส่ไว้
  const analysis = useMemo(
    () => {
      if (!formData._is_pro_mode) return null;
      return CostEngine.analyze({ ...formData, type: ITEM_TYPES.CURTAIN, id: 'temp' } as ItemData);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [formData, fabricCosts, accessoryCosts, laborCosts, costInclude]
  );

  // กรณี Parent สั่งเปิด (simpleView) หรือ user เปิดเอง -> แสดงผล
  // กรณีปิดอยู่และไม่ใช่ simpleView -> แสดงปุ่มเปิด (Legacy support)
  if (!formData._is_pro_mode && !simpleView) {
    return (
      <div className="flex justify-end mt-2">
        <button
          type="button"
          onClick={() => onChange('_is_pro_mode', true)}
          className="text-xs text-slate-300 flex items-center gap-1 hover:text-white transition-colors"
        >
          <Lock className="w-3 h-3" />
          เปิดโหมดคำนวณจากทุน
        </button>
      </div>
    );
  }
  
  // ถ้า simpleView=true แต่ _is_pro_mode=false (ซึ่งไม่ควรเกิด เพราะ Parent คุม) -> return null
  if (simpleView && !formData._is_pro_mode) return null;
  if (!analysis) return null;

  return (
    // [REFACTOR] เอา Container ออก (ถ้า simpleView) เพราะ Parent จัดการ Style ให้แล้ว
    <div className={simpleView ? "space-y-2" : "mt-3 p-4 bg-slate-900 rounded-xl border border-slate-800 shadow-inner animate-in slide-in-from-top-2"}>
      
      {/* Header (แสดงเฉพาะเมื่อไม่ใช่ Simple View) */}
      {!simpleView && (
        <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
          {/* หัวข้อ = chrome (monochrome) — สี emerald สงวนให้ค่ากำไรด้านล่าง (ทะเบียน §2.1) */}
          <div className="flex items-center gap-2 text-slate-200 font-bold">
            <TrendingUp className="w-4 h-4" />
            <span>วิเคราะห์ต้นทุน (Cost Breakdown)</span>
          </div>
          <button
            type="button"
            onClick={() => onChange('_is_pro_mode', false)}
            className="text-slate-500 hover:text-white transition-colors"
          >
            ปิด
          </button>
        </div>
      )}

      <div className="space-y-2 text-sm font-mono animate-fade-in">
        
        {/* 1. รายละเอียดต้นทุน (Breakdown) */}
        
        {/* ค่าผ้า */}
        <div className="flex justify-between items-center text-slate-300">
          <div className="flex items-center gap-2">
            <Ruler className="w-3 h-3 text-slate-500" />
            <span>
               ผ้า ({analysis.usedQuantity?.toFixed(2)} {analysis.unit}):
            </span>
          </div>
          <span className="text-slate-200">{fmtTH((analysis.fabricCost || 0) + (analysis.sheerCost || 0))}</span>
        </div>

        {/* ค่าราง + อุปกรณ์ — "ไม่นับ" เมื่อปิดสวิตช์ costInclude.rail */}
        <div className="flex justify-between items-center text-slate-400 text-xs">
          <div className="flex items-center gap-2">
             <Hammer className="w-3 h-3 text-slate-600" />
             <span>ค่าราง/อุปกรณ์:</span>
          </div>
          {analysis.excludedComponents.includes('ค่าราง/อุปกรณ์') ? (
            <span className="text-slate-500 italic">ไม่นับ</span>
          ) : (
            <span>{fmtTH((analysis.railCost || 0) + (analysis.accCost || 0))}</span>
          )}
        </div>

        {/* ค่าแรง (ตัดเย็บ+ติดตั้ง) — "ไม่นับ" เมื่อปิดสวิตช์ costInclude.labor */}
        <div className="flex justify-between items-center text-slate-400 text-xs">
          <div className="flex items-center gap-2">
             <Scissors className="w-3 h-3 text-slate-600" />
             <span>ค่าแรง/บริการ:</span>
          </div>
          {analysis.excludedComponents.includes('ค่าเย็บ') ? (
            <span className="text-slate-500 italic">ไม่นับ</span>
          ) : (
            <div className="flex items-center gap-2">
              {analysis.isLaborMinApplied && (
                <span className="text-xs bg-amber-900/30 text-amber-400 px-1.5 py-0.5 rounded border border-amber-700/50">
                  ขั้นต่ำ
                </span>
              )}
              <span>{fmtTH((analysis.laborCost || 0))}</span>
            </div>
          )}
        </div>

        <div className="h-px bg-white/10 my-1" />

        {/* 2. สรุปผล — "บอกเท่าที่รู้": ทุนที่รู้ + ส่วนต่าง ไม่ใช่กำไรบัญชี */}
        <div className="flex justify-between text-rose-300 font-medium">
          <span>ทุนที่รู้รวม:</span>
          <span>{fmtTH(analysis.totalCost)}</span>
        </div>
        <div className="flex justify-between text-emerald-400 font-bold">
          <span>ส่วนต่างจากทุนที่รู้:</span>
          <div className="flex items-center gap-2">
             <span className={analysis.marginPercent < 30 ? "text-amber-400" : "text-emerald-400"}>
                {analysis.marginPercent.toFixed(1)}%
             </span>
             <span>+{fmtTH(analysis.profitAmount)}</span>
          </div>
        </div>
        <div className="text-xs text-slate-500 text-right">
          ยังไม่รวม:{' '}
          {[...analysis.excludedComponents.map((c) => `${c} (ปิดนับ)`), 'ขนส่ง', 'ค่าใช้จ่ายอื่น'].join(' · ')}
        </div>
        <div className="text-xs text-slate-500 text-right mt-1 pt-1 border-t border-dashed border-slate-700">
          แนะนำขายต่อเมตร:{' '}
          <span className="text-emerald-300 font-mono text-sm">
            {Math.ceil(
              analysis.sellingPrice / Math.max(toNum(formData.width_m), 1)
            ).toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
};