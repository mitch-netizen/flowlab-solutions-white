import { NextResponse } from "next/server";

import { recordTenantUsage, resolveIntegrationCredentials } from "@flowlab/db";
import { buildServiceAreaPreview, geocodePlace, suggestServiceAreaSuburbs } from "@flowlab/integrations/google-maps";

import { requireTenantSession } from "../../../../../lib/session";

export async function POST(request: Request) {
  const session = await requireTenantSession();
  const body = (await request.json()) as {
    placeId?: string;
    address?: string;
    radiusKm?: number;
    manualSuburbs?: string[];
  };

  const resolved = await resolveIntegrationCredentials({
    tenantId: session.tenantId,
    service: "google_maps",
    envFallback: { apiKey: process.env.GOOGLE_MAPS_API_KEY }
  });

  const place = await geocodePlace({
    placeId: body.placeId,
    address: body.address,
    apiKey: resolved.credentials.apiKey
  });

  if (!place) {
    return NextResponse.json({ error: "location_not_found" }, { status: 404 });
  }

  const suggestedSuburbs = suggestServiceAreaSuburbs({
    baseSuburb: place.suburb,
    formattedAddress: place.formattedAddress,
    manualSuburbs: body.manualSuburbs
  });
  const previewUrl = buildServiceAreaPreview({
    lat: place.lat,
    lng: place.lng,
    address: place.formattedAddress,
    radiusKm: body.radiusKm,
    apiKey: resolved.credentials.apiKey
  });

  await recordTenantUsage({
    tenantId: session.tenantId,
    service: "google_maps",
    operation: "geocode",
    metadata: { source: resolved.source }
  });

  return NextResponse.json({ place, suggestedSuburbs, previewUrl });
}
