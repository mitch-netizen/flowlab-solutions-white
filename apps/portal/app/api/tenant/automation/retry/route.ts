import { requireTenantSession } from "../../../../../lib/session";

import { NextResponse } from "next/server";

import { retryAutomationJob } from "@flowlab/db";

export async function POST(request: Request) {
  const session = await requireTenantSession();

  const formData = await request.formData();
  const jobId = String(formData.get("jobId") ?? "");

  if (!jobId) {
    return NextResponse.redirect(new URL("/dashboard/system-health?error=missing_job", request.url), 303);
  }

  await retryAutomationJob({
    tenantId: session.tenantId,
    jobId
  });

  return NextResponse.redirect(new URL("/dashboard/system-health?retried=1", request.url), 303);
}
