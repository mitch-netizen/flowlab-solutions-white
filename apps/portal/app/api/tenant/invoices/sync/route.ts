import { NextResponse } from "next/server";

import { syncTenantOpenInvoicesFromXero } from "@flowlab/db";

import { requireTenantSession } from "../../../../../lib/session";

export async function POST(request: Request) {
  const session = await requireTenantSession();

  try {
    const result = await syncTenantOpenInvoicesFromXero({
      tenantId: session.tenantId
    });

    return NextResponse.redirect(
      new URL(`/dashboard/invoices?synced=${result.synced}&failed=${result.failed}`, request.url),
      303
    );
  } catch {
    return NextResponse.redirect(new URL("/dashboard/invoices?error=xero_sync_failed", request.url), 303);
  }
}
