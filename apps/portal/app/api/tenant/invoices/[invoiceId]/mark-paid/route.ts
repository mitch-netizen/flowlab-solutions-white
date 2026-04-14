import { NextResponse } from "next/server";

import { processAutomationBatch } from "@flowlab/automation";
import { enqueueAutomationJob, prisma } from "@flowlab/db";
import { requireTenantSession } from "../../../../../../lib/session";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  const session = await requireTenantSession();
  const { invoiceId } = await params;

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, tenantId: session.tenantId }
  });

  if (!invoice) {
    return NextResponse.redirect(
      new URL(`/dashboard/invoices?error=not_found`, request.url),
      303
    );
  }

  if (invoice.status === "paid") {
    return NextResponse.redirect(
      new URL(`/dashboard/invoices/${invoiceId}?message=already_paid`, request.url),
      303
    );
  }

  const paidAt = new Date();

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: "paid", paidAt }
  });

  if (invoice.jobId) {
    await prisma.job.update({
      where: { id: invoice.jobId },
      data: { status: "paid" }
    }).catch(() => {});
  }

  await enqueueAutomationJob({
    tenantId: session.tenantId,
    kind: "invoice.paid",
    payload: {
      invoiceId: invoice.id,
      invoiceNumber: invoice.number,
      customerId: invoice.customerId,
      amount: invoice.amount,
      tenantId: session.tenantId
    }
  });

  await processAutomationBatch(5);

  return NextResponse.redirect(
    new URL(`/dashboard/invoices/${invoiceId}?message=marked_paid`, request.url),
    303
  );
}
