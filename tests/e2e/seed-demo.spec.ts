import { test, expect } from '@playwright/test';

// โหลด state ผ่าน localStorage (รูปแบบ zustand persist) → ตรวจว่า render ห้อง+รายการ
// seed เฉพาะ rooms → field อื่น merge กับ default (shopConfig/discount คงเดิม)
const STORAGE_KEY = 'marnthara.input.v6.4';

const seededState = {
  state: {
    rooms: [
      {
        id: 'r1',
        name: 'ห้องนั่งเล่น',
        is_suspended: false,
        room_defaults: {},
        items: [
          {
            id: 'i1',
            type: 'curtain',
            width_m: '2',
            height_m: '2',
            style: 'จีบ',
            layer_mode: 'main',
            code: 'F1',
            price_per_m_raw: '350',
            enable_set_price: true,
            set_price_override: 1000,
          },
        ],
      },
    ],
  },
  version: 1,
};

test.describe('Seeded state', () => {
  test('preloaded room + item render from localStorage', async ({ page }) => {
    await page.addInitScript(
      ([key, value]) => window.localStorage.setItem(key as string, value as string),
      [STORAGE_KEY, JSON.stringify(seededState)]
    );

    await page.goto('/');

    // ห้องที่ seed โผล่ (dot ใช้ aria-label = ชื่อห้อง) + ไม่ใช่หน้า empty
    await expect(page.getByText('เริ่มโครงการใหม่')).toHaveCount(0);
    await expect(page.getByLabel('ห้องนั่งเล่น')).toBeVisible();
    // ItemCard ของรายการผ้าม่าน
    await expect(page.getByText('ผ้าม่าน').first()).toBeVisible();
  });
});
