import { NextResponse } from "next/server";

import { prisma } from "@flowlab/db";
import { stripeRequest } from "../../../../../../../lib/stripe";
import { getPlatformSession } from "../../../../../../../lib/session";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getPlatformSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "superadmin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id: tenantId } = await params;
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { profile: true }
  });
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  if (tenant.stripeCustomerId) return NextResponse.json({ ok: true, customerId: tenant.stripeCustomerId });

  const body = new URLSearchParams();
  body.set("name", tenant.profile?.businessName ?? tenant.slug);
  body.set("email", tenant.billingEmail);
  body.set("metadata[tenantId]", tenant.id);
  body.set("metadata[tenantSlug]", tenant.slug);

  let data: { id?: string };
  try {
    data = await stripeRequest<{ id?: string }>("/v1/customers", { body });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create Stripe customer" },
      { status: 500 }
    );
  }

  if (!data.id) {
    return NextResponse.json({ error: "Could not create Stripe customer" }, { status: 500 });
  }

  await prisma.tenant.update({
    where: { id: tenant.id },
    data: { stripeCustomerId: data.id }
  });

  await prisma.platformEventLog.create({
    data: {
      tenantId: tenant.id,
      eventType: "info",
      service: "stripe",
      direction: "outbound",
      status: "success",
      requestSummary: "Stripe customer created by superadmin",
      responseSummary: data.id,
      triggeredBy: `superadmin_${session.email}`
    }
  });

  return NextResponse.json({ ok: true, customerId: data.id });
}
