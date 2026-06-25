import { test, expect, type Page } from '@playwright/test';

// Modal smoke — เปิดทุกเมนู modal ในเบราว์เซอร์จริง แล้วยืนยันว่า "ไม่มี runtime error (uncaught)"
// + เมนูหลักปิด (= modal เปิดจริง). โฟกัส regression ของ modal ที่ไม่ได้อยู่ใน E2E happy-path
// (โดยเฉพาะ JobsModal / CustomerModal / CustomerDirectoryModal ที่เพิ่งแก้)

let pageErrors: string[] = [];

test.beforeEach(async ({ page }) => {
  pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  await page.goto('/');
  await page.getByRole('button', { name: 'เพิ่มห้องแรก' }).click();
});

async function openMenu(page: Page) {
  await page.getByRole('button', { name: 'เมนูนำทาง' }).click();
  await page.getByRole('menuitem', { name: 'เมนู', exact: true }).click();
  await expect(page.getByText('เมนูหลัก')).toBeVisible();
}

// title = ข้อความที่ต้องเห็นหลังเปิด (ใส่เฉพาะที่มั่นใจ — ที่เหลือเช็คแค่ "เมนูปิด + ไม่มี error")
const CASES: { item: string; title?: string }[] = [
  { item: 'งานทั้งหมด', title: 'งานทั้งหมด' }, // JobsModal 🔴
  { item: 'ฐานข้อมูลลูกค้า', title: 'ฐานข้อมูลลูกค้า' }, // CustomerDirectoryModal 🔴
  { item: 'ลูกค้างานนี้', title: 'ข้อมูลลูกค้า (Customer Info)' }, // CustomerModal 🔴
  { item: 'ภาพรวมห้อง' },
  { item: 'จัดการส่วนลด' },
  { item: 'การเงินของงาน' },
  { item: 'สินค้า & ราคา' },
  { item: 'โครงสร้างต้นทุน' },
  { item: 'อธิบายสูตร' },
  { item: 'ตั้งค่าร้านค้า' },
  { item: 'คัดลอกสรุป' },
  { item: 'สำรองข้อมูล' },
  { item: 'Lookbook' },
];

for (const c of CASES) {
  test(`เปิด "${c.item}" → modal เปิด, ไม่มี runtime error`, async ({ page }) => {
    await openMenu(page);
    await page.getByText(c.item, { exact: true }).click();
    // เมนูหลักปิด = มี modal เปิดทับ
    await expect(page.getByText('เมนูหลัก')).toHaveCount(0);
    if (c.title) {
      await expect(page.getByText(c.title, { exact: true }).first()).toBeVisible();
    }
    expect(pageErrors, pageErrors.join('\n')).toEqual([]);
  });
}
