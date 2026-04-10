import { requireTenantSession } from "../../../../../lib/session";

import { NextResponse } from "next/server";

import { processAutomationBatch } from "@flowlab/automation";

import { enqueueRetentionRun } from "@flowlab/db";

export async function POST(request: Request) {
  const session = await requireTenantSession();

  await enqueueRetentionRun(session.tenantId);
  await processAutomationBatch(10);
  return NextResponse.redirect(new URL("/dashboard/retention", request.url), 303);
}
