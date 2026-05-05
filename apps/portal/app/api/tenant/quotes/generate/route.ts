import { requireTenantSession } from "../../../../../lib/session";

import { NextResponse } from "next/server";

import { createQuoteDraft } from "@flowlab/db";

function toTrimmedString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function wantsJsonResponse(request: Request) {
  const accept = request.headers.get("accept") ?? "";
  return accept.includes("application/json");
}

function errorRedirect(request: Request, errorCode: string) {
  return NextResponse.redirect(new URL(`/dashboard/quotes?error=${encodeURIComponent(errorCode)}`, request.url), 303);
}

export async function POST(request: Request) {
  const session = await requireTenantSession();
  const expectsJson = wantsJsonResponse(request);
  const formData = await request.formData();

  const customerId = toTrimmedString(formData, "customerId");
  const enquiryIdRaw = toTrimmedString(formData, "enquiryId");
  const serviceRequest = toTrimmedString(formData, "serviceRequest");
  const areaSquareMetresRaw = toTrimmedString(formData, "areaSquareMetres");
  const estimatedHoursRaw = toTrimmedString(formData, "estimatedHours");
  const siteConditionRaw = toTrimmedString(formData, "siteCondition");

  if (!customerId) {
    return expectsJson
      ? NextResponse.json({ error: "customer_id_required" }, { status: 400 })
      : errorRedirect(request, "customer_id_required");
  }

  if (!serviceRequest) {
    return expectsJson
      ? NextResponse.json({ error: "service_request_required" }, { status: 400 })
      : errorRedirect(request, "service_request_required");
  }

  let areaSquareMetres: number | undefined;
  if (areaSquareMetresRaw) {
    const parsedAreaSquareMetres = Number(areaSquareMetresRaw);
    if (!Number.isFinite(parsedAreaSquareMetres) || parsedAreaSquareMetres <= 0) {
      return expectsJson
        ? NextResponse.json({ error: "invalid_area_square_metres" }, { status: 400 })
        : errorRedirect(request, "invalid_area_square_metres");
    }
    areaSquareMetres = parsedAreaSquareMetres;
  }

  let estimatedHours: number | undefined;
  if (estimatedHoursRaw) {
    const parsedEstimatedHours = Number(estimatedHoursRaw);
    if (!Number.isFinite(parsedEstimatedHours) || parsedEstimatedHours <= 0) {
      return expectsJson
        ? NextResponse.json({ error: "invalid_estimated_hours" }, { status: 400 })
        : errorRedirect(request, "invalid_estimated_hours");
    }
    estimatedHours = parsedEstimatedHours;
  }

  if (areaSquareMetresRaw && areaSquareMetres == null) {
    return expectsJson
      ? NextResponse.json({ error: "invalid_area_square_metres" }, { status: 400 })
      : errorRedirect(request, "invalid_area_square_metres");
  }

  if (estimatedHoursRaw && estimatedHours == null) {
    return expectsJson
      ? NextResponse.json({ error: "invalid_estimated_hours" }, { status: 400 })
      : errorRedirect(request, "invalid_estimated_hours");
  }

  if (
    siteConditionRaw &&
    !["standard", "overgrown", "heavily_overgrown"].includes(siteConditionRaw)
  ) {
    return expectsJson
      ? NextResponse.json({ error: "invalid_site_condition" }, { status: 400 })
      : errorRedirect(request, "invalid_site_condition");
  }

  try {
    await createQuoteDraft({
      tenantId: session.tenantId,
      customerId,
      enquiryId: enquiryIdRaw || undefined,
      serviceRequest,
      // area_based inputs (ignored by other models)
      areaSquareMetres,
      siteCondition: siteConditionRaw
        ? (siteConditionRaw as "standard" | "overgrown" | "heavily_overgrown")
        : undefined,
      // hourly inputs (ignored by other models)
      estimatedHours
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown quote generation error";
    console.error("[quotes.generate] failed", {
      tenantId: session.tenantId,
      userId: session.sub,
      customerId,
      enquiryId: enquiryIdRaw || null,
      message
    });

    const errorCode =
      message.includes("Customer not found")
        ? "customer_not_found"
        : message.includes("Enquiry not found")
          ? "enquiry_not_found"
          : message.includes("Enquiry does not belong")
            ? "enquiry_customer_mismatch"
            : message.includes("already linked to a quote")
              ? "enquiry_already_quoted"
              : message.includes("Monthly AI quote limit reached")
                ? "ai_quote_limit_reached"
                : "quote_generate_failed";

    if (expectsJson) {
      const status = errorCode === "quote_generate_failed" ? 500 : 400;
      return NextResponse.json({ error: errorCode }, { status });
    }

    return errorRedirect(request, errorCode);
  }

  return NextResponse.redirect(new URL("/dashboard/quotes?created=1", request.url), 303);
}
