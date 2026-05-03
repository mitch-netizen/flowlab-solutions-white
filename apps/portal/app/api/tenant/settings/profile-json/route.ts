import { requireTenantSession } from "../../../../../lib/session";

import { NextResponse } from "next/server";

import { updateTenantProfileSettings } from "@flowlab/db";

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
    suburb?: string;
    postcode?: string;
    businessType?: "lawn_mowing" | "cleaning" | "pest_control" | "gardening" | "handyman" | "pool_service" | "other";
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
    serviceAreaSuburbs: body.serviceAreaSuburbs,
    suburb: body.suburb,
    postcode: body.postcode,
    businessType: body.businessType
  });

  return NextResponse.json({ ok: true });
}
