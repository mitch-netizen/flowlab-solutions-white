import { NextResponse } from "next/server";

import { updateTenantJobActualHours } from "@flowlab/db";

import { requireTenantSession } from "../../../../../../lib/session";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const session = await requireTenantSession();
  const { jobId } = await params;
  const formData = await request.formData();
  const returnTo = String(formData.get("returnTo") ?? `/dashboard/jobs/${jobId}`);
  const actualHours = Number(formData.get("actualHours"));

  if (!Number.isFinite(actualHours) || actualHours < 0) {
    return NextResponse.redirect(new URL(`${returnTo}?error=invalid_actuals`, request.url), 303);
  }

  try {
    await updateTenantJobActualHours({
      tenantId: session.tenantId,
      jobId,
      actualHours
    });
    return NextResponse.redirect(new URL(`${returnTo}?actuals=1`, request.url), 303);
  } catch {
    return NextResponse.redirect(new URL(`${returnTo}?error=actuals_failed`, request.url), 303);
  }
}
