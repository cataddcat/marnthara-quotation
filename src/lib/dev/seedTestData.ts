// src/lib/dev/seedTestData.ts
// ════════════════════════════════════════════════════════════════════════════
// "ใส่ข้อมูลทดสอบ" (dev only) — กดปุ่มเดียวได้ทั้งรหัสสินค้า + ลูกค้าทดสอบหลายราย
// ────────────────────────────────────────────────────────────────────────────
// 1) 18 รหัสทดสอบ (2 รหัส × 9 หมวดสินค้า) → ลงเป็น material drafts ("ราคาของฉัน")
//    ซึ่ง persist + ขึ้นในตัวเลือกรหัสทุกฟอร์ม + ฉายทุนเข้า vault อัตโนมัติ
//    (useMaterialDraftHydration → route ตาม categoryVault). คีย์หมวด = FAVORITE_CATEGORIES.*
//    เป๊ะ เพราะฟอร์มอ่าน picker ด้วยค่าเหล่านี้ และ categoryVault route ทุนด้วยคีย์เดียวกัน.
// 2) ลูกค้าทดสอบ 3 ราย (งานแยกกัน 3 ก้อนในชั้นวาง) — ต่างกันที่จำนวนห้อง/ชนิดส่วนลด/
//    สถานะงาน/การจ่ายเงิน เพื่อเทสต์ตัวสลับงาน + บอร์ดสถานะ + Financial Dashboard:
//      A = ครบทุกเคส (5 ห้อง · สินค้าครบ 9 ชนิด · suspend ห้อง·ชิ้น / ราคาเหมา / pro mode /
//          3 layer mode / วอลฯ หลายผนัง·สูงเกินม้วน / รหัสไม่รู้ทุน) — สถานะ "เสนอราคา"
//      B = งานเล็ก (2 ห้อง · ไม่มีส่วนลด/เงิน) — สถานะ "ลูกค้าใหม่"
//      C = ปิดการขาย (3 ห้อง · ส่วนลดเป็นบาท · รับเงินครบ) — สถานะ "จบงาน"
//
// idempotent: customer.id คงที่ทั้ง 3 ราย → saveCurrentJob upsert ทับงานเดิม (กดซ้ำไม่เกิดงานซ้ำ);
// flush งานปัจจุบันก่อนเสมอ → งานจริงของผู้ใช้ไม่หาย. หลัง seed เปิดงาน A เป็นงานปัจจุบัน.
// import แบบ dynamic จาก DataModal เท่านั้น (gate import.meta.env.DEV) → prod build ตัดทิ้ง.
// ════════════════════════════════════════════════════════════════════════════

import { useAppStore } from '@/store/useAppStore';
import {
  FAVORITE_CATEGORIES,
  ITEM_TYPES,
  LAYER_MODES,
  EXPENSE_CATEGORIES,
  JOB_STATUS,
  type JobStatusKey,
} from '@/config/enums';
import { OPENING_CENTER, OPENING_SIDE } from '@/lib/opening-style';
import { newUuid } from '@/lib/id';
import { localDateISO } from '@/utils/formatters';
import type { Customer, Discount, Room, ItemData } from '@/types';
import type { ReceiptEntry, ExpenseEntry } from '@/store/slices/PaymentSlice';

