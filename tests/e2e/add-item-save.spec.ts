import { test, expect, Page } from '@playwright/test';

// Regression: "ไม่บันทึก" — ขนาด/ความสูง หายตอนเพิ่มสินค้า
// ต้นเหตุเดิม: เลือกประเภทสินค้า "หลัง" พิมพ์ค่า → ฟอร์ม remount (setFormKey+1) → ค่าที่พิมพ์ถูกล้าง
// ฟิกซ์: flow "เลือกประเภทก่อน" + guard re-select ประเภทเดิม + normalize ทุกเส้นทางบันทึก
const STORAGE_KEY = 'marnthara.input.v6.4';

const seededState = {
  state: {
    rooms: [{ id: 'r1', name: 'ห้องนั่งเล่น', is_suspended: false, items: [] }],
  },
  version: 2,
};

const readItems = async (page: Page) => {
  const raw = await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY);
  return JSON.parse(raw || '{}')?.state?.rooms?.[0]?.items ?? [];
};

const seed = async (page: Page) => {
  await page.addInitScript(
    ([k, v]) => window.localStorage.setItem(k as string, v as string),
    [STORAGE_KEY, JSON.stringify(seededState)]
  );
  await page.goto('/');
};

// เปิด add → เลือกประเภท "ผ้าม่าน" (flow ใหม่: เลือกประเภทก่อนจึงมีฟอร์ม)
const openAddCurtain = async (page: Page) => {
  await page.getByRole('button', { name: 'เพิ่มสินค้า' }).first().click();
  // หน้าเลือกประเภทต้องขึ้นก่อน (pill ประเภทสินค้า) — ยังไม่มีช่องกรอกขนาด
  const curtainPill = page.getByRole('button', { name: 'ผ้าม่าน', exact: true });
  await expect(curtainPill).toBeVisible();
  await curtainPill.click();
  await expect(page.getByLabel('กว้าง (W)')).toBeVisible();
};

test('เพิ่มผ้าม่าน → กรอก กว้าง/สูง → บันทึก & ปิด → เก็บค่า normalize ครบ', async ({ page }) => {
  await seed(page);
  await openAddCurtain(page);

  await page.getByLabel('กว้าง (W)').fill('190');
  await page.getByLabel('สูง (H)').fill('278');
  await page.getByRole('button', { name: 'บันทึก', exact: true }).click();

  await expect.poll(async () => (await readItems(page)).length).toBeGreaterThan(0);
  const item = (await readItems(page))[0];
  expect(item?.width_m, 'กว้าง normalize 190→1.90').toBe('1.90');
  expect(item?.height_m, 'สูง normalize 278→2.78 (ต้องไม่หาย)').toBe('2.78');
});

test('กรอกขนาดแล้วแตะ "เปลี่ยน" เลือกประเภทเดิมซ้ำ → ฟอร์ม re-hydrate ค่ากลับมา + ข้อมูลไม่หาย (regression ต้นเหตุ)', async ({
  page,
}) => {
  await seed(page);
  await openAddCurtain(page);

  await page.getByLabel('กว้าง (W)').fill('190');
  await page.getByLabel('สูง (H)').fill('278');

  // draft ถูก autosave ลง store แล้ว (Save-First) ก่อนเปลี่ยนประเภท
  await expect.poll(async () => (await readItems(page)).length).toBeGreaterThan(0);

  // แตะชิปประเภทสินค้า (ป้าย "ประเภทสินค้า … เปลี่ยน") → กลับหน้ากริด → เลือก "ผ้าม่าน" ซ้ำ
  // → ฟอร์ม re-hydrate ค่าจาก draft กลับมา (ไม่เห็นฟอร์มเปล่า)
  await page.getByRole('button', { name: /ประเภทสินค้า/ }).click();
  await page.getByRole('button', { name: 'ผ้าม่าน', exact: true }).click();

  // ช่องความสูงต้องยังมีค่า (re-hydrate จาก draft → normalize เป็น 2.78)
  await expect(page.getByLabel('สูง (H)')).not.toHaveValue('');

  // ข้อมูลใน store ต้องยังครบ (normalize) — ไม่หายจากการเปลี่ยนประเภทซ้ำ
  // (ปุ่ม "บันทึก" ขึ้นเมื่อมีการแก้เท่านั้น — resume เฉย ๆ ไม่ต้องกด เพราะ autosave เก็บไว้แล้ว)
  const item = (await readItems(page))[0];
  expect(item?.width_m).toBe('1.90');
  expect(item?.height_m, 'สูงต้องยังถูกบันทึกหลังเลือกประเภทซ้ำ').toBe('2.78');
});

test('autosave สร้าง draft ก่อน แล้วค่อยกรอกความสูง → ความสูงต้องไม่หาย (เคสจริงของผู้ใช้)', async ({
  page,
}) => {
  await seed(page);
  await openAddCurtain(page);

  // กรอก "กว้าง" แล้วรอให้ auto-save สร้าง draft ก่อน (debounce 400ms) — จุดที่ store เคยได้ id
  // ไม่ตรงกับที่ ItemModal จำไว้ → การอัปเดตครั้งถัดไป (ความสูง) วิ่งหา id ไม่เจอ → หายเงียบ ๆ
  await page.getByLabel('กว้าง (W)').fill('190');
  await page.waitForTimeout(700);
  // แล้วค่อยกรอก "ความสูง" + รอ auto-save อัปเดต draft เดิม
  await page.getByLabel('สูง (H)').fill('278');
  await page.waitForTimeout(700);
  await page.getByRole('button', { name: 'บันทึก', exact: true }).click();

  await expect.poll(async () => (await readItems(page)).length).toBeGreaterThan(0);
  const items = await readItems(page);
  expect(items.length, 'ต้องมีรายการเดียว (ไม่เกิด draft ซ้ำจาก id ไม่ตรง)').toBe(1);
  expect(items[0]?.width_m).toBe('1.90');
  expect(items[0]?.height_m, 'ความสูงต้องถูกบันทึกแม้ auto-save สร้าง draft ไปก่อนแล้ว').toBe(
    '2.78'
  );
});

test('ปิดด้วย Escape (ไม่กดบันทึก) → ค่าที่ autosave ต้อง normalize (ไม่ค้างค่าดิบ)', async ({
  page,
}) => {
  await seed(page);
  await openAddCurtain(page);

  await page.getByLabel('กว้าง (W)').fill('190');
  await page.getByLabel('สูง (H)').fill('278');
  await page.keyboard.press('Escape');

  await expect.poll(async () => (await readItems(page)).length).toBeGreaterThan(0);
  const item = (await readItems(page))[0];
  expect(item?.width_m, 'กว้างต้อง normalize ตอนปิด').toBe('1.90');
  expect(item?.height_m, 'สูงต้อง normalize ตอนปิด (ไม่ใช่ "278")').toBe('2.78');
});
