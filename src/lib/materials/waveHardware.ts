// src/lib/materials/waveHardware.ts
// ════════════════════════════════════════════════════════════════════════════
// 〰️ ม่านลอน — ลูกล้อ/กระดุม (Wave roller + snap hardware, snap tape TW14.5)
// ════════════════════════════════════════════════════════════════════════════
//
// ม่านลอน (snap-tape TW14.5, ระยะลอน 14.5 ซม.) ต้องสั่ง "ลูกล้อ" (rollers) และ
// "กระดุม/สแน็ป" (snaps) ตามความยาวราง — นอกเหนือจากเทปลอน (เมตร) ที่คำนวณอยู่แล้ว
//
// ฟังก์ชันบริสุทธิ์ (pure) อ่านค่าคงที่จาก FORMULAS.wave (single source of truth)
// ค่าคาดหวัง + dataset proof อยู่ที่ waveHardware.test.ts
//
//   N₁ (ลูกล้อต่อ 1 ฝั่ง) = 2 × (round(รางซม. / roller_pitch_cm) + 1)
//   T  (ลูกล้อรวม)        = 2 × N₁
//   กระดุม               = T            (1:1 กับลูกล้อ)
//   ผ้า (หลา)            = floor((T / fabric_rollers_per_yard + fabric_hem_yards), 2dp)
//
// ════════════════════════════════════════════════════════════════════════════

import { FORMULAS } from '@/config/formulas';

/** การแยกผ้าม่านลอน: เก็บข้างเดียว (1 ตับ) vs แยกกลาง (2 ตับ) */
export type WaveSplit = 'one-way' | 'two-way';

export interface WaveHardware {
  /** จำนวนตับผ้า: one-way = 1, two-way = 2 */
  panels: number;
  /** ลูกล้อต่อ 1 ตับ (two-way = N₁, one-way = T) */
  rollersPerPanel: number;
  /** ลูกล้อรวม (T) */
  totalRollers: number;
  /** กระดุม/สแน็ป — 1:1 กับลูกล้อ (= T) */
  snaps: number;
  /** ผ้า (หลา) — cross-check กับ pricing เท่านั้น ไม่โชว์ใน UI */
  fabricYards: number;
  /** รางยาวเกิน max_track_cm → ควรเพิ่มขาค้ำ/แยกราง */
  oversize: boolean;
}

const EMPTY: WaveHardware = {
  panels: 0,
  rollersPerPanel: 0,
  totalRollers: 0,
  snaps: 0,
  fabricYards: 0,
  oversize: false,
};

/**
 * แปลง opening_style ของม่าน → การแยกตับ (split) สำหรับม่านลอน
 *
 * ⚠️ ฟอร์มม่านจริง (StyleSection) บันทึกค่าเป็นภาษาไทย: 'เก็บข้างเดียว' / 'แยกกลาง'
 *    (ค่าเก่า 'เก็บซ้าย' / 'เก็บขวา' ยังรองรับเป็น legacy) ส่วน 'side' / 'center' เป็น convention
 *    ของ OPENING_STYLES (ฉากกั้น) + ข้อมูล import เก่า — one-way คือ "เก็บข้างเดียว", อย่างอื่น (รวม default) = two-way
 */
export function waveSplitFromOpening(openingStyle?: string): WaveSplit {
  if (
    openingStyle === 'side' ||
    openingStyle === 'เก็บข้างเดียว' ||
    openingStyle === 'เก็บซ้าย' ||
    openingStyle === 'เก็บขวา'
  ) {
    return 'one-way';
  }
  return 'two-way';
}

/**
 * คำนวณลูกล้อ/กระดุม/ผ้า ของม่านลอน 1 รายการ
 *
 * @param trackCm ความยาวราง (ซม.) = ความกว้างหน้าต่าง × 100
 * @param split   เก็บข้างเดียว (one-way, 1 ตับ) หรือ แยกกลาง (two-way, 2 ตับ)
 */
export function calcWaveHardware(trackCm: number, split: WaveSplit): WaveHardware {
  if (!(trackCm > 0)) return { ...EMPTY };

  const { roller_pitch_cm, fabric_rollers_per_yard, fabric_hem_yards, max_track_cm } =
    FORMULAS.wave;

  // N₁ = ลูกล้อต่อฝั่ง, T = ลูกล้อรวม (เท่ากันทั้ง one-way/two-way — แยกกลางแค่หารตับ)
  const n1 = 2 * (Math.round(trackCm / roller_pitch_cm) + 1);
  const totalRollers = 2 * n1;

  const panels = split === 'one-way' ? 1 : 2;
  const rollersPerPanel = totalRollers / panels;

  // floor ทศนิยม 2 ตำแหน่ง (6.9367 → 6.93) ให้ตรง dataset ผลิตจริง
  const fabricYards =
    Math.floor((totalRollers / fabric_rollers_per_yard + fabric_hem_yards) * 100) / 100;

  return {
    panels,
    rollersPerPanel,
    totalRollers,
    snaps: totalRollers, // 1:1 กับลูกล้อ
    fabricYards,
    oversize: trackCm > max_track_cm,
  };
}
