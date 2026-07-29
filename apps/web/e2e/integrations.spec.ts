import { test, expect } from './fixtures';

test.describe('Integrations Hub navigation', () => {
  test.setTimeout(90000);

  test('should load integrations hub and navigate to key integration pages', async ({ page }) => {
    await page.goto('/integrations');
    await expect(page).toHaveURL(/\/integrations\/?$/);
    await expect(page.locator('h1')).toContainText('Integrations Hub', { timeout: 60000 });

    await page.goto('/integrations/artifacts');
    await expect(page).toHaveURL(/\/integrations\/artifacts/);
    await expect(page.locator('h1')).toContainText('Artifact Storage', { timeout: 60000 });

    await page.goto('/integrations/replay-e2e');
    await expect(page).toHaveURL(/\/integrations\/replay-e2e/);
    await expect(page.locator('h1')).toContainText('Replay', { timeout: 60000 });
  });
});
