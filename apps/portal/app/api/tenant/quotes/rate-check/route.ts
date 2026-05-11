import { NextResponse } from "next/server";

import { prisma } from "@flowlab/db";
import { checkMarketRate } from "@flowlab/integrations/claude";

import { requireTenantSession } from "../../../../../lib/session";

export async function POST(request: Request) {
  const session = await requireTenantSession();
  const { tenantId } = session;

  const body = await request.json() as { amount: number; jobDescription: string; suburb?: string };

  if (!body.amount || !body.jobDescription) {
    return NextResponse.json({ error: "amount and jobDescription required" }, { status: 400 });
  }

  const profile = await prisma.tenantProfile.findFirst({
    where: { tenantId },
    select: { businessName: true, businessType: true, suburb: true }
  });

  const result = await checkMarketRate({
    businessName: profile?.businessName ?? "Your business",
    businessType: profile?.businessType ?? "general_trades",
    suburb: body.suburb ?? profile?.suburb,
    proposedAmount: body.amount,
    jobDescription: body.jobDescription
  });

  return NextResponse.json(result);
}
