import { NextResponse } from "next/server";

import { prisma } from "@flowlab/db";
import { draftCommunicationMessage } from "@flowlab/integrations/claude";

import { requireTenantSession } from "../../../../../lib/session";

export async function POST(request: Request) {
  const session = await requireTenantSession();
  const { tenantId } = session;

  const body = await request.json() as {
    customerId: string;
    jobId?: string | null;
    invoiceId?: string | null;
    channel: "email" | "sms";
    intent?: string;
  };

  const [customer, tenant, job, invoice] = await Promise.all([
    prisma.customer.findFirst({
      where: { id: body.customerId, tenantId },
      select: { firstName: true, lastName: true, suburb: true, notes: true }
    }),
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { profile: { select: { businessName: true, businessType: true } } }
    }),
    body.jobId
      ? prisma.job.findFirst({
          where: { id: body.jobId, tenantId },
          select: { summary: true, status: true, scheduledFor: true, address: true, suburb: true, actualHours: true, estimatedHours: true }
        })
      : Promise.resolve(null),
    body.invoiceId
      ? prisma.invoice.findFirst({
          where: { id: body.invoiceId, tenantId },
          select: { number: true, amount: true, status: true, dueAt: true }
        })
      : Promise.resolve(null)
  ]);

  if (!customer) {
    return NextResponse.json({ error: "customer_not_found" }, { status: 404 });
  }

  try {
    const result = await draftCommunicationMessage({
      businessName: tenant?.profile?.businessName ?? "Your business",
      businessType: tenant?.profile?.businessType ?? undefined,
      customerFirstName: customer.firstName,
      customerLastName: customer.lastName,
      customerSuburb: customer.suburb,
      customerNotes: customer.notes,
      channel: body.channel,
      intent: body.intent,
      job: job
        ? {
            summary: job.summary,
            status: job.status,
            scheduledFor: job.scheduledFor,
            address: job.address,
            suburb: job.suburb,
            actualHours: job.actualHours ? Number(job.actualHours) : null,
            estimatedHours: job.estimatedHours ? Number(job.estimatedHours) : null
          }
        : null,
      invoice: invoice
        ? {
            number: invoice.number,
            amount: Number(invoice.amount),
            status: invoice.status,
            dueAt: invoice.dueAt
          }
        : null
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
