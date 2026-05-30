import { test, expect } from '@playwright/test';

// PWA: manifest + service worker artifacts (build จริงผ่าน vite-plugin-pwa)
test.describe('PWA', () => {
  test('manifest link present + scope = "/"', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('link[rel="manifest"]')).toHaveCount(1);

    const manifest = await page.request.get('/manifest.webmanifest');
    expect(manifest.ok()).toBeTruthy();
    const json = await manifest.json();
    expect(json.scope ?? json.start_url ?? '/').toContain('/');
  });

  test('service worker file (sw.js) ถูก generate และเข้าถึงได้', async ({ page }) => {
    const sw = await page.request.get('/sw.js');
    expect(sw.ok()).toBeTruthy();
  });
});
