import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { TENANT_SESSION_COOKIE, verifySessionToken } from "@flowlab/auth";
import { createQuoteDraft } from "@flowlab/db";

export async function POST(request: Request) {
  const token = (await cookies()).get(TENANT_SESSION_COOKIE)?.value;
  const session = token ? verifySessionToken(token) : null;

  if (!session || session.scope !== "tenant" || !session.tenantId) {
    return NextResponse.redirect(new URL("/login", request.url), 303);
  }

  const formData = await request.formData();
  await createQuoteDraft({
    tenantId: session.tenantId,
    customerId: String(formData.get("customerId") ?? ""),
    serviceRequest: String(formData.get("serviceRequest") ?? ""),
    areaSquareMetres: Number(formData.get("areaSquareMetres") ?? 80),
    siteCondition: String(formData.get("siteCondition") ?? "standard") as "standard" | "overgrown" | "heavily_overgrown"
  });

  return NextResponse.redirect(new URL("/dashboard/quotes", request.url), 303);
}
