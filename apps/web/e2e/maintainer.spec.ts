import { test, expect } from './fixtures';

const MAINTAINER_STORAGE_KEY = 'crashlab:maintainer-mode';

test.describe('Maintainer Mode Toggling', () => {
  test.setTimeout(120000);

  test('should toggle maintainer mode and grant access to the maintainer route', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/settings/);

    const toggle = page.locator('[data-testid="maintainer-mode-toggle"]');
    await expect(toggle).toBeAttached({ timeout: 60000 });
    await toggle.click({ force: true });
    await expect
      .poll(async () => page.evaluate((key) => localStorage.getItem(key), MAINTAINER_STORAGE_KEY))
      .toBe('true');

    await page.goto('/maintainer', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/maintainer/);
    await expect(page.getByRole('heading', { name: /Maintainer Dashboard/i })).toBeAttached({
      timeout: 60000,
    });
  });

  test('redirects away from maintainer route when mode is disabled', async ({ page }) => {
    await page.addInitScript((key) => {
      window.localStorage.removeItem(key);
    }, MAINTAINER_STORAGE_KEY);

    await page.goto('/maintainer', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/$/, { timeout: 60000 });
  });

  test('grants access to maintainer dashboard when mode is enabled via storage', async ({ page }) => {
    await page.addInitScript((key) => {
      window.localStorage.setItem(key, 'true');
    }, MAINTAINER_STORAGE_KEY);

    await page.goto('/maintainer', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/maintainer/);
    await expect(page.getByRole('heading', { name: /Maintainer Dashboard/i })).toBeAttached({
      timeout: 60000,
    });
  });
});
