import { NextResponse } from "next/server";

import { prisma } from "@flowlab/db";
import { requireTenantSession } from "../../../../../../../lib/session";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireTenantSession();
  const { id } = await params;

  const thread = await prisma.supportThread.findFirst({
    where: { id, tenantId: session.tenantId }
  });
  if (!thread) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await request.json().catch(() => null)) as { message?: string } | null;
  const message = body?.message?.trim();
  if (!message) return NextResponse.json({ error: "message is required" }, { status: 400 });

  const [msg] = await prisma.$transaction([
    prisma.supportMessage.create({
      data: { threadId: id, body: message, fromAdmin: false }
    }),
    prisma.supportThread.update({
      where: { id },
      data: { updatedAt: new Date(), status: "open" }
    })
  ]);

  return NextResponse.json({ message: msg }, { status: 201 });
}
