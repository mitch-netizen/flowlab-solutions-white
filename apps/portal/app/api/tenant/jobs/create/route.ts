import { NextResponse } from "next/server";

import { processAutomationBatch } from "@flowlab/automation";
import { createTenantJob } from "@flowlab/db";

import { requireTenantSession } from "../../../../../lib/session";

export async function POST(request: Request) {
  const session = await requireTenantSession();
  const formData = await request.formData();

  const customerId = String(formData.get("customerId") ?? "");
  const summary = String(formData.get("summary") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim() || null;
  const suburb = String(formData.get("suburb") ?? "").trim() || null;
  const scheduledForRaw = String(formData.get("scheduledFor") ?? "").trim();
  const estimatedHoursRaw = String(formData.get("estimatedHours") ?? "").trim();

  if (!customerId || !summary) {
    return NextResponse.redirect(new URL("/dashboard/jobs?error=invalid_job", request.url), 303);
  }

  const scheduledFor = scheduledForRaw ? new Date(scheduledForRaw) : null;
  const estimatedHours = estimatedHoursRaw ? Number(estimatedHoursRaw) : null;

  if (scheduledFor && Number.isNaN(scheduledFor.getTime())) {
    return NextResponse.redirect(new URL("/dashboard/jobs?error=invalid_schedule", request.url), 303);
  }

  try {
    await createTenantJob({
      tenantId: session.tenantId,
      customerId,
      summary,
      address,
      suburb,
      scheduledFor,
      estimatedHours: estimatedHours && !Number.isNaN(estimatedHours) ? estimatedHours : null
    });
    await processAutomationBatch(5);
  } catch {
    return NextResponse.redirect(new URL("/dashboard/jobs?error=create_failed", request.url), 303);
  }

  return NextResponse.redirect(new URL("/dashboard/jobs?created=1", request.url), 303);
}
