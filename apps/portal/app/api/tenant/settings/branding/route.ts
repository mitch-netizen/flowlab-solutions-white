import { NextResponse } from "next/server";

import { prisma } from "@flowlab/db";

import { requireTenantSession } from "../../../../../lib/session";

export async function POST(request: Request) {
  const session = await requireTenantSession();

  const formData = await request.formData();
  const primaryColour = String(formData.get("primaryColour") ?? "").trim() || undefined;
  const secondaryColour = String(formData.get("secondaryColour") ?? "").trim() || undefined;
  const accentColour = String(formData.get("accentColour") ?? "").trim() || undefined;

  await prisma.tenantProfile.update({
    where: { tenantId: session.tenantId },
    data: {
      ...(primaryColour ? { primaryColour } : {}),
      ...(secondaryColour ? { secondaryColour } : {}),
      ...(accentColour ? { accentColour } : {})
    }
  });

  return NextResponse.redirect(new URL("/dashboard/settings?branding=saved", request.url), 303);
}
