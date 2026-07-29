import { test, expect } from './fixtures';

const API_CONFIG_STORAGE_KEY = 'crashlab:api-config';

test.describe('Settings page localStorage persistence', () => {
  test.setTimeout(120000);

  test('persists API configuration across reload', async ({ page }) => {
    await page.goto('/settings/api');
    const url = page.locator('#api-backend-url');
    await expect(url).toBeAttached({ timeout: 60000 });
    await url.fill('https://api.example.com');
    await page.locator('#api-rate-limit-max').fill('42');
    await page.locator('#api-rate-limit-window').fill('30');
    await page.locator('#api-config-save').click({ force: true });

    await expect
      .poll(async () =>
        page.evaluate((key) => {
          const raw = localStorage.getItem(key);
          return raw ? JSON.parse(raw).backendUrl : null;
        }, API_CONFIG_STORAGE_KEY),
      )
      .toBe('https://api.example.com');

    await page.reload();
    await expect(url).toHaveValue('https://api.example.com', { timeout: 60000 });
  });
});
