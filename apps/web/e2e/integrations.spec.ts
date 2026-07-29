import { test, expect } from './fixtures';

test.describe('Integrations Hub navigation', () => {
  test.setTimeout(90000);

  test('should load integrations hub and navigate to key integration pages', async ({ page }) => {
    await page.goto('/integrations');
    await expect(page).toHaveURL(/\/integrations\/?$/);
    await expect(page.getByRole('heading', { name: /Integrations Hub/i })).toBeAttached({
      timeout: 60000,
    });

    await page.goto('/integrations/artifacts');
    await expect(page).toHaveURL(/\/integrations\/artifacts/);
    await expect(page.getByRole('heading', { name: /Artifact Storage/i })).toBeAttached({
      timeout: 60000,
    });

    await page.goto('/integrations/replay-e2e');
    await expect(page).toHaveURL(/\/integrations\/replay-e2e/);
    // Replay page uses an h2 title, not h1
    await expect(
      page.getByRole('heading', { name: /Replay End-to-End Integration Tests/i }),
    ).toBeAttached({ timeout: 60000 });
  });
});
