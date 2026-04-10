import { requireTenantSession } from "../../../../../../lib/session";

import { NextResponse } from "next/server";

import { validateTenantAgreementTemplate } from "@flowlab/db";

export async function POST(request: Request) {
  const session = await requireTenantSession();

  const formData = await request.formData();
  const templateId = String(formData.get("templateId") ?? "");
  await validateTenantAgreementTemplate(session.tenantId, templateId);

  return NextResponse.redirect(new URL("/dashboard/agreements", request.url), 303);
}
