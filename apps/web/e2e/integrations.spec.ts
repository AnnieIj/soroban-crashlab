import { test, expect } from './fixtures';

const INTEGRATIONS_READY_TIMEOUT_MS = 120000;

async function openIntegrationsHub(page: import('@playwright/test').Page) {
  await page.goto('/integrations', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Integrations Hub')).toBeVisible({
    timeout: INTEGRATIONS_READY_TIMEOUT_MS,
  });
}

test.describe('Integrations Hub navigation', () => {
  test.setTimeout(150000);

  test('should load integrations hub and navigate to key integration pages', async ({ page }) => {
    await openIntegrationsHub(page);
    await expect(page.getByText('Ready to Use')).toBeVisible();

    await page.getByRole('link', { name: /Artifact Storage/i }).click();
    await expect(page).toHaveURL(/.*\/integrations\/artifacts/);
    await expect(page.getByText('Artifact Storage Integration')).toBeVisible({
      timeout: INTEGRATIONS_READY_TIMEOUT_MS,
    });

    await openIntegrationsHub(page);

    await page.getByRole('link', { name: /Replay E2E Tests/i }).click();
    await expect(page).toHaveURL(/.*\/integrations\/replay-e2e/);
    await expect(page.getByText('Replay End-to-End Integration Tests')).toBeVisible({
      timeout: INTEGRATIONS_READY_TIMEOUT_MS,
    });
  });
});