// ── 1) รหัสทดสอบ: 2 รหัสต่อหมวด (cost < sellPrice ให้เห็นส่วนต่างเสมอ) ──────────────
export const TEST_CODES: Record<string, { code: string; cost: number; sellPrice: number }[]> = {
  [FAVORITE_CATEGORIES.CURTAIN_MAIN]: [
    { code: 'TST-CM-01', cost: 480, sellPrice: 850 },
    { code: 'TST-CM-02', cost: 550, sellPrice: 950 },
  ],
  [FAVORITE_CATEGORIES.CURTAIN_SHEER]: [
    { code: 'TST-CS-01', cost: 280, sellPrice: 480 },
    { code: 'TST-CS-02', cost: 310, sellPrice: 520 },
  ],
  [FAVORITE_CATEGORIES.WALLPAPER]: [
    { code: 'TST-WP-01', cost: 720, sellPrice: 1200 },
    { code: 'TST-WP-02', cost: 580, sellPrice: 950 },
  ],
  [FAVORITE_CATEGORIES.WOODEN_BLIND]: [
    { code: 'TST-WB-01', cost: 230, sellPrice: 380 },
    { code: 'TST-WB-02', cost: 260, sellPrice: 420 },
  ],
  [FAVORITE_CATEGORIES.ROLLER_BLIND]: [
    { code: 'TST-RB-01', cost: 165, sellPrice: 280 },
    { code: 'TST-RB-02', cost: 190, sellPrice: 320 },
  ],
  [FAVORITE_CATEGORIES.VERTICAL_BLIND]: [
    { code: 'TST-VB-01', cost: 130, sellPrice: 220 },
    { code: 'TST-VB-02', cost: 150, sellPrice: 260 },
  ],
  [FAVORITE_CATEGORIES.ALUMINUM_BLIND]: [
    { code: 'TST-AB-01', cost: 105, sellPrice: 180 },
    { code: 'TST-AB-02', cost: 120, sellPrice: 210 },
  ],
  [FAVORITE_CATEGORIES.PARTITION]: [
    { code: 'TST-PT-01', cost: 270, sellPrice: 450 },
    { code: 'TST-PT-02', cost: 320, sellPrice: 520 },
  ],
  [FAVORITE_CATEGORIES.PLEATED_SCREEN]: [
    { code: 'TST-PS-01', cost: 190, sellPrice: 320 },
    { code: 'TST-PS-02', cost: 220, sellPrice: 360 },
  ],
};

export const TEST_CODE_COUNT = Object.values(TEST_CODES).reduce((n, arr) => n + arr.length, 0);

/** id คงที่ → กดซ้ำแล้ว upsert งานเดิม (ไม่เกิดงานทดสอบซ้ำ ๆ ในชั้นวาง) */
export const TEST_CUSTOMER_IDS = [
  'seed-test-cust-0001',
  'seed-test-cust-0002',
  'seed-test-cust-0003',
] as const;

const seedTestCodes = (): void => {
  const { upsertMaterialDraft } = useAppStore.getState();
  for (const [category, codes] of Object.entries(TEST_CODES)) {
    for (const c of codes) {
      upsertMaterialDraft(category, { code: c.code, cost: c.cost, sellPrice: c.sellPrice });
    }
  }
};

// ── 2) งานทดสอบ ────────────────────────────────────────────────────────────────
interface SeedLiveFields {
  customer: Customer;
  rooms: Room[];
  discount: Discount;
  receipts: ReceiptEntry[];
  expenses: ExpenseEntry[];
  jobStatus: JobStatusKey;
}

const room = (name: string, items: ItemData[], is_suspended = false): Room => ({
  id: newUuid(),
  name,
  items,
  is_suspended,
});

const NO_DISCOUNT: Discount = { type: 'amount', value: 0, is_enabled: false };

