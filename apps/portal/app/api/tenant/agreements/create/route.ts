import { requireTenantSession } from "../../../../../lib/session";

import { NextResponse } from "next/server";

import { createAgreementForQuote } from "@flowlab/db";

export async function POST(request: Request) {
  const session = await requireTenantSession();

  const formData = await request.formData();
  await createAgreementForQuote(String(formData.get("quoteId") ?? ""));

  return NextResponse.redirect(new URL("/dashboard/agreements", request.url), 303);
}
