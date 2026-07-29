import { test, expect } from './fixtures';

const MAINTAINER_STORAGE_KEY = 'crashlab:maintainer-mode';
const SETTINGS_READY_TIMEOUT_MS = 120000;
const ROUTE_TIMEOUT_MS = 30000;

async function openSettings(page: import('@playwright/test').Page) {
  await page.goto('/settings');
  await expect(
    page.getByRole('switch', { name: 'Toggle maintainer mode' }),
  ).toBeVisible({ timeout: SETTINGS_READY_TIMEOUT_MS });
}

test.describe('Maintainer Mode Toggling', () => {
  test.setTimeout(150000);

  test('should toggle maintainer mode and grant access to the maintainer route', async ({ page }) => {
    await openSettings(page);

    const maintainerNavLink = page.locator('nav a[href="/maintainer"]');
    await expect(maintainerNavLink).not.toBeVisible();

    const toggleButton = page.getByRole('switch', { name: 'Toggle maintainer mode' });
    await expect(toggleButton).toBeVisible();
    await expect(toggleButton).toHaveAttribute('aria-checked', 'false');

    await toggleButton.click();

    await expect(toggleButton).toHaveAttribute('aria-checked', 'true');
    await expect(maintainerNavLink).toBeVisible();
    await expect
      .poll(async () => page.evaluate((key) => localStorage.getItem(key), MAINTAINER_STORAGE_KEY))
      .toBe('true');

    await maintainerNavLink.click();
    await expect(page).toHaveURL(/.*\/maintainer/, { timeout: ROUTE_TIMEOUT_MS });
    await expect(page.getByRole('heading', { name: 'Maintainer Dashboard' })).toBeVisible({
      timeout: ROUTE_TIMEOUT_MS,
    });
  });

  test('redirects away from maintainer route when mode is disabled', async ({ page }) => {
    // Ensure storage is cleared before the maintainer page hydrates.
    await page.addInitScript((key) => {
      window.localStorage.removeItem(key);
    }, MAINTAINER_STORAGE_KEY);

    await page.goto('/maintainer');
    await expect(page).toHaveURL(/\/$/, { timeout: ROUTE_TIMEOUT_MS });
    await expect(page.locator('nav a[href="/maintainer"]')).not.toBeVisible();
  });

  test('grants access to maintainer dashboard when mode is enabled via storage', async ({ page }) => {
    // Seed storage before hydration so useMaintainerMode reads the enabled flag.
    await page.addInitScript((key) => {
      window.localStorage.setItem(key, 'true');
    }, MAINTAINER_STORAGE_KEY);

    await page.goto('/maintainer');
    await expect(page).toHaveURL(/.*\/maintainer/, { timeout: ROUTE_TIMEOUT_MS });
    await expect(page.getByRole('heading', { name: 'Maintainer Dashboard' })).toBeVisible({
      timeout: ROUTE_TIMEOUT_MS,
    });
    await expect(page.locator('nav a[href="/maintainer"]')).toBeVisible();
  });
});


