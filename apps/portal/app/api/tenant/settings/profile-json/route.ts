import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { TENANT_SESSION_COOKIE, verifySessionToken } from "@flowlab/auth";
import { updateTenantProfileSettings } from "@flowlab/db";

export async function POST(request: Request) {
  const token = (await cookies()).get(TENANT_SESSION_COOKIE)?.value;
  const session = token ? verifySessionToken(token) : null;

  if (!session || session.scope !== "tenant" || !session.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json() as {
    businessName?: string;
    tagline?: string;
    phone?: string;
    email?: string;
    primaryColour?: string;
    secondaryColour?: string;
    accentColour?: string;
    customDomain?: string;
    serviceAreaSuburbs?: string[];
  };

  await updateTenantProfileSettings({
    tenantId: session.tenantId,
    businessName: body.businessName ?? "",
    tagline: body.tagline,
    phone: body.phone,
    email: body.email,
    primaryColour: body.primaryColour,
    secondaryColour: body.secondaryColour,
    accentColour: body.accentColour,
    customDomain: body.customDomain,
    serviceAreaSuburbs: body.serviceAreaSuburbs
  });

  return NextResponse.json({ ok: true });
}
