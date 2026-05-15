import { NextResponse } from "next/server";

import { prisma } from "@flowlab/db";
import { requireTenantSession } from "../../../../../lib/session";

export async function GET() {
  const session = await requireTenantSession();

  const threads = await prisma.supportThread.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { updatedAt: "desc" },
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1
      },
      _count: { select: { messages: true } }
    }
  });

  return NextResponse.json({ threads });
}

export async function POST(request: Request) {
  const session = await requireTenantSession();

  const body = (await request.json().catch(() => null)) as { subject?: string; message?: string } | null;
  const subject = body?.subject?.trim();
  const message = body?.message?.trim();

  if (!subject || !message) {
    return NextResponse.json({ error: "subject and message are required" }, { status: 400 });
  }

  const thread = await prisma.supportThread.create({
    data: {
      tenantId: session.tenantId,
      subject,
      messages: {
        create: { body: message, fromAdmin: false }
      }
    },
    include: { messages: true }
  });

  return NextResponse.json({ thread }, { status: 201 });
}