// ── งาน A — ครบทุกเคส (5 ห้อง × ครบ 9 ชนิด + เคสยาก) ──────────────────────────────
const buildJobA = (): SeedLiveFields => {
  const customer: Customer = {
    id: TEST_CUSTOMER_IDS[0],
    code: 'TST-001',
    docSeq: 1,
    name: 'ลูกค้าทดสอบ A (ครบทุกเคส)',
    phone: '081-000-0001',
    address: '99/9 หมู่บ้านทดสอบ ถ.ทดสอบ แขวงทดสอบ เขตทดสอบ กรุงเทพฯ 10000',
    taxId: '0000000000000',
    installationAddress: '88/8 คอนโดทดสอบ ชั้น 8 ถ.ติดตั้ง บางนา กทม. 10260',
    useSameAddress: false,
    showInstallationAddress: true,
  };

  const rooms: Room[] = [
    // ห้อง 1 — ผ้าม่าน: double layer · pro mode · ราคาเหมา
    room('ห้องนั่งเล่น', [
      {
        type: ITEM_TYPES.CURTAIN,
        id: newUuid(),
        width_m: 3.0,
        height_m: 2.8,
        style: 'ลอน',
        layer_mode: LAYER_MODES.DOUBLE,
        code: 'TST-CM-01',
        price_per_m_raw: 850,
        sheer_code: 'TST-CS-01',
        sheer_price_per_m: 480,
        rail_color: 'ขาว',
        bracket_color: 'ขาว',
        hook_type: 'long',
        opening_style: OPENING_CENTER,
        button_spacing: '14.5',
        notes: 'ม่าน 2 ชั้น (ทึบ+โปร่ง) — เคส double layer',
      },
      {
        type: ITEM_TYPES.CURTAIN,
        id: newUuid(),
        width_m: 2.0,
        height_m: 2.5,
        style: 'จีบ',
        layer_mode: LAYER_MODES.MAIN,
        code: 'TST-CM-02',
        price_per_m_raw: 950,
        rail_color: 'ดำ',
        bracket_color: 'ดำ',
        hook_type: 'short',
        opening_style: OPENING_SIDE,
        _is_pro_mode: true,
        _cost_fabric: 1200,
        notes: 'Pro mode — override ทุนผ้า 1200',
      },
      {
        type: ITEM_TYPES.CURTAIN,
        id: newUuid(),
        width_m: 2.5,
        height_m: 2.6,
        style: 'ตาไก่',
        layer_mode: LAYER_MODES.MAIN,
        code: 'TST-CM-01',
        price_per_m_raw: 850,
        rail_color: 'บรอนซ์',
        eyelet_color: 'เงิน',
        opening_style: OPENING_CENTER,
        enable_set_price: true,
        set_price_override: 8500,
        notes: 'ราคาเหมา 8,500 — เคส set price override',
      },
    ]),

    // ห้อง 2 — ผ้าม่านเดี่ยว · วอลเปเปอร์หลายผนัง · วอลฯ สูงเกินม้วน (warning)
    room('ห้องนอนใหญ่', [
      {
        type: ITEM_TYPES.CURTAIN,
        id: newUuid(),
        width_m: 2.8,
        height_m: 2.7,
        style: 'ตาไก่',
        layer_mode: LAYER_MODES.MAIN,
        code: 'TST-CM-02',
        price_per_m_raw: 950,
        rail_color: 'ทอง',
        eyelet_color: 'ทอง',
        opening_style: OPENING_CENTER,
        notes: 'ม่านเดี่ยว main',
      },
      {
        type: ITEM_TYPES.WALLPAPER,
        id: newUuid(),
        widths: ['3.50', '2.80', '2.80'],
        height_m: '2.9',
        wallpaper_code: 'TST-WP-01',
        price_per_roll: 1200,
        install_cost_per_roll: 250,
        notes: 'วอลเปเปอร์ 3 ผนัง — เคสหลายผนัง',
      },
      {
        type: ITEM_TYPES.WALLPAPER,
        id: newUuid(),
        widths: ['4.0'],
        height_m: '10.5',
        wallpaper_code: 'TST-WP-02',
        price_per_roll: 950,
        install_cost_per_roll: 200,
        notes: 'สูง 10.5 ม. — เคส warning สูงเกินม้วน',
      },
    ]),

    // ห้อง 3 — area ครบ 6 ชนิด · removal · รหัสไม่รู้ทุน
    room('ห้องอเนกประสงค์', [
      {
        type: ITEM_TYPES.WOODEN_BLIND,
        id: newUuid(),
        width_m: 2.0,
        height_m: 1.8,
        code: 'TST-WB-01',
        price_sqyd: 380,
        fabric_variant: 'ไม้สัก',
        adjustment_side: 'ขวา',
        notes: 'มู่ลี่ไม้',
      },
      {
        type: ITEM_TYPES.ROLLER_BLIND,
        id: newUuid(),
        width_m: 1.5,
        height_m: 1.8,
        code: 'TST-RB-01',
        price_sqyd: 280,
        fabric_variant: 'Blackout',
        adjustment_side: 'ขวา',
        notes: 'ม่านม้วน',
      },
      {
        type: ITEM_TYPES.VERTICAL_BLIND,
        id: newUuid(),
        width_m: 3.0,
        height_m: 2.0,
        code: 'TST-VB-01',
        price_sqyd: 220,
        fabric_variant: 'Dimout',
        opening_style: OPENING_SIDE,
        notes: 'ม่านปรับแสง',
      },
      {
        type: ITEM_TYPES.ALUMINUM_BLIND,
        id: newUuid(),
        width_m: 1.0,
        height_m: 1.5,
        code: 'TST-AB-01',
        price_sqyd: 180,
        fabric_variant: 'Silver 25mm',
        adjustment_side: 'ซ้าย',
        notes: 'มู่ลี่อลูมิเนียม',
      },
      {
        type: ITEM_TYPES.PARTITION,
        id: newUuid(),
        width_m: 4.0,
        height_m: 2.5,
        code: 'TST-PT-01',
        price_sqyd: 450,
        fabric_variant: 'PVC ทึบ',
        opening_style: OPENING_SIDE,
        notes: 'ฉากกั้นห้อง',
      },
      {
        type: ITEM_TYPES.PLEATED_SCREEN,
        id: newUuid(),
        width_m: 1.2,
        height_m: 1.5,
        code: 'TST-PS-01',
        price_sqyd: 320,
        fabric_variant: 'มุ้งจีบ',
        opening_style: OPENING_SIDE,
        notes: 'มุ้งจีบ (คิดต่อ ตร.ม.)',
      },
      {
        type: ITEM_TYPES.REMOVAL,
        id: newUuid(),
        quantity: 3,
        price_per_item: 500,
        description: 'รื้อม่านเก่า 3 จุด พร้อมขนย้าย',
        notes: 'งานบริการ',
      },
      {
        type: ITEM_TYPES.ROLLER_BLIND,
        id: newUuid(),
        width_m: 1.2,
        height_m: 1.6,
        code: 'UNKNOWN-TST',
        price_sqyd: 300,
        fabric_variant: 'รหัสนอกคลัง',
        notes: 'รหัสไม่มีในคลัง → เคส "ไม่ทราบทุน"',
      },
    ]),

    // ห้อง 4 — ทั้งห้อง suspend
    room(
      'ห้องเก็บของ (ทั้งห้อง suspend)',
      [
        {
          type: ITEM_TYPES.CURTAIN,
          id: newUuid(),
          width_m: 2.0,
          height_m: 2.3,
          style: 'หลุยส์',
          layer_mode: LAYER_MODES.MAIN,
          code: 'TST-CM-01',
          price_per_m_raw: 850,
          rail_color: 'ขาว',
          opening_style: OPENING_CENTER,
          notes: 'อยู่ในห้องที่ suspend → ไม่เข้ายอด',
        },
      ],
      true
    ),

    // ห้อง 5 — ม่านโปร่งเดี่ยว (active) · ม่านที่ถูก suspend รายชิ้น
    room('ห้องน้ำ', [
      {
        type: ITEM_TYPES.CURTAIN,
        id: newUuid(),
        width_m: 1.5,
        height_m: 1.8,
        style: 'จีบ',
        layer_mode: LAYER_MODES.SHEER,
        sheer_code: 'TST-CS-02',
        sheer_price_per_m: 520,
        rail_color: 'สแตนเลส',
        opening_style: OPENING_SIDE,
        notes: 'ม่านโปร่งเดี่ยว — เคส layer mode sheer',
      },
      {
        type: ITEM_TYPES.CURTAIN,
        id: newUuid(),
        width_m: 1.2,
        height_m: 1.8,
        style: 'ลอน',
        layer_mode: LAYER_MODES.MAIN,
        code: 'TST-CM-01',
        price_per_m_raw: 850,
        rail_color: 'ขาว',
        button_spacing: '14.5',
        opening_style: OPENING_CENTER,
        is_suspended: true,
        notes: 'ชิ้นนี้ suspend → ไม่เข้ายอด',
      },
    ]),
  ];

  return {
    customer,
    rooms,
    discount: { type: 'percent', value: 5, is_enabled: true },
    receipts: [
      { id: newUuid(), label: 'มัดจำ 50%', amount: 15000, date: localDateISO(), note: 'โอนผ่านธนาคาร' },
      { id: newUuid(), label: 'งวดที่ 2 (วันติดตั้ง)', amount: 8000, date: localDateISO() },
    ],
    expenses: [
      { id: newUuid(), label: 'ค่าผ้า TST-CM-01', amount: 4200, category: EXPENSE_CATEGORIES.MATERIAL, paid: true, date: localDateISO() },
      { id: newUuid(), label: 'ค่าราง + อุปกรณ์', amount: 1800, category: EXPENSE_CATEGORIES.HARDWARE, paid: true, date: localDateISO() },
      { id: newUuid(), label: 'ค่าเย็บช่าง', amount: 3500, category: EXPENSE_CATEGORIES.SEWING, paid: false, date: localDateISO() },
      { id: newUuid(), label: 'ค่าขนส่ง + ติดตั้ง', amount: 1200, category: EXPENSE_CATEGORIES.INSTALL, paid: false, date: localDateISO() },
    ],
    jobStatus: JOB_STATUS.QUOTED,
  };
};

