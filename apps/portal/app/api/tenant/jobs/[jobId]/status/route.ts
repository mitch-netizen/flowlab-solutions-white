import { NextResponse } from "next/server";

import { processAutomationBatch } from "@flowlab/automation";
import { updateTenantJobStatus } from "@flowlab/db";

import { requireTenantSession } from "../../../../../../lib/session";

const allowedStatuses = new Set(["quoted", "scheduled", "in_progress", "complete"]);

export async function POST(request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const session = await requireTenantSession();
  const { jobId } = await params;
  const formData = await request.formData();
  const status = String(formData.get("status") ?? "");

  if (!allowedStatuses.has(status)) {
    return NextResponse.redirect(new URL("/dashboard/jobs?error=invalid_status", request.url), 303);
  }

  try {
    await updateTenantJobStatus({
      tenantId: session.tenantId,
      jobId,
      status: status as "quoted" | "scheduled" | "in_progress" | "complete"
    });
    await processAutomationBatch(5);
  } catch {
    return NextResponse.redirect(new URL(`/dashboard/jobs/${jobId}?error=status_failed`, request.url), 303);
  }

  return NextResponse.redirect(new URL("/dashboard/jobs?updated=1", request.url), 303);
}
