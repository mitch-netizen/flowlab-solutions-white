import { NextResponse } from "next/server";

import { processAutomationBatch } from "@flowlab/automation";
import { prisma, enqueueRetentionRun } from "@flowlab/db";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }

  const authorization = request.headers.get("authorization");
  return authorization === `Bearer ${secret}`;
}

async function runRetention(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const tenants = await prisma.tenant.findMany({
    where: { status: { in: ["trial", "active"] } }
  });

  let processed = 0;
  let failed = 0;

  for (const tenant of tenants) {
    try {
      await enqueueRetentionRun(tenant.id);
      processed += 1;
    } catch (error) {
      console.error(`[retention-run] Failed for tenant ${tenant.id}:`, error instanceof Error ? error.message : String(error));
      failed += 1;
    }
  }

  // Process queued jobs
  const batch = await processAutomationBatch(50);

  return NextResponse.json({
    ok: true,
    tenants_scanned: tenants.length,
    retention_runs_enqueued: processed,
    retention_runs_failed: failed,
    batch_processed: batch
  });
}

export async function GET(request: Request) {
  return runRetention(request);
}

export async function POST(request: Request) {
  return runRetention(request);
}