// ── งาน B — งานเล็ก (2 ห้อง · ไม่มีส่วนลด/เงิน · สถานะลูกค้าใหม่) ─────────────────────
const buildJobB = (): SeedLiveFields => ({
  customer: {
    id: TEST_CUSTOMER_IDS[1],
    code: 'TST-002',
    docSeq: 1,
    name: 'ลูกค้าทดสอบ B (งานเล็ก)',
    phone: '082-000-0002',
    address: '12/3 ถ.ทดสอบสอง แขวงสอง เขตสอง กรุงเทพฯ 10100',
    useSameAddress: true,
    showInstallationAddress: false,
  },
  rooms: [
    room('ห้องนอน', [
      {
        type: ITEM_TYPES.CURTAIN,
        id: newUuid(),
        width_m: 2.2,
        height_m: 2.6,
        style: 'จีบ',
        layer_mode: LAYER_MODES.MAIN,
        code: 'TST-CM-02',
        price_per_m_raw: 950,
        rail_color: 'ขาว',
        opening_style: OPENING_CENTER,
        notes: 'ม่านจีบเดี่ยว',
      },
      {
        type: ITEM_TYPES.ROLLER_BLIND,
        id: newUuid(),
        width_m: 1.4,
        height_m: 1.6,
        code: 'TST-RB-02',
        price_sqyd: 320,
        fabric_variant: 'Sunscreen',
        adjustment_side: 'ซ้าย',
        notes: 'ม่านม้วนกรองแสง',
      },
    ]),
    room('ห้องครัว', [
      {
        type: ITEM_TYPES.WALLPAPER,
        id: newUuid(),
        widths: ['2.40'],
        height_m: '2.7',
        wallpaper_code: 'TST-WP-02',
        price_per_roll: 950,
        install_cost_per_roll: 200,
        notes: 'วอลเปเปอร์ผนังเดียว',
      },
    ]),
  ],
  discount: { ...NO_DISCOUNT },
  receipts: [],
  expenses: [],
  jobStatus: JOB_STATUS.LEAD,
});

