import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { TENANT_SESSION_COOKIE, verifySessionToken } from "@flowlab/auth";
import { createGeneratedTenantAgreementTemplate } from "@flowlab/db";

export async function POST(request: Request) {
  const token = (await cookies()).get(TENANT_SESSION_COOKIE)?.value;
  const session = token ? verifySessionToken(token) : null;

  if (!session || session.scope !== "tenant" || !session.tenantId) {
    return NextResponse.redirect(new URL("/login", request.url), 303);
  }

  const formData = await request.formData();
  const template = await createGeneratedTenantAgreementTemplate({
    tenantId: session.tenantId,
    templateName: String(formData.get("templateName") ?? "").trim() || undefined,
    signerMode: String(formData.get("signerMode") ?? "customer_only") === "customer_and_business" ? "customer_and_business" : "customer_only"
  });

  return NextResponse.redirect(new URL(`/dashboard/agreements/templates/${template.id}/builder`, request.url), 303);
}
