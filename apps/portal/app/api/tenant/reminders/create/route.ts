import { NextResponse } from "next/server";

import { prisma } from "@flowlab/db";
import { requireTenantSession } from "../../../../../lib/session";

export async function POST(request: Request) {
  const session = await requireTenantSession();

  const body = await request.formData();
  const customerId = body.get("customerId")?.toString().trim();
  const dueAtRaw = body.get("dueAt")?.toString().trim();

  if (!customerId || !dueAtRaw) {
    return NextResponse.redirect(
      new URL(`/dashboard/crm?error=missing_fields`, request.url),
      303
    );
  }

  const dueAt = new Date(dueAtRaw);
  if (isNaN(dueAt.getTime())) {
    return NextResponse.redirect(
      new URL(`/dashboard/crm/${customerId}?error=invalid_date`, request.url),
      303
    );
  }

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, tenantId: session.tenantId }
  });

  if (!customer) {
    return NextResponse.redirect(
      new URL(`/dashboard/crm?error=not_found`, request.url),
      303
    );
  }

  await prisma.rebookReminder.create({
    data: {
      tenantId: session.tenantId,
      customerId,
      dueAt,
      status: "pending"
    }
  });

  return NextResponse.redirect(
    new URL(`/dashboard/crm/${customerId}?reminder=created`, request.url),
    303
  );
}
