import { defineConfig, devices } from "@playwright/test";

/**
 * E2E smoke tests for the FlowLab self-serve launch.
 * These run against a running dev/preview environment.
 * Set PORTAL_BASE_URL and WEB_BASE_URL to target a specific environment.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    trace: "on-first-retry"
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ]
});
