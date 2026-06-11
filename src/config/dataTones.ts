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
export const DATA_TONE_TEXT: Record<DataTone, string> = {
  money: 'text-emerald-700 dark:text-emerald-400',
  cost: 'text-rose-600 dark:text-rose-400',
  dimension: 'text-blue-700 dark:text-blue-400',
  neutral: 'text-foreground',
  muted: 'text-muted-foreground',
};

// plate ฮีโร่ (Metric size="lg") — เน้นด้วย bg+border สีโทนเดียวกัน แทนการขยายขนาด (18px cap)
export const DATA_TONE_PLATE: Record<DataTone, string> = {
  money: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900',
  cost: 'bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:border-rose-900',
  dimension: 'bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:border-blue-900',
  neutral: 'bg-muted border-border',
  muted: 'bg-muted/60 border-border',
};

/** ช่องกรอกมิติ (Input[isDimension]) — ตัวเลขเด่นโทนมิติ ใช้ที่ primitive เดียว ห้าม caller แปะเอง */
export const DIMENSION_INPUT_CLASS =
  'text-lg font-bold text-blue-700 dark:text-blue-400 bg-blue-500/10';

/** หมวดวัสดุ (DESIGN.md §2.1 ชั้น Material) — ผ้า=violet · วอลเปเปอร์=orange · พื้นที่=teal · อุปกรณ์=sky */
export type MaterialKind = 'fabric' | 'sheer' | 'wallpaper' | 'area' | 'hardware';

export const MATERIAL_ACCENT: Record<MaterialKind, string> = {
  fabric: 'text-violet-500',
  sheer: 'text-violet-400',
  wallpaper: 'text-orange-500',
  area: 'text-teal-600 dark:text-teal-400',
  hardware: 'text-sky-600 dark:text-sky-400',
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
