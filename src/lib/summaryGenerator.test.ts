// src/lib/summaryGenerator.test.ts
// ทดสอบตัวสร้างข้อความสรุป (customer / seamstress / purchase_order)

import { describe, it, expect } from 'vitest';
import { generateSummaryText, type SummaryInput } from './summaryGenerator';
import { ITEM_TYPES } from '@/config/enums';
import { fmtTH } from '@/utils/formatters';
import type { Room } from '@/types';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const makeRooms = (): Room[] => [
  {
    id: 'room-a',
    name: 'ห้องนอน',
    is_suspended: false,
    items: [
      {
        type: ITEM_TYPES.CURTAIN,
        id: 'c1',
        width_m: '2.5',
        height_m: '2.8',
        style: 'ลอน',
        layer_mode: 'double',
        code: 'AA1',
        sheer_code: 'SS1',
        price_per_m_raw: '500',
        sheer_price_per_m: '300',
        opening_style: 'แยกกลาง',
        hook_type: 'long',
        rail_color: 'ขาว',
        notes: 'ผ้าตัวอย่าง',
      },
      {
        type: ITEM_TYPES.WALLPAPER,
        id: 'w1',
        widths: ['3', '2'],
        height_m: '2.6',
        price_per_roll: '900',
        install_cost_per_roll: '100',
        wallpaper_code: 'WP9',
      },
      {
        type: ITEM_TYPES.REMOVAL,
        id: 'r1',
        quantity: '2',
        price_per_item: '250',
        description: 'รื้อม่านเก่า',
      },
    ],
  },
  // ห้องที่ถูกระงับ — ต้องถูกข้ามทุกแบบ
  {
    id: 'room-suspended',
    name: 'ห้องเก็บของ',
    is_suspended: true,
    items: [
      {
        type: ITEM_TYPES.CURTAIN,
        id: 'c-skip',
        width_m: '3',
        height_m: '3',
        style: 'จีบ',
        layer_mode: 'main',
        code: 'ZZ9',
      },
    ],
  },
  {
    id: 'room-c',
    name: 'ห้องนั่งเล่น',
    is_suspended: false,
    items: [
      {
        type: ITEM_TYPES.ROLLER_BLIND,
        id: 'a1',
        width_m: '1.5',
        height_m: '2',
        price_sqyd: '450',
        code: 'RB3',
      },
    ],
  },
];

const makeInput = (overrides: Partial<SummaryInput> = {}): SummaryInput => ({
  rooms: makeRooms(),
  customer: { name: 'คุณทดสอบ', phone: '081-111-2222', address: '123 ถนนทดสอบ' },
  shopConfig: { name: 'ร้านม่านธารา', phone: '02-000-0000' },
  totals: {
    grandTotal: 10000,
    discountAmount: 1000,
    vatAmount: 630,
    vatRate: 7,
    finalTotal: 9630,
    discount: { type: 'percent', value: 10, is_enabled: true },
  },
  ...overrides,
});

// ─── customer ────────────────────────────────────────────────────────────────

