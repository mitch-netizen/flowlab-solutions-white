import { prisma } from "@flowlab/db";
import { ensureAppEnv } from "@flowlab/contracts/server";
import { startAutomationWorker } from "@flowlab/automation";

const pollMs = Number(process.env.WORKER_POLL_MS ?? 5000);
const runOnce = process.env.WORKER_RUN_ONCE === "true";

ensureAppEnv("worker");

startAutomationWorker({ pollMs, runOnce })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
