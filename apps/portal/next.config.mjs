import path from "node:path";
import { fileURLToPath } from "node:url";
import { withSentryConfig } from "@sentry/nextjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@flowlab/auth", "@flowlab/branding", "@flowlab/contracts", "@flowlab/db", "@flowlab/events", "@flowlab/integrations"],
  outputFileTracingRoot: workspaceRoot
};

export default withSentryConfig(nextConfig, {
  silent: true
});
