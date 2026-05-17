// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const version = process.env.NEXT_PUBLIC_APP_VERSION || process.env.npm_package_version || "unknown";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  release: version,
  environment: process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1,
  enableLogs: process.env.NODE_ENV !== "production",

  // Enable session tracking for release health monitoring
  autoSessionTracking: true,

  // Capture unhandled rejections
  attachStacktrace: true,
});
