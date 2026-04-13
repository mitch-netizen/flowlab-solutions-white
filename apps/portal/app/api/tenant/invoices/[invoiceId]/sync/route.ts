import { NextResponse } from "next/server";

import { syncTenantInvoiceFromXero } from "@flowlab/db";

import { requireTenantSession } from "../../../../../../lib/session";

export async function POST(request: Request, { params }: { params: Promise<{ invoiceId: string }> }) {
  const session = await requireTenantSession();
  const { invoiceId } = await params;

  try {
    await syncTenantInvoiceFromXero({
      tenantId: session.tenantId,
      invoiceId
    });
  } catch {
    return NextResponse.redirect(new URL(`/dashboard/invoices/${invoiceId}?error=xero_sync_failed`, request.url), 303);
  }

  return NextResponse.redirect(new URL(`/dashboard/invoices/${invoiceId}?synced=1`, request.url), 303);
}
