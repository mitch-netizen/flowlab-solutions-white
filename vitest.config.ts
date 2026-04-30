import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    exclude: ["tests/e2e/**", ".claude/**", "node_modules/**"]
  },
  resolve: {
    alias: {
      "@flowlab/auth": `${root}packages/auth/src`,
      "@flowlab/automation": `${root}packages/automation/src`,
      "@flowlab/branding": `${root}packages/branding/src`,
      "@flowlab/contracts": `${root}packages/contracts/src`,
      "@flowlab/contracts/server": `${root}packages/contracts/src/server.ts`,
      "@flowlab/db": `${root}packages/db/src`,
      "@flowlab/events": `${root}packages/events/src`,
      "@flowlab/integrations": `${root}packages/integrations/src`,
      "@flowlab/integrations/xero": `${root}packages/integrations/src/xero.ts`,
      "@flowlab/ui": `${root}packages/ui/src`
    }
  }
});