describe('generateSummaryText — customer', () => {
  it('มีหัวข้อ ข้อมูลลูกค้า และยอดสุทธิ', () => {
    const out = generateSummaryText(makeInput(), 'customer');
    expect(out).toContain('🗓️ สรุปข้อมูล');
    expect(out).toContain('👤 ลูกค้า: คุณทดสอบ');
    expect(out).toContain('📞 โทร: 081-111-2222');
    expect(out).toContain('🏠 ที่อยู่: 123 ถนนทดสอบ');
    expect(out).toContain('🚪 ห้อง: ห้องนอน');
    expect(out).toContain('ผ้าม่าน ลอน (ทึบ&โปร่ง)');
    expect(out).toContain(`💰 *ยอดสุทธิ: ${fmtTH(9630)} บาท*`);
    expect(out).toContain('ร้านม่านธารา');
    expect(out).toContain('โทร: 02-000-0000');
  });

  it('ข้ามห้องที่ถูกระงับ', () => {
    const out = generateSummaryText(makeInput(), 'customer');
    expect(out).not.toContain('ห้องเก็บของ');
    expect(out).not.toContain('จีบ');
  });

  it('โชว์บรรทัดส่วนลด + VAT เมื่อมีค่า', () => {
    const out = generateSummaryText(makeInput(), 'customer');
    expect(out).toContain('ยอดรวมสินค้า:');
    expect(out).toContain('🏷️ ส่วนลด (10%): -' + fmtTH(1000));
    expect(out).toContain('🧾 VAT 7%: +' + fmtTH(630));
  });

  it('ไม่โชว์บรรทัดส่วนลด/VAT เมื่อเป็นศูนย์ แต่ยังมียอดสุทธิ', () => {
    const out = generateSummaryText(
      makeInput({
        totals: {
          grandTotal: 5000,
          discountAmount: 0,
          vatAmount: 0,
          vatRate: 0,
          finalTotal: 5000,
          discount: { type: 'amount', value: 0, is_enabled: false },
        },
      }),
      'customer'
    );
    expect(out).not.toContain('🏷️ ส่วนลด');
    expect(out).not.toContain('VAT');
    expect(out).toContain(`💰 *ยอดสุทธิ: ${fmtTH(5000)} บาท*`);
  });
});

// ─── seamstress ───────────────────────────────────────────────────────────────

describe('generateSummaryText — seamstress', () => {
  it('รวมเฉพาะผ้าม่าน พร้อมรหัสผ้าและขนาด', () => {
    const out = generateSummaryText(makeInput(), 'seamstress');
    expect(out).toContain('🧵 *รายละเอียดสำหรับช่างเย็บผ้า*');
    expect(out).toContain('🚪 ห้อง: ห้องนอน');
    expect(out).toContain('ชุดที่ 1/1');
    expect(out).toContain('ผ้าทึบ: #AA1');
    expect(out).toContain('ผ้าโปร่ง: #SS1');
    expect(out).toContain('กว้าง 2.50 x สูง 2.80 ม.');
    // ไม่รวมวอลเปเปอร์ / มู่ลี่ / ห้องที่ไม่มีผ้าม่าน
    expect(out).not.toContain('ห้องนั่งเล่น');
    expect(out).not.toContain('WP9');
  });

  it('แจ้งเมื่อไม่มีผ้าม่านสำหรับช่าง', () => {
    const rooms: Room[] = [
      {
        id: 'only-wp',
        name: 'ห้องโถง',
        is_suspended: false,
        items: [
          {
            type: ITEM_TYPES.WALLPAPER,
            id: 'w2',
            widths: ['3'],
            height_m: '2.6',
            price_per_roll: '900',
            install_cost_per_roll: '100',
            wallpaper_code: 'WP1',
          },
        ],
      },
    ];
    const out = generateSummaryText(makeInput({ rooms }), 'seamstress');
    expect(out).toContain('ไม่มีรายการสำหรับช่าง');
  });
});

// ─── purchase_order ─────────────────────────────────────────────────────────

describe('generateSummaryText — purchase_order', () => {
  it('มีรายการผ้า/วอลล์/พื้นที่/รื้อถอน ตามรหัส', () => {
    const out = generateSummaryText(makeInput(), 'purchase_order');
    // ผ้า
    expect(out).toContain('✂️ *รายการสั่งซื้อ (ผ้า)*');
    expect(out).toContain('#AA1');
    expect(out).toContain('#SS1');
    expect(out).toContain('หลา');
    // วอลเปเปอร์
    expect(out).toContain('🎨 *รายการสั่งซื้อ (Wallpaper)*');
    expect(out).toContain('#WP9');
    expect(out).toContain('ม้วน');
    // พื้นที่
    expect(out).toContain('ม่านม้วน');
    expect(out).toContain('#RB3');
    // รื้อถอน
    expect(out).toContain('📦 *รายการรื้อถอน/ค่าแรง*');
    expect(out).toContain('รื้อม่านเก่า');
  });

  it('ข้ามห้องที่ถูกระงับ', () => {
    const out = generateSummaryText(makeInput(), 'purchase_order');
    expect(out).not.toContain('#ZZ9');
  });
});
