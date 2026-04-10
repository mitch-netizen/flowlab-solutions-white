import { requireTenantSession } from "../../../../../lib/session";

import { NextResponse } from "next/server";

import { createQuoteDraft } from "@flowlab/db";

export async function POST(request: Request) {
  const session = await requireTenantSession();

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
