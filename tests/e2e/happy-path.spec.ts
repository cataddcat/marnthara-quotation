import { test, expect } from '@playwright/test';

// Happy path: เริ่มจากแอพว่าง → เพิ่มห้องแรก → เปิดเมนูหลัก
test.describe('Happy path', () => {
  test('empty state → add first room → open main menu', async ({ page }) => {
    await page.goto('/');

    // 1. Empty state แสดง
    await expect(page.getByText('เริ่มโครงการใหม่')).toBeVisible();

    // 2. เพิ่มห้องแรก → empty state หาย
    await page.getByRole('button', { name: 'เพิ่มห้องแรก' }).click();
    await expect(page.getByText('เริ่มโครงการใหม่')).toHaveCount(0);

    // 3. เปิดเมนูหลักผ่าน dropdown "เมนูนำทาง" (ยุบ หน้าหลัก/เมนู/ภาพรวม) → drawer แสดงหัวข้อ "เมนูหลัก"
    await page.getByRole('button', { name: 'เมนูนำทาง' }).click();
    await page.getByRole('button', { name: 'เมนู', exact: true }).click();
    await expect(page.getByText('เมนูหลัก')).toBeVisible();
    await expect(page.getByText('การเงินของงาน')).toBeVisible();
  });
});
