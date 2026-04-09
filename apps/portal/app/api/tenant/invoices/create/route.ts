import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { processAutomationBatch } from "@flowlab/automation";
import { TENANT_SESSION_COOKIE, verifySessionToken } from "@flowlab/auth";
import { createInvoiceDraft } from "@flowlab/db";

export async function POST(request: Request) {
  const token = (await cookies()).get(TENANT_SESSION_COOKIE)?.value;
  const session = token ? verifySessionToken(token) : null;

  if (!session || session.scope !== "tenant" || !session.tenantId) {
    return NextResponse.redirect(new URL("/login", request.url), 303);
  }

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
