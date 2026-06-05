// src/config/formulas.ts
// ════════════════════════════════════════════════════════════════════════════
// 📚 ไฟล์ส่วนกลางสำหรับสูตรคำนวณทั้งหมดในระบบ Marnthara
// ════════════════════════════════════════════════════════════════════════════
//
// แก้ไฟล์นี้ที่เดียว → build → แอพใช้ค่าใหม่ทันที (ไม่มี UI ให้ user แก้ runtime)
// ห้ามใส่ logic ในไฟล์นี้ — แค่ค่า constants + comment อธิบาย
//
// ดูเอกสารแบบเต็มได้ที่ Modal "อธิบายสูตร" ใน MainMenu ของแอพ
// (FormulaDocsModal render ค่าจากไฟล์นี้ + เนื้อหาสูตรที่ใช้)
// ════════════════════════════════════════════════════════════════════════════

// ─── Types ──────────────────────────────────────────────────────────────────

export interface WaveSpacing {
  /** ระยะกระดุมบนเทปลอน (ซม.) เช่น '14.5', '16' */
  spacing: string;
  /** ตัวคูณผ้าที่ใช้ (เช่น 2.7 = ใช้ผ้า 2.7 เท่าของกว้างหน้าต่าง) */
  multiplier: number;
  /** คำอธิบายที่แสดงในเมนูเลือก เช่น 'ลอนมาตรฐาน' */
  label: string;
}

export interface FormulaConfig {
  curtain: {
    multiplier_pleated: number;
    multiplier_eyelet: number;
    multiplier_roman: number;
    multiplier_wave: number;
    roman_blind_offset: number;
    hem_offset: number;
    yard_conversion: number;
    wave_spacings: WaveSpacing[];
  };
  wallpaper: {
    roll_width: number;
    roll_length: number;
    waste_margin: number;
  };
  area: {
    sqm_to_sqyd: number;
    min_yield: number;
  };
  materials: {
    bracket_spacing: number;
    bracket_double_multiplier: number;
    eyelet_spacing: number;
    pin_spacing: number;
    pin_extra: number;
    roman_sets_per_window: number;
    rod_brackets_per_set: number;
  };
  wave: {
    roller_pitch_cm: number;
    fabric_rollers_per_yard: number;
    fabric_hem_yards: number;
    max_track_cm: number;
  };
}

// ─── Values ─────────────────────────────────────────────────────────────────

