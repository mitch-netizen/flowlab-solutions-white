import { NextResponse } from "next/server";

import { prisma } from "@flowlab/db";
import { getPlatformSession } from "../../../../../lib/session";

export async function GET(request: Request) {
  const session = await getPlatformSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "superadmin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get("tenantId");
  const status = searchParams.get("status") ?? "open";

  const threads = await prisma.supportThread.findMany({
    where: {
      ...(tenantId ? { tenantId } : {}),
      ...(status !== "all" ? { status } : {})
    },
    orderBy: { updatedAt: "desc" },
    include: {
      tenant: {
        select: {
          slug: true,
          profile: { select: { businessName: true } }
        }
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1
      },
      _count: { select: { messages: true } }
    }
  });

  return NextResponse.json({ threads });
}