// ── งาน C — ปิดการขาย (3 ห้อง · ส่วนลดเป็นบาท · รับเงินครบ · สถานะจบงาน) ──────────────
const buildJobC = (): SeedLiveFields => ({
  customer: {
    id: TEST_CUSTOMER_IDS[2],
    code: 'TST-003',
    docSeq: 1,
    name: 'ลูกค้าทดสอบ C (ปิดการขาย)',
    phone: '083-000-0003',
    address: '456 ถ.ทดสอบสาม แขวงสาม เขตสาม กรุงเทพฯ 10200',
    taxId: '1111111111119',
    installationAddress: '789 หมู่บ้านทดสอบสาม ซ.5 นนทบุรี 11000',
    useSameAddress: false,
    showInstallationAddress: true,
  },
  rooms: [
    room('ห้องรับแขก', [
      {
        type: ITEM_TYPES.CURTAIN,
        id: newUuid(),
        width_m: 3.4,
        height_m: 2.9,
        style: 'ลอน',
        layer_mode: LAYER_MODES.DOUBLE,
        code: 'TST-CM-01',
        price_per_m_raw: 850,
        sheer_code: 'TST-CS-01',
        sheer_price_per_m: 480,
        rail_color: 'ขาว',
        button_spacing: '14.5',
        opening_style: OPENING_CENTER,
        notes: 'ม่าน 2 ชั้น ห้องรับแขก',
      },
      {
        type: ITEM_TYPES.WOODEN_BLIND,
        id: newUuid(),
        width_m: 1.8,
        height_m: 1.7,
        code: 'TST-WB-02',
        price_sqyd: 420,
        fabric_variant: 'ไม้โอ๊ค',
        adjustment_side: 'ขวา',
        notes: 'มู่ลี่ไม้โอ๊ค',
      },
    ]),
    room('ห้องนอนใหญ่', [
      {
        type: ITEM_TYPES.CURTAIN,
        id: newUuid(),
        width_m: 2.6,
        height_m: 2.7,
        style: 'ตาไก่',
        layer_mode: LAYER_MODES.MAIN,
        code: 'TST-CM-01',
        price_per_m_raw: 850,
        rail_color: 'ทอง',
        eyelet_color: 'ทอง',
        opening_style: OPENING_CENTER,
        notes: 'ม่านตาไก่',
      },
      {
        type: ITEM_TYPES.VERTICAL_BLIND,
        id: newUuid(),
        width_m: 2.4,
        height_m: 2.0,
        code: 'TST-VB-02',
        price_sqyd: 260,
        fabric_variant: 'Dimout',
        opening_style: OPENING_SIDE,
        notes: 'ม่านปรับแสง',
      },
    ]),
    room('ระเบียง', [
      {
        type: ITEM_TYPES.PLEATED_SCREEN,
        id: newUuid(),
        width_m: 1.6,
        height_m: 2.0,
        code: 'TST-PS-02',
        price_sqyd: 360,
        fabric_variant: 'มุ้งจีบ',
        opening_style: OPENING_SIDE,
        notes: 'มุ้งจีบกันยุง',
      },
      {
        type: ITEM_TYPES.REMOVAL,
        id: newUuid(),
        quantity: 2,
        price_per_item: 400,
        description: 'รื้อมุ้งเก่า 2 จุด',
        notes: 'งานบริการ',
      },
    ]),
  ],
  discount: { type: 'amount', value: 1000, is_enabled: true },
  receipts: [{ id: newUuid(), label: 'ชำระเต็มจำนวน', amount: 42000, date: localDateISO(), note: 'ปิดงานแล้ว' }],
  expenses: [
    { id: newUuid(), label: 'ค่าผ้า + วัสดุ', amount: 9800, category: EXPENSE_CATEGORIES.MATERIAL, paid: true, date: localDateISO() },
    { id: newUuid(), label: 'ค่าเย็บ + ติดตั้ง', amount: 5200, category: EXPENSE_CATEGORIES.SEWING, paid: true, date: localDateISO() },
  ],
  jobStatus: JOB_STATUS.DONE,
});