export const FORMULAS: FormulaConfig = {
  // ─── 🧵 ผ้าม่าน (Curtain) ────────────────────────────────────────────────
  curtain: {
    /**
     * ตัวคูณผ้าม่าน (Fullness Multiplier) ตาม style
     * - ลอน: ใช้ค่าจาก wave_spacings ด้านล่าง (multiplier_wave เป็น fallback)
     * - จีบ / ตาไก่ / พับ: ใช้ค่าด้านล่าง
     *
     * 📐 มาตรฐานสากล: ม่านจีบ 2.0-2.5, ลอน 2.7-2.8, ตาไก่ 2.3-2.7
     */
    multiplier_pleated: 2.3,
    multiplier_eyelet: 2.3,
    multiplier_roman: 1.5,
    multiplier_wave: 2.7,

    /**
     * เผื่อชายผ้า (Hem Offset, เมตร)
     * รวมริม 4 ด้าน (×0.05) + ซ้อนกลาง (0.10) = 0.30 ม.
     */
    hem_offset: 0.30,

    /**
     * เผื่อเย็บม่านพับ Roman (เมตร)
     * ม่านพับใช้สูตรบวกเพิ่ม: meters = (กว้าง × multiplier_roman) + offset
     */
    roman_blind_offset: 0.45,

    /**
     * แปลงเมตร → หลา (Yard Conversion)
     * สูตร: yards = meters ÷ yard_conversion
     *
     * ⚙️ ค่าปัจจุบัน 0.90 (1 ม. ≈ 1.111 หลา) — เผื่อ shrinkage + ตัดผิด ~9.1%
     * 📐 มาตรฐานสากล: 0.9144 (1 ม. = 1.0936 หลา) — exact conversion
     *
     * ระบบนี้ตั้งใจให้ buffer เพิ่ม เพื่อกันผ้าขาดตอนเย็บจริง
     */
    yard_conversion: 0.90,

    /**
     * ตารางลอน (Wave Spacing Catalog)
     * เพิ่ม spacing/multiplier ใหม่ได้ที่นี่ → UI แสดง PillButton อัตโนมัติ
     */
    wave_spacings: [
      { spacing: '14.5', multiplier: 2.7, label: 'ลอนมาตรฐาน' },
      { spacing: '16',   multiplier: 2.8, label: 'ลอนลึก' },
      // { spacing: '18', multiplier: 3.0, label: 'ลอนใหญ่' }, // ตัวอย่าง — uncomment เมื่อต้องการ
    ],
  },

  // ─── 📜 วอลเปเปอร์ (Wallpaper) ───────────────────────────────────────────
  wallpaper: {
    /**
     * 🎯 สูตรคำนวณจำนวนม้วน
     *   แผ่นต่อม้วน  = floor(roll_length / (height + waste_margin))
     *   แผ่นที่ต้องการ = ceil(width_total / roll_width)
     *   จำนวนม้วน    = ceil(แผ่นที่ต้องการ / แผ่นต่อม้วน)
     *
     * ⚠️ ถ้าผนังสูงเกินม้วน (height > roll_length) → ระบบจะเตือนใน Financial Dashboard
     */
    roll_width: 0.53,     // เมตร — หน้ากว้างม้วน
    roll_length: 10.0,    // เมตร — ความยาวม้วน
    waste_margin: 0.10,   // เมตร — เผื่อตัด/match pattern
  },

  // ─── 📐 พื้นที่ (มู่ลี่/ฉาก/มุ้ง — Area Items) ──────────────────────────
  area: {
    /**
     * 🎯 สูตรคำนวณพื้นที่
     *   พื้นที่ (ตร.ม.) = กว้าง × สูง
     *   พื้นที่ (ตร.ล.) = ตร.ม. × sqm_to_sqyd
     *   ถ้า < min_yield → ใช้ min_yield (ป้องกัน micro-orders)
     *
     * 📐 มาตรฐานสากล: 1 ตร.ม. = 1.196 ตร.ล. (ระบบใช้ 1.2 ≈ ถูกต้อง)
     */
    sqm_to_sqyd: 1.2,
    min_yield: 1.0, // ตร.ล.
  },

  // ─── 🔧 วัสดุ BOM (Material Bill of Materials) ───────────────────────────
  materials: {
    /**
     * 🎯 ขาแขวน (Brackets)
     *   จำนวน = ceil(กว้าง / bracket_spacing) + 1
     *   DOUBLE (ทึบ+โปร่ง) → × bracket_double_multiplier (รับน้ำหนัก 2 ชั้น)
     *
     * ⚠️ สมมุติฐาน: ระยะ 1.2 ม. เหมาะกับเพดานทั่วไป
     *    เพดานยิปซัม อาจต้อง 0.9 ม. — กรณีพิเศษ adjust manual
     */
    bracket_spacing: 1.2,
    bracket_double_multiplier: 1.3,

    /**
     * 🎯 ห่วงตาไก่ (Eyelet Rings)
     *   จำนวน = ceil(กว้าง × multiplier_wave / eyelet_spacing)
     */
    eyelet_spacing: 0.10, // เมตร — มาตรฐานช่างไทย 10 ซม./ห่วง

    /**
     * 🎯 ตะขอจีบ (Pin Hooks)
     *   จำนวน = ceil(กว้าง × multiplier_pleated / pin_spacing) + pin_extra
     */
    pin_spacing: 0.14, // เมตร — มาตรฐานช่างไทย 14 ซม./ตะขอ
    pin_extra: 4,      // ตะขอเผื่อตอนปลาย

    /**
     * 🎯 ชุดราง Roman
     *   จำนวน = roman_sets_per_window ชุด/หน้าต่าง
     *
     * ⚠️ ถ้าหน้าต่างกว้างมาก → ต้องเพิ่ม manual
     */
    roman_sets_per_window: 1,

    /**
     * 🎯 ขาจับราง ม่านแป๊บ/สอดราง (Rod Brackets)
     *   จำนวน = rod_brackets_per_set ขา/ชุด (คงที่)
     *   ต้นทุน = จำนวน × ราคา/ขา (accessoryCosts.rod_bracket)
     */
    rod_brackets_per_set: 4,
  },

  // ─── 〰️ ม่านลอน — ลูกล้อ/กระดุม (Wave Hardware) ──────────────────────────
  wave: {
    /**
     * 🎯 ลูกล้อ/กระดุม ม่านลอน (Wave roller + snap tape TW14.5)
     *   ม่านลอนสั่ง "ลูกล้อ" (rollers) และ "กระดุม/สแน็ป" (snaps) ตามความยาวราง
     *
     *   N₁ (ลูกล้อต่อ 1 ฝั่ง) = 2 × (round(รางซม. / roller_pitch_cm) + 1)
     *   T  (ลูกล้อรวม)        = 2 × N₁
     *   กระดุม               = T  (1:1 กับลูกล้อ)
     *   ผ้า (หลา, cross-check) = floor((T / fabric_rollers_per_yard + fabric_hem_yards), 2dp)
     *
     * 📐 ถอดจากฐานข้อมูลผลิตจริง (snap tape TW14.5, ระยะลอน 14.5 ซม.)
     *    ตรง dataset 14/15 แถว (ลูกล้อ) + 8/9 แถว (ผ้า) — outlier เป็น one-way เล็ก
     *    (W=200 → DB 32, W=90 ผ้า → DB 2.80) = quirk การผลิต, ใช้สูตรทั่วไป
     *    ดูรายละเอียดที่ src/lib/materials/waveHardware.test.ts
     */
    roller_pitch_cm: 26.5, // ระยะลูกล้อ/ลอน (ซม.) — TW14.5
    fabric_rollers_per_yard: 6, // ลูกล้อ 6 ตัว = ผ้า 1 หลา (ใช้ cross-check ใน test)
    fabric_hem_yards: 0.27, // เผื่อชายผ้า (หลา)
    max_track_cm: 400, // เกินนี้ → เตือนเพิ่มขาค้ำ/แยกราง
  },
};

// ════════════════════════════════════════════════════════════════════════════
// 📝 หมายเหตุสูตรที่ไม่ได้อยู่ในไฟล์นี้ (อยู่ใน config/store อื่น)
// ════════════════════════════════════════════════════════════════════════════
//
// 💰 VAT (ภาษีมูลค่าเพิ่ม) — อยู่ใน ShopProfileSlice.shopConfig.baseVatRate (default 7%)
//    เพราะร้านอาจขอใบกำกับภาษี/ไม่ใบกำกับ ปรับได้ผ่าน "ตั้งค่าร้าน"
//
// 🎯 Target Margin (เกณฑ์กำไร) — อยู่ใน FinancialDashboardModal local state (default 30%)
//    เพราะ user ปรับค่าใน dashboard ได้แบบ ad-hoc ไม่กระทบสูตรอื่น
//
// 🏷️ ราคาผ้า/ค่าแรง/ค่าราง — อยู่ใน CostDataSlice (Vault + Cost Vault)
//    เพราะเป็นข้อมูลที่ owner ใส่เอง ไม่ใช่สูตรตายตัว
// ════════════════════════════════════════════════════════════════════════════
