import { NextResponse } from "next/server";

import { processAutomationBatch } from "@flowlab/automation";
import { enqueueAutomationJob, prisma } from "@flowlab/db";

import { requireTenantSession } from "../../../../../../lib/session";

export async function POST(request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const session = await requireTenantSession();
  const { jobId } = await params;

  const job = await prisma.job.findFirst({
    where: { id: jobId, tenantId: session.tenantId },
    select: { id: true, status: true, customerId: true, summary: true }
  });

  if (!job) {
    return NextResponse.redirect(new URL("/dashboard/jobs?error=not_found", request.url), 303);
  }

  if (job.status !== "in_progress") {
    return NextResponse.redirect(new URL(`/dashboard/jobs/${jobId}?error=not_in_progress`, request.url), 303);
  }

  try {
    // Dedupe per hour so a double-tap doesn't spam the customer
    const hourSlot = new Date().toISOString().slice(0, 13);
    await enqueueAutomationJob({
      tenantId: session.tenantId,
      kind: "job.on_my_way",
      payload: { jobId: job.id, customerId: job.customerId, summary: job.summary },
      dedupeKey: `on_my_way_${jobId}_${hourSlot}`
    });
    await processAutomationBatch(5);
  } catch {
    return NextResponse.redirect(new URL(`/dashboard/jobs/${jobId}?error=on_my_way_failed`, request.url), 303);
  }

  return NextResponse.redirect(new URL(`/dashboard/jobs/${jobId}?on_my_way=1`, request.url), 303);
}
