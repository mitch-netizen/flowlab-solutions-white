import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    exclude: ["tests/e2e/**", "node_modules/**"]
  },
  resolve: {
    alias: {
      "@flowlab/auth": "/Users/mitch/FlowLab Solutions_White/packages/auth/src",
      "@flowlab/branding": "/Users/mitch/FlowLab Solutions_White/packages/branding/src",
      "@flowlab/contracts": "/Users/mitch/FlowLab Solutions_White/packages/contracts/src",
      "@flowlab/contracts/server": "/Users/mitch/FlowLab Solutions_White/packages/contracts/src/server.ts",
      "@flowlab/db": "/Users/mitch/FlowLab Solutions_White/packages/db/src",
      "@flowlab/events": "/Users/mitch/FlowLab Solutions_White/packages/events/src",
      "@flowlab/integrations": "/Users/mitch/FlowLab Solutions_White/packages/integrations/src",
      "@flowlab/ui": "/Users/mitch/FlowLab Solutions_White/packages/ui/src"
    }
  }
});
