import { test, expect } from './fixtures';

const API_CONFIG_STORAGE_KEY = 'crashlab:api-config';
const PAGE_READY_TIMEOUT_MS = 120000;

async function openApiSettings(page: import('@playwright/test').Page) {
  await page.goto('/settings/api', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('API Configuration')).toBeVisible({
    timeout: PAGE_READY_TIMEOUT_MS,
  });
  await expect(page.locator('#api-backend-url')).toBeVisible({ timeout: PAGE_READY_TIMEOUT_MS });
}

test.describe('Settings page localStorage persistence', () => {
  test.setTimeout(180000);

  test('persists API configuration across reload', async ({ page }) => {
    await openApiSettings(page);

    await page.locator('#api-backend-url').fill('https://api.example.com');
    await page.locator('#api-rate-limit-max').fill('42');
    await page.locator('#api-rate-limit-window').fill('30');
    await page.locator('#api-config-save').click();

    await expect(page.locator('#api-config-saved-indicator')).toBeVisible();
    await expect
      .poll(async () =>
        page.evaluate((key) => {
          const raw = localStorage.getItem(key);
          return raw ? JSON.parse(raw).backendUrl : null;
        }, API_CONFIG_STORAGE_KEY),
      )
      .toBe('https://api.example.com');

    await page.reload();
    await expect(page.locator('#api-backend-url')).toHaveValue('https://api.example.com', {
      timeout: PAGE_READY_TIMEOUT_MS,
    });
    await expect(page.locator('#api-rate-limit-max')).toHaveValue('42');
    await expect(page.locator('#api-rate-limit-window')).toHaveValue('30');
    await expect(page.getByText('API configured')).toBeVisible();
  });

  test('persists API configuration across navigation', async ({ page }) => {
    await openApiSettings(page);

    await page.locator('#api-backend-url').fill('https://persisted.example.com');
    await page.locator('#api-config-save').click();
    await expect(page.locator('#api-config-saved-indicator')).toBeVisible();

    await page.goto('/settings');
    await page.goto('/settings/api', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('#api-backend-url')).toHaveValue('https://persisted.example.com', {
      timeout: PAGE_READY_TIMEOUT_MS,
    });
    await expect(page.getByText('Connected to https://persisted.example.com')).toBeVisible();
  });

  test('rejects invalid backend URL and does not persist it', async ({ page }) => {
    await openApiSettings(page);

    await page.locator('#api-backend-url').fill('not-a-valid-url');
    await page.locator('#api-config-save').click();

    await expect(page.getByText(/valid URL/i)).toBeVisible();
    await expect(page.locator('#api-config-saved-indicator')).toHaveCount(0);

    const stored = await page.evaluate((key) => localStorage.getItem(key), API_CONFIG_STORAGE_KEY);
    expect(stored === null || !stored.includes('not-a-valid-url')).toBe(true);
  });

  test('resets configuration and clears localStorage', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(
      ([key, value]) => localStorage.setItem(key, value),
      [
        API_CONFIG_STORAGE_KEY,
        JSON.stringify({
          backendUrl: 'https://reset-me.example.com',
          rateLimitMaxRequests: 55,
          rateLimitWindowSeconds: 15,
        }),
      ] as const,
    );

    await openApiSettings(page);
    await expect(page.locator('#api-backend-url')).toHaveValue('https://reset-me.example.com');

    await page.locator('#api-config-reset').click();
    await expect(page.locator('#api-backend-url')).toHaveValue('');
    await expect
      .poll(async () => page.evaluate((key) => localStorage.getItem(key), API_CONFIG_STORAGE_KEY))
      .toBeNull();
  });
});
