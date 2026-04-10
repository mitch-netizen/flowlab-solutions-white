import { requireTenantSession } from "../../../../../lib/session";

import { NextResponse } from "next/server";

import { saveTenantPricingSettings } from "@flowlab/db";

export async function POST(request: Request) {
  const session = await requireTenantSession();

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
