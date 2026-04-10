import { requireTenantSession } from "../../../../../lib/session";

import { NextResponse } from "next/server";

import { processAutomationBatch } from "@flowlab/automation";

import { createInvoiceDraft } from "@flowlab/db";

export async function POST(request: Request) {
  const session = await requireTenantSession();

  const formData = await request.formData();
  await createInvoiceDraft({
    tenantId: session.tenantId,
    customerId: String(formData.get("customerId") ?? ""),
    amount: Number(formData.get("amount") ?? 0),
    note: String(formData.get("note") ?? "")
  });
  await processAutomationBatch(5);

  return NextResponse.redirect(new URL("/dashboard/invoices", request.url), 303);
}
