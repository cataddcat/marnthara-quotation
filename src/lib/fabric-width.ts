// src/lib/fabric-width.ts
// ────────────────────────────────────────────────────────────────────────────
// หน้ากว้างผ้าม่าน (fabric face width) — กติกาจากเจ้าของร้าน (มิ.ย. 2026):
//   • หน้าผ้ามาตรฐานในตลาด: 2.8 / 3.2 / 3.4 เมตร (รหัสผ้าควรมีขนาดหน้ากำกับ — ใช้ field
//     `variant` ของ catalog เก็บ เช่น "หน้า 3.2")
//   • ปกติผ้าวิ่งแนวนอน (railroad) — ความสูงม่านถูกจำกัดด้วยหน้าผ้า ลบเผื่อเย็บ 30 ซม.
//     เช่น หน้า 2.8 ตัดเย็บได้สูงสุด ~2.50 ม. · หน้า 3.4 ได้ ~3.10 ม.
//   • สูงเกินหน้าผ้ากว้างสุด → หมุนผ้า 90° ตัดเย็บแบบต่อผ้า "ด้านข้าง" (ไม่ต่อตามความสูง)
//
// ใช้แจ้งเตือนในฟอร์มม่านว่า "ความสูงนี้ต้องใช้ผ้าหน้าเท่าไหร่" — informational เท่านั้น
// (ไม่กระทบสูตรปริมาณผ้า ซึ่งคิดจากความกว้าง×ความฟู ตาม convention ผ้าวิ่งแนวนอน)
// ────────────────────────────────────────────────────────────────────────────

/** หน้าผ้ามาตรฐาน (เมตร) — เรียงเล็ก→ใหญ่ */
export const FABRIC_FACE_WIDTHS = [2.8, 3.2, 3.4] as const;

/** เผื่อเย็บ (เมตร): หน้าผ้า − 0.30 = ความสูงตัดเย็บสูงสุด */
export const SEW_ALLOWANCE_M = 0.3;

/** ความสูงตัดเย็บสูงสุดของหน้าผ้าหนึ่ง ๆ เช่น 2.8 → 2.5 */
export const maxCutHeight = (faceWidth: number): number =>
  Math.round((faceWidth - SEW_ALLOWANCE_M) * 100) / 100;

export interface FabricWidthAdvice {
  /** 'ok' = มีหน้าผ้ามาตรฐานที่ตัดได้ · 'rotate' = สูงเกินทุกหน้า ต้องหมุนผ้า 90° · 'none' = ยังไม่มีความสูง */
  kind: 'ok' | 'rotate' | 'none';
  /** หน้าผ้าเล็กสุดที่ตัดความสูงนี้ได้ (เฉพาะ kind 'ok') */
  recommendedWidth?: number;
  /** ข้อความพร้อมแสดงใต้ช่องความสูง */
  message: string;
}

/** คำแนะนำหน้าผ้าตามความสูงม่าน (เมตร) */
export function fabricWidthAdvice(heightM: number): FabricWidthAdvice {
  if (!(heightM > 0)) return { kind: 'none', message: '' };

  const fit = FABRIC_FACE_WIDTHS.find((w) => heightM <= maxCutHeight(w));
  if (fit) {
    return {
      kind: 'ok',
      recommendedWidth: fit,
      message: `ใช้ผ้าหน้า ≥ ${fit} ม. (หน้า ${fit} ตัดได้สูงสุด ${maxCutHeight(fit).toFixed(2)} ม. — เผื่อเย็บ 30 ซม.)`,
    };
  }

  const widest = FABRIC_FACE_WIDTHS[FABRIC_FACE_WIDTHS.length - 1];
  return {
    kind: 'rotate',
    message: `สูงเกินหน้าผ้ากว้างสุด ${widest} ม. (ตัดได้ ~${maxCutHeight(widest).toFixed(2)} ม.) → ต้องหมุนผ้า 90° เย็บต่อด้านข้าง`,
  };
}
