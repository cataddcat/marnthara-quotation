/**
 * @module Config/Costs
 * @description Master Data สำหรับราคาทุน (Cost) และค่าแรง (Labor)
 * ข้อมูลส่วนนี้คือความลับทางการค้า (Trade Secrets)
 */

export const COST_MASTERS = {
  // 🧵 1. ค่าแรงเย็บ (Sewing Labor Cost)
  labor: {
    pleated_per_m: 60, // จีบ: 60 บาท/เมตร
    eyelet_per_m: 80, // ตาไก่: 80 บาท/เมตร
    roman_per_sqm: 150, // พับ: 150 บาท/ตร.ม.
    loop_per_m: 70, // ลอน: 70 บาท/เมตร
    sewing_min: 300, // ขั้นต่ำค่าเย็บ
  },

  // 🛠️ 2. ค่าติดตั้ง & ขนส่ง (Installation & Logistics)
  service: {
    install_point: 150, // ค่าติดตั้งต่อจุด
    install_min: 1500, // ค่าติดตั้งขั้นต่ำ ( เหมา )
    transport_base: 500, // ค่ารถ/ค่าน้ำมัน
  },

  // 🏗️ 3. อุปกรณ์ (Accessories Cost)
  accessories: {
    rail_standard: 120, // ราง M (ทุน)
    rail_luxury: 280, // รางโชว์ (ทุน)
    eyelet_ring: 5, // ห่วงตาไก่ (บาท/ตัว)
    tape_wave: 25, // เทปผ้าลอน (บาท/เมตร)
    hook_per_box: 150, // ตะขอ (เฉลี่ย)
  },

  // 📈 4. กำไรมาตรฐาน (Default Margin)
  defaults: {
    margin_percent: 40, // ตั้งเป้ากำไร 40% (GP)
    vat_rate: 0.07,
  },
} as const;
