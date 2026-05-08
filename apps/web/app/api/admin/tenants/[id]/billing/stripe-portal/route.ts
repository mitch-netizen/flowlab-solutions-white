import { NextResponse } from "next/server";

import { prisma } from "@flowlab/db";
import { stripeRequest } from "../../../../../../../lib/stripe";
import { getPlatformSession } from "../../../../../../../lib/session";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getPlatformSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "superadmin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id: tenantId } = await params;
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  if (!tenant.stripeCustomerId) return NextResponse.json({ error: "Tenant has no Stripe customer ID" }, { status: 400 });

  const origin = new URL(request.url).origin;
  const body = new URLSearchParams();
  body.set("customer", tenant.stripeCustomerId);
  body.set("return_url", `${origin}/admin/tenant/${tenant.id}?tab=billing`);

  let data: { url?: string };
  try {
    data = await stripeRequest<{ url?: string }>("/v1/billing_portal/sessions", { body });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create billing portal session" },
      { status: 500 }
    );
  }

  if (!data.url) {
    return NextResponse.json({ error: "Could not create billing portal session" }, { status: 500 });
  }

  await prisma.platformEventLog.create({
    data: {
      tenantId: tenant.id,
      eventType: "info",
      service: "stripe",
      direction: "outbound",
      status: "success",
      requestSummary: "Stripe billing portal opened by superadmin",
      responseSummary: tenant.stripeCustomerId,
      triggeredBy: `superadmin_${session.email}`
    }
  });

  return NextResponse.json({ ok: true, url: data.url });
}
