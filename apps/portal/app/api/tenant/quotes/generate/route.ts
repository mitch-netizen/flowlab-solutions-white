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
    // area_based inputs (ignored by other models)
    areaSquareMetres: formData.get("areaSquareMetres") ? Number(formData.get("areaSquareMetres")) : undefined,
    siteCondition: formData.get("siteCondition")
      ? (String(formData.get("siteCondition")) as "standard" | "overgrown" | "heavily_overgrown")
      : undefined,
    // hourly inputs (ignored by other models)
    estimatedHours: formData.get("estimatedHours") ? Number(formData.get("estimatedHours")) : undefined
  });

  return NextResponse.redirect(new URL("/dashboard/quotes", request.url), 303);
}
