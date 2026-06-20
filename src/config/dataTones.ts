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
  cost: 'text-rose-600 dark:text-rose-400 eeert:text-rose-800 dark-vivid:text-rose-300',
  // dimension eeert pushed to -900: max contrast (AAA+) on the soft blue pill (EEERT pilot)
  dimension: 'text-blue-700 dark:text-blue-400 eeert:text-blue-900',
  neutral: 'text-foreground',
  muted: 'text-muted-foreground',
};

// ── Round 4: number-colour taxonomy — เลิกกฎ "monochrome chrome" ────────────────────
// ทุก "ประเภทตัวเลข" มีสีเฉพาะ เพื่อให้ผู้ใช้กวาดตาแล้วรู้ความหมายทันที. ตัวเลขที่เคยเป็นสีเทา
// (จำนวน/นับ · เลขเงิน-ทุนอ้างอิง) ได้โทนหมวดของมัน. คุมเป็น "EEERT-first": overlay แค่ตัวแปร eeert:
// ทับสีฐานเดิม → light/dark/signature เหมือนเดิมเป๊ะ, โผล่สีเฉพาะใน EEERT. graduate = เลื่อนสีลง base.
// hue ตรงกับทะเบียน (เงิน=emerald · ทุน=rose) ส่วน count=slate (โทนใหม่ "นับจำนวน" — เงียบแต่แยกออก).
export const NUM_TONE_EEERT = {
  count: 'eeert:text-slate-700', // จำนวน/นับ: N รายการ · จุด · ผนัง · ม้วน · เส้น · ชุด
  money: 'eeert:text-emerald-800', // เลขเงิน/ราคาอ้างอิงที่เคยเทา (เช่น ราคางาน)
  cost: 'eeert:text-rose-800', // เลขทุนอ้างอิงที่เคยเทา (เช่น ทุนที่รู้)
} as const;

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

// eeert: ดันลึกขึ้นให้ accent วัสดุอ่านชัด บน chrome เทา-ขาว — ดันถึง AAA+ (ตัวเลขวัสดุบน pill นำร่อง
// EEERT): fabric -900 (เดิม -700 ≈ 6.6:1 ตก AAA), sheer/wallpaper/area -800. base (ธีมอื่น) คงเดิม.
export const MATERIAL_ACCENT: Record<MaterialKind, string> = {
  // base -600/-700 + dark: ให้ผ่าน AA บน plate -50 ในธีม light/signature (เดิม -500/-400 = 2.5–3.9:1 ตก;
  // pilot EEERT ถูกจูนไว้แล้วแต่ default light ตกหล่น). คง fabric เข้มกว่า sheer (ทึบ/โปร่ง). dot/pill คง -500/-400.
  fabric: 'text-violet-700 dark:text-violet-400 eeert:text-violet-900',
  sheer: 'text-violet-600 dark:text-violet-300 eeert:text-violet-800',
  wallpaper: 'text-orange-700 dark:text-orange-400 eeert:text-orange-900',
  area: 'text-teal-700 dark:text-teal-400 eeert:text-teal-800',
  hardware: 'text-sky-700 dark:text-sky-400 eeert:text-sky-800',
};

/** pill วัสดุ (EEERT pilot) — พื้นโทนนุ่มไร้ขอบ คู่กับ MATERIAL_ACCENT (text) บนตัวเลขวัสดุใน ItemCard.
 *  คุมการมองเห็นด้วย runtime flag (theme==='eeert') ที่ caller จึงเป็นคลาสล้วน. */
export const MATERIAL_PILL: Record<MaterialKind, string> = {
  fabric: 'bg-violet-500/10',
  sheer: 'bg-violet-500/10',
  wallpaper: 'bg-orange-500/10',
  area: 'bg-teal-500/10',
  hardware: 'bg-sky-500/10',
};

// contrast plate วัสดุ (Round 6 — DESIGN §2) — bordered + bg -50 ที่ "รีเซ็ตสีพื้น" สำหรับพื้นสี
// (Colorful EEERT) ที่พิลล์โปร่ง (MATERIAL_PILL) กลืน. คู่กับ DATA_TONE_PLATE; ใช้แทน pill เมื่อวางบนพื้น tint
// (hue เลข ≈ hue พื้น). แยกตัวด้วย ขอบ + bg ทึบ + text เข้ม ไม่ใช่ tint บาง ๆ.
export const MATERIAL_PLATE: Record<MaterialKind, string> = {
  fabric: 'bg-violet-50 border-violet-200 dark:bg-violet-950/40 dark:border-violet-900 eeert:border-violet-300',
  sheer: 'bg-violet-50 border-violet-200 dark:bg-violet-950/40 dark:border-violet-900 eeert:border-violet-300',
  wallpaper: 'bg-orange-50 border-orange-200 dark:bg-orange-950/40 dark:border-orange-900 eeert:border-orange-300',
  area: 'bg-teal-50 border-teal-200 dark:bg-teal-950/40 dark:border-teal-900 eeert:border-teal-300',
  hardware: 'bg-sky-50 border-sky-200 dark:bg-sky-950/40 dark:border-sky-900 eeert:border-sky-300',
};

