import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { TENANT_SESSION_COOKIE, verifySessionToken } from "@flowlab/auth";
import { validateTenantAgreementTemplate } from "@flowlab/db";

export async function POST(request: Request) {
  const token = (await cookies()).get(TENANT_SESSION_COOKIE)?.value;
  const session = token ? verifySessionToken(token) : null;

  if (!session || session.scope !== "tenant" || !session.tenantId) {
    return NextResponse.redirect(new URL("/login", request.url), 303);
  }

  const formData = await request.formData();
  const templateId = String(formData.get("templateId") ?? "");
  await validateTenantAgreementTemplate(session.tenantId, templateId);

  return NextResponse.redirect(new URL("/dashboard/agreements", request.url), 303);
}
