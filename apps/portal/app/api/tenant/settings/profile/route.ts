import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { TENANT_SESSION_COOKIE, verifySessionToken } from "@flowlab/auth";
import { updateTenantProfileSettings } from "@flowlab/db";

export async function POST(request: Request) {
  const token = (await cookies()).get(TENANT_SESSION_COOKIE)?.value;
  const session = token ? verifySessionToken(token) : null;

  if (!session || session.scope !== "tenant" || !session.tenantId) {
    return NextResponse.redirect(new URL("/login", request.url), 303);
  }

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
