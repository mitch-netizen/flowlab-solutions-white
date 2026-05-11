import { NextResponse } from "next/server";

import { prisma } from "@flowlab/db";

import { requireTenantSession } from "../../../../../lib/session";

export async function GET(request: Request) {
  const session = await requireTenantSession();
  const { tenantId } = session;

  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get("customerId");

  if (!customerId) {
    return NextResponse.json({ suggestedAmount: null, count: 0 });
  }

  const result = await prisma.invoice.aggregate({
    where: { tenantId, customerId },
    _avg: { amount: true },
    _count: { id: true }
  });

  const avg = result._avg.amount;
  const count = result._count.id;

  return NextResponse.json({
    suggestedAmount: avg != null ? Math.round(avg) : null,
    count
  });
}
