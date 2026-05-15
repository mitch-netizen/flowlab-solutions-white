import { NextResponse } from "next/server";

import { prisma } from "@flowlab/db";
import { getPlatformSession } from "../../../../../../../lib/session";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getPlatformSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "superadmin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as { message?: string } | null;
  const message = body?.message?.trim();
  if (!message) return NextResponse.json({ error: "message is required" }, { status: 400 });

  const thread = await prisma.supportThread.findUnique({ where: { id } });
  if (!thread) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [msg] = await prisma.$transaction([
    prisma.supportMessage.create({
      data: { threadId: id, body: message, fromAdmin: true }
    }),
    prisma.supportThread.update({
      where: { id },
      data: { updatedAt: new Date() }
    })
  ]);

  await prisma.platformEventLog.create({
    data: {
      tenantId: thread.tenantId,
      eventType: "info",
      service: "worker",
      direction: "inbound",
      status: "success",
      requestSummary: `Support reply sent by ${session.email}`,
      triggeredBy: `superadmin_${session.email}`
    }
  });

  return NextResponse.json({ message: msg }, { status: 201 });
}
