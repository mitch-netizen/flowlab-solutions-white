import { requireTenantSession } from "../../../../../../lib/session";

import { NextResponse } from "next/server";

import { createGeneratedTenantAgreementTemplate } from "@flowlab/db";

export async function POST(request: Request) {
  const session = await requireTenantSession();

  const formData = await request.formData();
  const template = await createGeneratedTenantAgreementTemplate({
    tenantId: session.tenantId,
    templateName: String(formData.get("templateName") ?? "").trim() || undefined,
    signerMode: String(formData.get("signerMode") ?? "customer_only") === "customer_and_business" ? "customer_and_business" : "customer_only"
  });

  return NextResponse.redirect(new URL(`/dashboard/agreements/templates/${template.id}/builder`, request.url), 303);
}
