import { NextResponse } from "next/server";

import { consumeRateLimit, createEnquiry } from "@flowlab/db";
import { getClientIpFromRequest, publicEnquiryInputSchema, validateBotGuard } from "@flowlab/contracts/server";

export async function POST(request: Request) {
  const formData = await request.formData();
  const parsed = publicEnquiryInputSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!parsed.success) {
    return NextResponse.redirect(new URL("/enquiry?error=invalid", request.url), 303);
  }

  try {
    validateBotGuard(parsed.data);
  } catch {
    return NextResponse.redirect(new URL("/enquiry?error=invalid", request.url), 303);
  }

  const throttle = await consumeRateLimit({
    scope: "public_enquiry",
    key: `public_enquiry:${parsed.data.tenantId}:${getClientIpFromRequest(request)}`,
    limit: 8,
    windowMs: 1000 * 60 * 30,
    blockMs: 1000 * 60 * 30
  });

  if (!throttle.allowed) {
    return NextResponse.redirect(new URL("/enquiry?error=rate_limited", request.url), 303);
  }

  try {
    await createEnquiry({
      tenantId: parsed.data.tenantId,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      email: parsed.data.email,
      phone: parsed.data.phone,
      address: parsed.data.address,
      suburb: parsed.data.suburb,
      serviceRequest: parsed.data.serviceRequest
    });
  } catch (error) {
    return NextResponse.redirect(
      new URL(`/enquiry?error=${encodeURIComponent(error instanceof Error ? "limit" : "invalid")}`, request.url),
      303
    );
  }

  return NextResponse.redirect(new URL("/enquiry?submitted=1", request.url), 303);
}
