// src/lib/materials/waveHardware.test.ts
// 〰️ ม่านลอน — ลูกล้อ/กระดุม (Wave roller + snap hardware)
// Dataset proof: ถอดสูตรจากฐานข้อมูลผลิตจริง 15 แถว (snap tape TW14.5, ระยะลอน 14.5 ซม.)
//
//   N₁ = 2·(round(W_cm/26.5) + 1) · T = 2·N₁ · กระดุม = T · ผ้า = floor(T/6 + 0.27, 2dp)
//
// สูตรตรง DB: ลูกล้อ 14/15 แถว, ผ้า 8/9 แถว — outlier 2 ตัวเป็น one-way เล็ก/แปลก
// (W=200 → DB 32 vs สูตร 36, ผ้า W=90 → DB 2.80 vs สูตร 2.93) = quirk การผลิต
// ใช้สูตรทั่วไป ไม่ hardcode outlier → document ไว้เป็น case ด้านล่าง

import { describe, it, expect } from 'vitest';
import { calcWaveHardware, waveSplitFromOpening } from './waveHardware';

describe('calcWaveHardware — dataset proof (two-way)', () => {
  // Proof ที่กำหนดในแผน: W=240 → 20+20 / 6.93 · W=380 → 30+30 / 10.27
  it('W=240 ซม. แยกกลาง → 20+20, T=40, กระดุม 40, ผ้า 6.93', () => {
    const r = calcWaveHardware(240, 'two-way');
    expect(r.totalRollers).toBe(40);
    expect(r.panels).toBe(2);
    expect(r.rollersPerPanel).toBe(20); // N₁ = 20 → 20+20
    expect(r.snaps).toBe(40); // 1:1 กับลูกล้อ
    expect(r.fabricYards).toBe(6.93); // floor(6.9367, 2dp)
    expect(r.oversize).toBe(false);
  });

  it('W=380 ซม. แยกกลาง → 30+30, T=60, กระดุม 60, ผ้า 10.27', () => {
    const r = calcWaveHardware(380, 'two-way');
    expect(r.totalRollers).toBe(60);
    expect(r.panels).toBe(2);
    expect(r.rollersPerPanel).toBe(30); // N₁ = 30 → 30+30
    expect(r.snaps).toBe(60);
    expect(r.fabricYards).toBe(10.27); // (60/6 + 0.27) = 10.27 exact
    expect(r.oversize).toBe(false);
  });

  it('W=90 ซม. → T=16 (ลูกล้อตรง DB)', () => {
    // round(90/26.5)=3 → N₁=8 → T=16
    const r = calcWaveHardware(90, 'two-way');
    expect(r.totalRollers).toBe(16);
    expect(r.snaps).toBe(16);
  });
});

describe('calcWaveHardware — กระดุม 1:1 กับลูกล้อ', () => {
  it.each([120, 150, 200, 240, 300, 380, 450])('W=%i → snaps === totalRollers', (w) => {
    const r = calcWaveHardware(w, 'two-way');
    expect(r.snaps).toBe(r.totalRollers);
  });
});

describe('calcWaveHardware — one-way vs two-way panel split', () => {
  it('ลูกล้อรวม (T) เท่ากันทั้ง one-way และ two-way — ต่างแค่จำนวนตับ', () => {
    const oneWay = calcWaveHardware(240, 'one-way');
    const twoWay = calcWaveHardware(240, 'two-way');
    expect(oneWay.totalRollers).toBe(twoWay.totalRollers); // 40 ทั้งคู่
  });

  it('one-way → 1 ตับ, ลูกล้อทั้งหมดอยู่ตับเดียว', () => {
    const r = calcWaveHardware(240, 'one-way');
    expect(r.panels).toBe(1);
    expect(r.rollersPerPanel).toBe(40); // T ทั้งก้อน
  });

  it('two-way → 2 ตับ, แบ่งครึ่ง (N₁ ต่อตับ)', () => {
    const r = calcWaveHardware(240, 'two-way');
    expect(r.panels).toBe(2);
    expect(r.rollersPerPanel).toBe(20);
  });
});

describe('calcWaveHardware — outlier ที่ document ไว้ (สูตรทั่วไป ไม่ hardcode)', () => {
  it('W=200 one-way → สูตรให้ T=36 (DB ผลิตจริง=32 — quirk one-way เล็ก)', () => {
    // round(200/26.5)=8 → N₁=18 → T=36 ; DB ผลิตจริงลด 4 ตัว เป็น 32
    const r = calcWaveHardware(200, 'one-way');
    expect(r.totalRollers).toBe(36);
  });

  it('W=90 → สูตรให้ผ้า 2.93 (DB ผลิตจริง=2.80 — quirk ชายผ้าผืนเล็ก)', () => {
    // (16/6 + 0.27) = 2.9367 → floor 2dp = 2.93 ; DB=2.80
    const r = calcWaveHardware(90, 'two-way');
    expect(r.fabricYards).toBe(2.93);
  });
});

describe('calcWaveHardware — oversize flag (ราง > 400 ซม.)', () => {
  it('W=400 (= max) → ไม่ oversize', () => {
    expect(calcWaveHardware(400, 'two-way').oversize).toBe(false);
  });
  it('W=401 → oversize', () => {
    expect(calcWaveHardware(401, 'two-way').oversize).toBe(true);
  });
  it('W=450 → oversize', () => {
    expect(calcWaveHardware(450, 'two-way').oversize).toBe(true);
  });
});

describe('calcWaveHardware — guard ค่าผิดปกติ', () => {
  it.each([0, -10, NaN])('trackCm=%s → ทุกค่าเป็น 0', (w) => {
    const r = calcWaveHardware(w, 'two-way');
    expect(r).toEqual({
      panels: 0,
      rollersPerPanel: 0,
      totalRollers: 0,
      snaps: 0,
      fabricYards: 0,
      oversize: false,
    });
  });
});

describe('waveSplitFromOpening — รองรับทั้งค่าฟอร์มไทย และ legacy side/center', () => {
  it.each(['เก็บซ้าย', 'เก็บขวา', 'side'])('"%s" → one-way', (v) => {
    expect(waveSplitFromOpening(v)).toBe('one-way');
  });

  it.each(['แยกกลาง', 'center', '', undefined])('"%s" → two-way (default)', (v) => {
    expect(waveSplitFromOpening(v)).toBe('two-way');
  });
});
