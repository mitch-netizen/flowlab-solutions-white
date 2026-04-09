import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { TENANT_SESSION_COOKIE, verifySessionToken } from "@flowlab/auth";
import { retryAutomationJob } from "@flowlab/db";

export async function POST(request: Request) {
  const token = (await cookies()).get(TENANT_SESSION_COOKIE)?.value;
  const session = token ? verifySessionToken(token) : null;

  if (!session || session.scope !== "tenant" || !session.tenantId) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

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
