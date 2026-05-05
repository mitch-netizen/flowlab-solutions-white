import { NextResponse } from "next/server";

import { createSimpleQuote } from "@flowlab/db";

import { requireTenantSession } from "../../../../../lib/session";

function toStringValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function normalizePhone(phone: string) {
  return phone.replace(/\D+/g, "");
}

export async function POST(request: Request) {
  const session = await requireTenantSession();
  const formData = await request.formData();

  const customerName = toStringValue(formData, "customerName");
  const customerMobileRaw = toStringValue(formData, "customerMobile");
  const customerMobile = customerMobileRaw ? normalizePhone(customerMobileRaw) : "";
  const customerEmail = toStringValue(formData, "customerEmail");
  const jobLocation = toStringValue(formData, "jobLocation");
  const jobDescription = toStringValue(formData, "jobDescription");
  const quoteAmountRaw = toStringValue(formData, "quoteAmount");

  if (!customerName) return NextResponse.redirect(new URL("/dashboard/quotes/new?error=customer_name", request.url), 303);
  if (!customerMobile && !customerEmail) return NextResponse.redirect(new URL("/dashboard/quotes/new?error=contact", request.url), 303);
  if (!jobLocation) return NextResponse.redirect(new URL("/dashboard/quotes/new?error=location", request.url), 303);
  if (!jobDescription) return NextResponse.redirect(new URL("/dashboard/quotes/new?error=description", request.url), 303);

  const quoteAmount = Number(quoteAmountRaw);
  if (!Number.isFinite(quoteAmount) || quoteAmount <= 0) {
    return NextResponse.redirect(new URL("/dashboard/quotes/new?error=amount", request.url), 303);
  }

  try {
    const quote = await createSimpleQuote({
      tenantId: session.tenantId,
      customerName,
      customerEmail: customerEmail || undefined,
      customerMobile: customerMobile || undefined,
      jobLocation,
      jobDescription,
      quoteAmount
    });

    if (quote.accessToken) {
      return NextResponse.redirect(new URL(`/quote/${quote.accessToken}?created=1`, request.url), 303);
    }

    return NextResponse.redirect(new URL('/dashboard/quotes?created=1', request.url), 303);
  } catch (error) {
    if (error instanceof Error && error.message === "Add a customer email for new customers") {
      return NextResponse.redirect(new URL('/dashboard/quotes/new?error=new_customer_email', request.url), 303);
    }
    if (error instanceof Error && error.message === "Customer email and phone match different records") {
      return NextResponse.redirect(new URL('/dashboard/quotes/new?error=customer_conflict', request.url), 303);
    }

    throw error;
  }
}
