import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { TENANT_SESSION_COOKIE, verifySessionToken } from "@flowlab/auth";
import { saveTenantPricingSettings } from "@flowlab/db";

export async function POST(request: Request) {
  const token = (await cookies()).get(TENANT_SESSION_COOKIE)?.value;
  const session = token ? verifySessionToken(token) : null;

  if (!session || session.scope !== "tenant" || !session.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json() as {
    pricingRate: {
      label: string;
      baseRatePerSquareM: number;
      overgrownRate: number;
      heavilyOvergrownRate: number;
      minimumCharge: number;
      gstEnabled: boolean;
    };
    serviceTemplates: Array<{
      serviceName: string;
      defaultPrice: number;
      defaultDuration: number;
    }>;
  };

  await saveTenantPricingSettings({
    tenantId: session.tenantId,
    pricingRate: body.pricingRate,
    serviceTemplates: body.serviceTemplates ?? []
  });

  return NextResponse.json({ ok: true });
}
