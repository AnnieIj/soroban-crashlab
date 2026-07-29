import { test, expect } from './fixtures';

const API_CONFIG_STORAGE_KEY = 'crashlab:api-config';

async function setInputValue(
  page: import('@playwright/test').Page,
  selector: string,
  value: string,
) {
  const input = page.locator(selector);
  await expect(input).toBeAttached({ timeout: 60000 });
  // Attached-but-not-actionable is common under CI overlays; drive React state
  // through the native value setter + bubbled input/change events.
  await input.evaluate((el, next) => {
    const node = el as HTMLInputElement;
    const descriptor = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value',
    );
    descriptor?.set?.call(node, next);
    node.dispatchEvent(new Event('input', { bubbles: true }));
    node.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

test.describe('Settings page localStorage persistence', () => {
  test.setTimeout(120000);

  test('persists API configuration across reload', async ({ page }) => {
    await page.goto('/settings/api', { waitUntil: 'domcontentloaded' });

    // ApiConfigForm only shows this status after client mount/hydration.
    await expect(page.getByText(/API (not )?configured/i)).toBeAttached({
      timeout: 60000,
    });

    await setInputValue(page, '#api-backend-url', 'https://api.example.com');
    await setInputValue(page, '#api-rate-limit-max', '42');
    await setInputValue(page, '#api-rate-limit-window', '30');
    await page.locator('#api-config-save').click({ force: true });

    await expect
      .poll(async () =>
        page.evaluate((key) => {
          const raw = localStorage.getItem(key);
          return raw ? JSON.parse(raw).backendUrl : null;
        }, API_CONFIG_STORAGE_KEY),
      )
      .toBe('https://api.example.com');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/API configured/i)).toBeAttached({ timeout: 60000 });
    await expect
      .poll(async () =>
        page.locator('#api-backend-url').evaluate((el) => (el as HTMLInputElement).value),
      )
      .toBe('https://api.example.com');
  });
});