// ── Round 5: number-contrast contract — กัน "สีกลืน" ด้วย plate ────────────────────────
// โทนตัวเลขแบ่ง 2 ชั้นตามความปลอดภัยของ contrast:
//  • self-safe (เข้มพอ อ่านโล่งๆ ได้): money · cost · dimension · count → ใส่ plate เฉพาะตอนเป็น hero
//  • PLATE-REQUIRED (โทนกลาง กลืนถ้าวางโล่ง): วัสดุทุกชนิด + amber → ใส่ plate "เสมอ"
//    (pill = MATERIAL_PILL/ DATA_TONE_PILL  bg-tone-500/10  คู่กับ text -700/-800)
// กฎสากล: ตัวเลข "สี" ที่วางบนพื้นมีสี/ tint ใดๆ → ใส่ plate เสมอ (ห้ามสีทับ tint แบบโล่ง).
// plate กัน "กลืน" ได้เพราะ (1) text เข้ม -700/-800 ผ่าน AAA + (2) กล่อง tint ให้ตัวเลขมี "พื้นของตัวเอง".
export const PLATE_REQUIRED_MATERIALS: readonly MaterialKind[] = [
  'fabric',
  'sheer',
  'wallpaper',
  'area',
  'hardware',
];

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

// ── เมนูหลัก (nav): icon tile + หัวกลุ่ม "ลงสีตามหมวด" — nav ก็มีสี ไม่ใช่ chrome เทา (DESIGN §2) ──
// ทุกแถวเมนูมีไอคอน "สีสด" ตามกลุ่ม (ไม่ใช่ bg-muted): tile = pill tint + icon accent · text = หัวกลุ่ม ·
// bar = แถบหน้าหัวกลุ่ม. eeert: ดัน text ลึกให้ AAA บนหน้ากระดาษเทา/การ์ดขาว. (label/desc ของรายการคงนิวทรัล)
export type MenuGroup = 'jobs' | 'deliver' | 'money' | 'system';
// หัวกลุ่ม (h3): แถบ + ข้อความ สีประจำกลุ่ม
export const MENU_GROUP_TONE: Record<MenuGroup, { bar: string; text: string }> = {
  jobs: { bar: 'bg-indigo-500', text: 'text-indigo-700 dark:text-indigo-400 eeert:text-indigo-800' },
  deliver: { bar: 'bg-sky-500', text: 'text-sky-700 dark:text-sky-400 eeert:text-sky-700' },
  money: { bar: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-400 eeert:text-emerald-800' },
  system: { bar: 'bg-orange-500', text: 'text-orange-700 dark:text-orange-400 eeert:text-orange-800' },
};

// icon tile "ต่อรายการ" — สีตามความหมาย (per-item semantic): หมวด "ราคา & เงิน" ใช้ data tone จริงตาม §2.1
// (วัสดุ=violet · ส่วนลด=amber · เงิน=emerald · ทุน=rose) เพื่อให้ "เงิน=เขียว · ทุน=แดง" กวาดตาแล้วรู้ทันที;
// กลุ่มอื่นใช้สี identity ประจำกลุ่ม (ไม่หลอกตาว่าเครื่องมือระบบสำคัญ). eeert: ดันลึกให้ AAA.
export type MenuIconTone =
  | 'jobs'
  | 'deliver'
  | 'system' // identity ประจำกลุ่ม A/B/D
  | 'material'
  | 'discount'
  | 'money'
  | 'cost'; // semantic data tone (§2.1) — กลุ่ม C
export const MENU_ICON_TONE: Record<MenuIconTone, string> = {
  jobs: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 eeert:text-indigo-800',
  deliver: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 eeert:text-sky-700',
  system: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 eeert:text-orange-800',
  material: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 eeert:text-violet-800',
  discount: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 eeert:text-amber-800',
  money: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 eeert:text-emerald-800',
  cost: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 eeert:text-rose-800',
};
