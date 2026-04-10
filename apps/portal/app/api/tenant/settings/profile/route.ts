import { requireTenantSession } from "../../../../../lib/session";

import { NextResponse } from "next/server";

import { updateTenantProfileSettings } from "@flowlab/db";

export async function POST(request: Request) {
  const session = await requireTenantSession();

  const formData = await request.formData();
  const serviceAreaSuburbs = String(formData.get("serviceAreaSuburbs") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  await updateTenantProfileSettings({
    tenantId: session.tenantId,
    businessName: String(formData.get("businessName") ?? ""),
    tagline: String(formData.get("tagline") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    email: String(formData.get("email") ?? ""),
    primaryColour: formData.has("primaryColour") ? String(formData.get("primaryColour") ?? "") : undefined,
    secondaryColour: formData.has("secondaryColour") ? String(formData.get("secondaryColour") ?? "") : undefined,
    accentColour: formData.has("accentColour") ? String(formData.get("accentColour") ?? "") : undefined,
    customDomain: String(formData.get("customDomain") ?? ""),
    serviceAreaSuburbs
  });

  return NextResponse.redirect(new URL("/dashboard/settings", request.url), 303);
}
