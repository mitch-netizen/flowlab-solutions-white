import { requireTenantSession } from "../../../../../../lib/session";

import { NextResponse } from "next/server";

import { setDefaultTenantAgreementTemplate } from "@flowlab/db";

export async function POST(request: Request) {
  const session = await requireTenantSession();

  const formData = await request.formData();
  await setDefaultTenantAgreementTemplate(session.tenantId, String(formData.get("templateId") ?? ""));

  return NextResponse.redirect(new URL("/dashboard/agreements", request.url), 303);
}
