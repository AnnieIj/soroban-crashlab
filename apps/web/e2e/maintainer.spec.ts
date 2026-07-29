import { test, expect } from './fixtures';

const MAINTAINER_STORAGE_KEY = 'crashlab:maintainer-mode';

test.describe('Maintainer Mode Toggling', () => {
  test.setTimeout(120000);

  test('should toggle maintainer mode and grant access to the maintainer route', async ({ page }) => {
    await page.goto('/settings');
    await expect(page).toHaveURL(/\/settings/);
    await expect(page.locator('h1')).toContainText('Settings', { timeout: 60000 });

    const toggle = page.getByRole('switch', { name: 'Toggle maintainer mode' });
    await expect(toggle).toBeAttached({ timeout: 60000 });
    await toggle.click({ force: true });
    await expect(toggle).toHaveAttribute('aria-checked', 'true');

    await page.goto('/maintainer');
    await expect(page).toHaveURL(/\/maintainer/);
    await expect(page.locator('h1')).toContainText('Maintainer', { timeout: 60000 });
  });

  test('redirects away from maintainer route when mode is disabled', async ({ page }) => {
    await page.addInitScript((key) => {
      window.localStorage.removeItem(key);
    }, MAINTAINER_STORAGE_KEY);

    await page.goto('/maintainer');
    await expect(page).toHaveURL(/\/$/, { timeout: 60000 });
  });

  test('grants access to maintainer dashboard when mode is enabled via storage', async ({ page }) => {
    await page.addInitScript((key) => {
      window.localStorage.setItem(key, 'true');
    }, MAINTAINER_STORAGE_KEY);

    await page.goto('/maintainer');
    await expect(page).toHaveURL(/\/maintainer/);
    await expect(page.locator('h1')).toContainText('Maintainer', { timeout: 60000 });
  });
});
