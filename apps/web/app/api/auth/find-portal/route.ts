import { NextResponse } from "next/server";

import { prisma } from "@flowlab/db";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: string } | null;
  const email = body?.email?.trim().toLowerCase();

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  const users = await prisma.tenantUser.findMany({
    where: { email },
    select: {
      tenant: {
        select: {
          slug: true,
          status: true,
          profile: { select: { businessName: true } }
        }
      }
    }
  });

  const portals = users
    .filter((u) => u.tenant.status !== "cancelled")
    .map((u) => ({
      slug: u.tenant.slug,
      businessName: u.tenant.profile?.businessName ?? u.tenant.slug,
      status: u.tenant.status
    }));

  return NextResponse.json({ portals });
}
