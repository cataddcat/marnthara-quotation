import { test, expect } from '@playwright/test';

// State persistence: เพิ่มห้อง → reload → ห้องยังอยู่ (zustand persist + localStorage)
test.describe('Persistence', () => {
  test('room survives page reload', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'เพิ่มห้องแรก' }).click();
    await expect(page.getByText('เริ่มโครงการใหม่')).toHaveCount(0);

    await page.reload();

    // หลัง reload ยังไม่กลับไปหน้า empty (state rehydrate จาก localStorage)
    await expect(page.getByText('เริ่มโครงการใหม่')).toHaveCount(0);
  });
});
