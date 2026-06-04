import { test, expect, Page } from '@playwright/test';

// แท็บ "สั่งราง" + รูปแบบขนาด W × H + เตือนขา 2 ชั้น (ทึบ+โปร่ง)
const STORAGE_KEY = 'marnthara.input.v6.4';

const seededState = {
  state: {
    rooms: [
      {
        id: 'r1',
        name: 'ห้องนอน',
        is_suspended: false,
        items: [
          {
            id: 'c1',
            type: 'curtain',
            width_m: '2.50',
            height_m: '2.80',
            style: 'ลอน',
            layer_mode: 'double', // ทึบ+โปร่ง → ต้องเตือน "ขา 2 ชั้น"
            code: 'AA1',
            sheer_code: 'SS1',
            price_per_m_raw: '500',
            sheer_price_per_m: '300',
            opening_style: 'แยกกลาง',
          },
        ],
      },
    ],
  },
  version: 2,
};

const seed = async (page: Page) => {
  await page.addInitScript(
    ([k, v]) => window.localStorage.setItem(k as string, v as string),
    [STORAGE_KEY, JSON.stringify(seededState)]
  );
  await page.goto('/');
};

const openCopySummary = async (page: Page) => {
  await page.getByRole('button', { name: 'เมนู', exact: true }).click();
  await page.getByRole('button', { name: /คัดลอกสรุป/ }).click();
  await expect(page.getByLabel('ข้อความสรุป (แก้ไขได้)')).toBeVisible();
};

test('แท็บ "สั่งราง" — ชื่อราง/ขนาด(ซม.)/ลูกล้อ N+N/ขาจับ + เตือนขา 2 ชั้น', async ({ page }) => {
  await seed(page);
  await openCopySummary(page);

  await page.getByRole('button', { name: 'สั่งราง' }).click();
  const text = await page.getByLabel('ข้อความสรุป (แก้ไขได้)').inputValue();

  expect(text).toContain('รายการสั่งราง (ผู้ผลิต)');
  expect(text).toContain('TES101 ( TW14.5 )รางเทปลอนสีขาว เทปสีขาว14.5');
  expect(text).toContain('250'); // 2.5 ม. → 250 ซม.
  expect(text).toContain('แยก'); // สไลด์ (แยกกลาง)
  expect(text).toContain('20+20'); // ลูกล้อ N+N
  expect(text).toContain('6.93'); // ผ้า/ชุด (หลา)
  expect(text).toContain('2ชั้น'); // ทึบ+โปร่ง
  expect(text).toContain('รวมรางที่ต้องสั่ง: 2 เส้น'); // 1 ชุด 2ชั้น = 2 เส้น
});

test('แท็บ "ช่างเย็บ" — ขนาดเป็น W × H (ไม่มีหน่วย) + เตือนขา 2 ชั้น', async ({ page }) => {
  await seed(page);
  await openCopySummary(page);

  await page.getByRole('button', { name: 'ช่างเย็บ' }).click();
  const text = await page.getByLabel('ข้อความสรุป (แก้ไขได้)').inputValue();

  expect(text).toContain('2.50 × 2.80'); // รูปแบบใหม่ ไม่มี "ม."
  expect(text).not.toContain('2.50 x สูง'); // ไม่ใช้รูปแบบเดิม
  expect(text).toContain('⚠️ ใช้ขา 2 ชั้น');
  expect(text).not.toContain('ตะขอ'); // ม่านลอนไม่มีตะขอ สั้น/ยาว
});

test('แท็บ "สั่งราง" — จีบ→ราง M (LTL-101) · พับ→U-2', async ({ page }) => {
  const mixed = {
    state: {
      rooms: [
        {
          id: 'r1',
          name: 'ห้อง',
          is_suspended: false,
          items: [
            {
              id: 'p1',
              type: 'curtain',
              width_m: '2.20',
              height_m: '2.50',
              style: 'จีบ',
              layer_mode: 'main',
              code: 'P1',
              price_per_m_raw: '400',
              opening_style: 'แยกกลาง',
            },
            {
              id: 'rm1',
              type: 'curtain',
              width_m: '0.90',
              height_m: '1.50',
              style: 'พับ',
              layer_mode: 'main',
              code: 'RM1',
              price_per_m_raw: '400',
              opening_style: 'แยกกลาง',
            },
          ],
        },
      ],
    },
    version: 2,
  };
  await page.addInitScript(
    ([k, v]) => window.localStorage.setItem(k as string, v as string),
    [STORAGE_KEY, JSON.stringify(mixed)]
  );
  await page.goto('/');
  await openCopySummary(page);

  await page.getByRole('button', { name: 'สั่งราง' }).click();
  const text = await page.getByLabel('ข้อความสรุป (แก้ไขได้)').inputValue();

  expect(text).toContain('LTL-101 ราง M ประกอบชุด สีขาว'); // จีบ → ราง M
  expect(text).toContain('11+11'); // 220 ซม. → round(220/20)=11
  expect(text).toContain('U-2 รางม่านพับ U-2'); // พับ → U-2
  expect(text).toContain('จำนวนตัว'); // คอลัมน์จำนวนตัว U-2
});
