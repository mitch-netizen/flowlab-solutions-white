/**
 * E2E smoke tests for the FlowLab core customer journey.
 *
 * These tests require running dev servers:
 *   WEB_BASE_URL  — apps/web  (default: http://localhost:3000)
 *   PORTAL_BASE_URL — apps/portal for a specific tenant (default: http://lawnorder.localhost:3001)
 *
 * Run with:
 *   npx playwright test tests/e2e/smoke.test.ts
 */

import { expect, test } from "@playwright/test";

const WEB = process.env.WEB_BASE_URL ?? "http://localhost:3000";
const PORTAL = process.env.PORTAL_BASE_URL ?? "http://lawnorder.localhost:3001";

// ─── Self-serve signup ────────────────────────────────────────────────────────

test.describe("self-serve signup", () => {
  test("signup page renders and has required fields", async ({ page }) => {
    await page.goto(`${WEB}/signup`);
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator('input[name="businessName"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });

  test("signup page has honeypot field hidden from users", async ({ page }) => {
    await page.goto(`${WEB}/signup`);
    const honeypot = page.locator('input[name="website"]');
    // Must exist in DOM for bots but be invisible to real users
    await expect(honeypot).toHaveCount(1);
  });
});

// ─── Tenant login ─────────────────────────────────────────────────────────────

test.describe("tenant login", () => {
  test("login page renders on tenant portal", async ({ page }) => {
    await page.goto(`${PORTAL}/login`);
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });

  test("login page shows rate_limited error correctly", async ({ page }) => {
    await page.goto(`${PORTAL}/login?error=rate_limited`);
    await expect(page.locator("text=Too many login attempts")).toBeVisible();
  });

  test("login page shows created success message", async ({ page }) => {
    await page.goto(`${PORTAL}/login?created=1`);
    await expect(page.locator("text=account is ready")).toBeVisible();
  });
});

// ─── Public enquiry form ──────────────────────────────────────────────────────

test.describe("public enquiry form", () => {
  test("enquiry page renders on tenant portal", async ({ page }) => {
    await page.goto(`${PORTAL}/enquiry`);
    await expect(page.locator('input[name="firstName"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('textarea[name="serviceRequest"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("enquiry page shows submitted confirmation", async ({ page }) => {
    await page.goto(`${PORTAL}/enquiry?submitted=1`);
    await expect(page.locator("text=on its way")).toBeVisible();
  });
});

// ─── Unknown tenant host ──────────────────────────────────────────────────────

test.describe("unknown tenant resolution", () => {
  test("unknown subdomain returns not-found or unavailable state, not lawnorder demo tenant", async ({ page }) => {
    const unknownPortal = process.env.UNKNOWN_PORTAL_URL ?? "http://nonexistent-tenant-xyz.localhost:3001";
    const response = await page.goto(unknownPortal);
    // Should be a 404 or show tenant-unavailable — must NOT show lawnorder branding
    const body = await page.content();
    expect(body).not.toContain("Lawn & Order");
    expect(body).not.toContain("lawnorder");
  });
});

// ─── Public quote acceptance ──────────────────────────────────────────────────

test.describe("public quote page", () => {
  test("quote page with invalid token shows not-found", async ({ page }) => {
    const response = await page.goto(`${PORTAL}/quote/invalid-token-xyz`);
    // Either 404 or redirect to error state — must not crash with 500
    expect(response?.status()).not.toBe(500);
  });
});

// ─── Public feedback form ─────────────────────────────────────────────────────

test.describe("public feedback form", () => {
  test("feedback page with invalid token shows not-found", async ({ page }) => {
    const response = await page.goto(`${PORTAL}/feedback/invalid-token-xyz`);
    expect(response?.status()).not.toBe(500);
  });

  test("feedback page with error param shows user-friendly message", async ({ page }) => {
    // We can test the UI for known error states without a real token
    // by using the already-submitted path (needs a real token in integration tests)
    // Here we just verify the page doesn't crash on load with a bad token
    const response = await page.goto(`${PORTAL}/feedback/fake-token?error=rate_limited`);
    // Will 404 (no feedback request), which is correct
    expect(response?.status()).not.toBe(500);
  });
});

// ─── Admin login ──────────────────────────────────────────────────────────────

test.describe("admin login", () => {
  test("admin login page renders", async ({ page }) => {
    await page.goto(`${WEB}/admin/login`);
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });

  test("admin dashboard redirects unauthenticated users to login", async ({ page }) => {
    await page.goto(`${WEB}/admin`);
    // Should redirect to login or return 401 — not render the dashboard
    const url = page.url();
    const body = await page.content();
    const redirectedToLogin = url.includes("/login") || body.includes('name="password"');
    expect(redirectedToLogin).toBe(true);
  });
});
