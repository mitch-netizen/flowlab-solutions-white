import { requireTenantSession } from "../../../../../lib/session";

import { NextResponse } from "next/server";

import { updateTenantProfileSettings } from "@flowlab/db";
import { businessTypeSchema } from "@flowlab/contracts";

export async function POST(request: Request) {
  const session = await requireTenantSession();

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
    serviceBaseAddress?: string;
    serviceBasePlaceId?: string;
    serviceBaseLat?: number | null;
    serviceBaseLng?: number | null;
    serviceRadiusKm?: number | null;
    suburb?: string;
    postcode?: string;
    businessType?: string;
  };

  const businessType = body.businessType ? businessTypeSchema.parse(body.businessType) : undefined;

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
    serviceAreaSuburbs: body.serviceAreaSuburbs,
    serviceBaseAddress: body.serviceBaseAddress,
    serviceBasePlaceId: body.serviceBasePlaceId,
    serviceBaseLat: body.serviceBaseLat,
    serviceBaseLng: body.serviceBaseLng,
    serviceRadiusKm: body.serviceRadiusKm,
    suburb: body.suburb,
    postcode: body.postcode,
    businessType
  });

  return NextResponse.json({ ok: true });
}
