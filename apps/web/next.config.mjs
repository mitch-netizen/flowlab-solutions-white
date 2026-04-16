import path from "node:path";
import { fileURLToPath } from "node:url";
import { withSentryConfig } from "@sentry/nextjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@flowlab/auth", "@flowlab/db", "@flowlab/ui"],
  outputFileTracingRoot: workspaceRoot
};

export default withSentryConfig(nextConfig, {
  silent: true
});
