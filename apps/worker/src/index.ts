import * as Sentry from "@sentry/node";
import { prisma } from "@flowlab/db";
import { logger } from "@flowlab/contracts";
import { ensureAppEnv } from "@flowlab/contracts/server";
import { startAutomationWorker } from "@flowlab/automation";

const pollMs = Number(process.env.WORKER_POLL_MS ?? 5000);
const runOnce = process.env.WORKER_RUN_ONCE === "true";

ensureAppEnv("worker");

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0,
  });
}

startAutomationWorker({ pollMs, runOnce })
  .catch((error) => {
    if (process.env.SENTRY_DSN) {
      Sentry.captureException(error);
    }
    logger.error("Worker crashed at top level", {
      service: "worker",
      errorMessage: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
