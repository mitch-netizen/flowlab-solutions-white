import { NextResponse } from "next/server";

import { processAutomationBatch } from "@flowlab/automation";
import { enqueueMorningDigest } from "@flowlab/db";

import { requireTenantSession } from "../../../../lib/session";

export async function POST(request: Request) {
  const session = await requireTenantSession();

  try {
    await enqueueMorningDigest(session.tenantId);
    await processAutomationBatch(5);
    return NextResponse.redirect(new URL("/dashboard?digest=sent", request.url), 303);
  } catch {
    return NextResponse.redirect(new URL("/dashboard?error=digest_failed", request.url), 303);
  }
}
