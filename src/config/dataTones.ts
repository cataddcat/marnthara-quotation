// src/config/dataTones.ts
//
// Machine-readable mirror ของทะเบียนสีความหมาย DESIGN.md §2.1 — "หนึ่งสีมีเจ้าของเดียวทั้งแอพ"
// (คู่กับ typography.ts ที่ mirror §1). ทุก component อ่าน hue จากไฟล์นี้ ห้าม hardcode ซ้ำ:
//   - Data tone   → Metric, Input[isDimension], แถวค่าใน ItemCard/สรุป
//   - Material    → vault (คลังรหัส), FabricSection, MaterialSummaryModal
// คลาสทุกตัวเป็น string literal คงที่เพื่อให้ Tailwind JIT เก็บครบ.

/** โทนของ "ค่า/ตัวเลข" — เงิน · ทุน · มิติ (DESIGN.md §2.1 ชั้น Data tone) */
export type DataTone = 'money' | 'cost' | 'dimension' | 'neutral' | 'muted';

// เงิน = emerald, ทุน = rose, มิติ = BLUE แท้ (ห้าม sky/cyan — กันอ่านเพี้ยนเป็นเขียว
// และ sky ถูกยกให้หมวดอุปกรณ์ในคลังรหัสผู้เดียว). Dark variants สว่างพอบนพื้นมืด.
// eeert: ดันลึกอีกขั้น (-800) ให้ตัวอักษรข้อมูล/ตัวเลขถึง AAA (≥7:1) บนการ์ดขาว + plate -50.
export const DATA_TONE_TEXT: Record<DataTone, string> = {
  money: 'text-emerald-700 dark:text-emerald-400 eeert:text-emerald-800',
  cost: 'text-rose-600 dark:text-rose-400 eeert:text-rose-800',
  dimension: 'text-blue-700 dark:text-blue-400 eeert:text-blue-800',
  neutral: 'text-foreground',
  muted: 'text-muted-foreground',
};

// pill ฮีโร่ค่าตัวเลข (EEERT pilot) — พื้นโทนนุ่ม "ไร้ขอบ" แบบเดียวกับชิป (rounded-full bg-500/10)
// แทน plate กรอบ; สี text มาจาก DATA_TONE_TEXT (-700/-800 ใน eeert) → contrast AAA บนพื้น -500/10.
// คุมการมองเห็นด้วย runtime flag (theme==='eeert') ใน Metric ไม่ใช่ eeert: variant จึงเป็นคลาสล้วน.
export const DATA_TONE_PILL: Record<DataTone, string> = {
  money: 'bg-emerald-500/10',
  cost: 'bg-rose-500/10',
  dimension: 'bg-blue-500/10',
  neutral: 'bg-muted',
  muted: 'bg-muted/60',
};

// plate ฮีโร่ (Metric size="lg") — เน้นด้วย bg+border สีโทนเดียวกัน แทนการขยายขนาด (18px cap).
// eeert: ขอบเข้มขึ้น (-300) ให้ plate แยกขอบชัดบนการ์ดขาว/หน้ากระดาษเทา (คู่กับ text -800).
export const DATA_TONE_PLATE: Record<DataTone, string> = {
  money: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900 eeert:border-emerald-300',
  cost: 'bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:border-rose-900 eeert:border-rose-300',
  dimension: 'bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:border-blue-900 eeert:border-blue-300',
  neutral: 'bg-muted border-border',
  muted: 'bg-muted/60 border-border',
};

/** ช่องกรอกมิติ (Input[isDimension]) — ตัวเลขเด่นโทนมิติ ใช้ที่ primitive เดียว ห้าม caller แปะเอง */
export const DIMENSION_INPUT_CLASS =
  'text-lg font-bold text-blue-700 dark:text-blue-400 eeert:text-blue-800 bg-blue-500/10';

/** หมวดวัสดุ (DESIGN.md §2.1 ชั้น Material) — ผ้า=violet · วอลเปเปอร์=orange · พื้นที่=teal · อุปกรณ์=sky */
export type MaterialKind = 'fabric' | 'sheer' | 'wallpaper' | 'area' | 'hardware';

// eeert: ดันลึกขึ้นให้ accent วัสดุอ่านชัด (AAA) บน chrome เทา-ขาว
export const MATERIAL_ACCENT: Record<MaterialKind, string> = {
  fabric: 'text-violet-500 eeert:text-violet-700',
  sheer: 'text-violet-400 eeert:text-violet-600',
  wallpaper: 'text-orange-500 eeert:text-orange-600',
  area: 'text-teal-600 dark:text-teal-400 eeert:text-teal-700',
  hardware: 'text-sky-600 dark:text-sky-400 eeert:text-sky-700',
};

/** จุดนำหน้า (dot) คู่กับ MATERIAL_ACCENT */
export const MATERIAL_DOT: Record<MaterialKind, string> = {
  fabric: 'bg-violet-500',
  sheer: 'bg-violet-400',
  wallpaper: 'bg-orange-500',
  area: 'bg-teal-500',
  hardware: 'bg-sky-500',
};

/**
 * ถังต้นทุน 3 ถัง (วัสดุ/แรง/อุปกรณ์ — HANDOFF taxonomy) ใน FinancialDashboard:
 * วัสดุ(ผ้า)=violet · อุปกรณ์/ราง=sky ตามชั้น Material; แรง/บริการ=fuchsia (hue เฉพาะ ไม่ชนทะเบียน)
 */
export const COST_BUCKET_DOT = {
  material: 'bg-violet-500',
  labor: 'bg-fuchsia-500',
  hardware: 'bg-sky-500',
} as const;

// ── สถานะงาน (Job lifecycle) — แกนความหมายใหม่ของกระดาน "งานทั้งหมด" ───────────────
// ไล่โทนตามไปป์ไลน์: ใหม่(เทา) → วัด(ฟ้า) → เสนอ(เหลือง) → ยืนยัน(คราม) → ผลิต(ม่วง) → จบ(เขียว=สำเร็จ)
// คลาส literal คงที่ (Tailwind JIT). key = JobStatusKey ใน enums.ts
// eeert: ดันข้อความ -800 + ขอบ -300 ให้ป้ายสถานะถึง AAA บนหน้ากระดาษเทา/การ์ดขาว
export const JOB_STATUS_CHIP: Record<string, string> = {
  lead: 'bg-muted text-muted-foreground border-border',
  measured:
    'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900 eeert:text-blue-800 eeert:border-blue-300',
  quoted:
    'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900 eeert:text-amber-800 eeert:border-amber-300',
  confirmed:
    'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900 eeert:text-indigo-800 eeert:border-indigo-300',
  production:
    'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-900 eeert:text-violet-800 eeert:border-violet-300',
  done: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900 eeert:text-emerald-800 eeert:border-emerald-300',
};

/** จุดนำหน้าสถานะ (dot) คู่กับ JOB_STATUS_CHIP */
export const JOB_STATUS_DOT: Record<string, string> = {
  lead: 'bg-muted-foreground/50',
  measured: 'bg-blue-500',
  quoted: 'bg-amber-500',
  confirmed: 'bg-indigo-500',
  production: 'bg-violet-500',
  done: 'bg-emerald-500',
};
