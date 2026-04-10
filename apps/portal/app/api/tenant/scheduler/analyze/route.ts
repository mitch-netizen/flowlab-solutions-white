import { requireTenantSession } from "../../../../../lib/session";

import { NextResponse } from "next/server";

import { enqueueSchedulerAnalysis } from "@flowlab/db";

export async function POST(request: Request) {
  const session = await requireTenantSession();

  await enqueueSchedulerAnalysis(session.tenantId);
  return NextResponse.redirect(new URL("/dashboard/scheduler", request.url), 303);
}