/** งานทดสอบทั้งหมด เรียง A→B→C (A = งานที่จะเปิดเป็นงานปัจจุบันหลัง seed) */
const buildTestJobs = (): SeedLiveFields[] => [buildJobA(), buildJobB(), buildJobC()];

/**
 * ใส่ข้อมูลทดสอบทั้งหมด (รหัส + ลูกค้า 3 ราย) แล้วเปิดงาน A เป็นงานปัจจุบัน. คืนสรุปให้ toast.
 * เส้นทางเดียวกับ DataModal.applyRestore: flush งานปัจจุบัน → เขียน live → saveCurrentJob ต่อ 1 งาน.
 */
export const seedTestData = (): { codes: number; customers: number; rooms: number } => {
  // 1) flush งานปัจจุบันลงชั้นวางก่อน (no-op ถ้างานเปล่า) — กันงานผู้ใช้หาย
  useAppStore.getState().saveCurrentJob();

  // 2) รหัสทดสอบ → material drafts
  seedTestCodes();

  // 3) เขียนแต่ละงานเข้า live แล้ว save เข้า "งานทั้งหมด" (upsert id เดิมถ้า seed ซ้ำ)
  const jobs = buildTestJobs();
  for (const job of jobs) {
    useAppStore.setState({
      customer: job.customer,
      rooms: job.rooms,
      discount: job.discount,
      receipts: job.receipts,
      expenses: job.expenses,
      jobStatus: job.jobStatus,
    });
    useAppStore.getState().saveCurrentJob();
  }

  // 4) เปิดงาน A (งานครบทุกเคส) เป็นงานปัจจุบัน
  useAppStore.getState().switchJob(TEST_CUSTOMER_IDS[0]);

  const totalRooms = jobs.reduce((n, j) => n + j.rooms.length, 0);
  return { codes: TEST_CODE_COUNT, customers: jobs.length, rooms: totalRooms };
};
