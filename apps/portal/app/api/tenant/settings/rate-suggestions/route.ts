import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { TENANT_SESSION_COOKIE, verifySessionToken } from "@flowlab/auth";
import { getPendingRateSuggestions, prisma, resolveRateSuggestions, saveTenantPricingSettings } from "@flowlab/db";
import type { RateSuggestion } from "@flowlab/db";

export async function GET(request: Request) {
  const token = (await cookies()).get(TENANT_SESSION_COOKIE)?.value;
  const session = token ? verifySessionToken(token) : null;

  if (!session || session.scope !== "tenant" || !session.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const suggestions = await getPendingRateSuggestions(session.tenantId);
  return NextResponse.json({ suggestions });
}

export async function POST(request: Request) {
  const token = (await cookies()).get(TENANT_SESSION_COOKIE)?.value;
  const session = token ? verifySessionToken(token) : null;

  if (!session || session.scope !== "tenant" || !session.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { action: "apply" | "dismiss" };

  if (body.action === "apply") {
    // Apply suggestions to pricing rate
    const suggestions = await getPendingRateSuggestions(session.tenantId);
    const currentRate = await prisma.pricingRate.findFirst({ where: { tenantId: session.tenantId } });

    if (currentRate && suggestions.length > 0) {
      const updates: Partial<{
        baseRatePerSquareM: number;
        overgrownRate: number;
        heavilyOvergrownRate: number;
        minimumCharge: number;
      }> = {};

      for (const s of suggestions as RateSuggestion[]) {
        if (s.field === "baseRatePerSquareM") updates.baseRatePerSquareM = s.suggested;
        if (s.field === "overgrownRate") updates.overgrownRate = s.suggested;
        if (s.field === "heavilyOvergrownRate") updates.heavilyOvergrownRate = s.suggested;
        if (s.field === "minimumCharge") updates.minimumCharge = s.suggested;
      }

      await prisma.pricingRate.update({ where: { id: currentRate.id }, data: updates });
    }
  }

  await resolveRateSuggestions(session.tenantId, body.action === "apply" ? "applied" : "dismissed");

  return NextResponse.json({ ok: true });
}
