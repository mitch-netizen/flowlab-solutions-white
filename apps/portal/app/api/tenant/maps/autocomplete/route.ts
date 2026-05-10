import { NextResponse } from "next/server";

import { recordTenantUsage, resolveIntegrationCredentials } from "@flowlab/db";
import { autocompleteServiceArea } from "@flowlab/integrations/google-maps";

import { requireTenantSession } from "../../../../../lib/session";

export async function GET(request: Request) {
  const session = await requireTenantSession();
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? "").trim();

  if (query.length < 3) {
    return NextResponse.json({ suggestions: [] });
  }

  const resolved = await resolveIntegrationCredentials({
    tenantId: session.tenantId,
    service: "google_maps",
    envFallback: { apiKey: process.env.GOOGLE_MAPS_API_KEY }
  });

  const suggestions = await autocompleteServiceArea({
    query,
    apiKey: resolved.credentials.apiKey
  });

  await recordTenantUsage({
    tenantId: session.tenantId,
    service: "google_maps",
    operation: "autocomplete",
    metadata: { source: resolved.source }
  });

  return NextResponse.json({ suggestions });
}
