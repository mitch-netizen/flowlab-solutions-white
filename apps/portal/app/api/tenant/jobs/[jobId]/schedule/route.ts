import { NextResponse } from "next/server";

import { processAutomationBatch } from "@flowlab/automation";
import { updateTenantJobSchedule } from "@flowlab/db";

import { requireTenantSession } from "../../../../../../lib/session";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const session = await requireTenantSession();
  const { jobId } = await params;
  const formData = await request.formData();
  const returnTo = String(formData.get("returnTo") ?? `/dashboard/jobs/${jobId}`);
  const scheduledForRaw = String(formData.get("scheduledFor") ?? "").trim();

  const scheduledFor = new Date(scheduledForRaw);
  if (!scheduledForRaw || Number.isNaN(scheduledFor.getTime())) {
    return NextResponse.redirect(new URL(`${returnTo}?error=invalid_schedule`, request.url), 303);
  }

  try {
    await updateTenantJobSchedule({
      tenantId: session.tenantId,
      jobId,
      scheduledFor
    });
    await processAutomationBatch(5);
    return NextResponse.redirect(new URL(`${returnTo}?scheduled=1`, request.url), 303);
  } catch {
    return NextResponse.redirect(new URL(`${returnTo}?error=schedule_failed`, request.url), 303);
  }
}
