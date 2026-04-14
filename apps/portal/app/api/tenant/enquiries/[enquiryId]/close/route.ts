import { NextResponse } from "next/server";

import { closeTenantEnquiry } from "@flowlab/db";

import { requireTenantSession } from "../../../../../../lib/session";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ enquiryId: string }> }
) {
  const session = await requireTenantSession();
  const { enquiryId } = await params;
  const formData = await request.formData();
  const returnTo = String(formData.get("returnTo") ?? "/dashboard/crm");

  try {
    await closeTenantEnquiry({
      tenantId: session.tenantId,
      enquiryId
    });
    return NextResponse.redirect(new URL(`${returnTo}?closed=1`, request.url), 303);
  } catch {
    return NextResponse.redirect(new URL(`${returnTo}?error=enquiry_close_failed`, request.url), 303);
  }
}
