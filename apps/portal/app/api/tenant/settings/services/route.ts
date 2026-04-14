import { NextResponse } from "next/server";

import { prisma } from "@flowlab/db";
import { requireTenantSession } from "../../../../../lib/session";

// HTML forms can't send DELETE — handle _method=DELETE via POST as a method override
export async function POST(request: Request) {
  const session = await requireTenantSession();
  const body = await request.formData();
  const methodOverride = body.get("_method")?.toString();

  if (methodOverride === "DELETE") {
    const { searchParams } = new URL(request.url);
    const serviceId = searchParams.get("id");

    if (!serviceId) {
      return NextResponse.redirect(
        new URL("/dashboard/settings?error=missing_id", request.url),
        303
      );
    }

    await prisma.service.deleteMany({
      where: { id: serviceId, tenantId: session.tenantId }
    });

    return NextResponse.redirect(
      new URL("/dashboard/settings?service=deleted", request.url),
      303
    );
  }

  // CREATE
  const name = body.get("name")?.toString().trim();
  const defaultPriceRaw = body.get("defaultPrice")?.toString().trim();
  const defaultDurationRaw = body.get("defaultDuration")?.toString().trim();

  if (!name) {
    return NextResponse.redirect(
      new URL("/dashboard/settings?error=missing_name", request.url),
      303
    );
  }

  const defaultPrice = defaultPriceRaw ? parseFloat(defaultPriceRaw) : null;
  const defaultDuration = defaultDurationRaw ? parseInt(defaultDurationRaw, 10) : null;

  await prisma.service.create({
    data: {
      tenantId: session.tenantId,
      name,
      defaultPrice: defaultPrice != null && !isNaN(defaultPrice) ? defaultPrice : null,
      defaultDuration: defaultDuration != null && !isNaN(defaultDuration) ? defaultDuration : null
    }
  });

  return NextResponse.redirect(
    new URL("/dashboard/settings?service=created", request.url),
    303
  );
}
