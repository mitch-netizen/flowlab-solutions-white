import { test } from '@playwright/test';

test('probe production signup readiness', async ({ page }) => {
  const base = 'https://flowlabsolutions.au';
  const nonce = Date.now();
  const email = `codex.test.${nonce}@example.com`;

  await page.goto(`${base}/signup`, { waitUntil: 'domcontentloaded' });
  await page.fill('input[name="businessName"]', `Codex Test ${nonce}`);
  await page.fill('input[name="ownerName"]', 'Codex Tester');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="phone"]', '0409265711');
  await page.fill('input[name="suburb"]', 'Brisbane');
  await page.fill('input[name="password"]', 'TestPassword123!');

  const buttonDisabled = await page.locator('button:has-text("Start free 14-day trial")').isDisabled();
  const turnstileFrames = await page.locator('iframe[src*="turnstile"]').count();

  console.log(JSON.stringify({
    finalUrl: page.url(),
    email,
    buttonDisabled,
    turnstileFrames
  }));
});
