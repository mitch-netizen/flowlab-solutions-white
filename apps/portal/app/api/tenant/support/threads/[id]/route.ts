import { NextResponse } from "next/server";

import { prisma } from "@flowlab/db";
import { requireTenantSession } from "../../../../../../lib/session";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireTenantSession();
  const { id } = await params;

  const thread = await prisma.supportThread.findFirst({
    where: { id, tenantId: session.tenantId },
    include: {
      messages: { orderBy: { createdAt: "asc" } }
    }
  });

  if (!thread) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ thread });
}
