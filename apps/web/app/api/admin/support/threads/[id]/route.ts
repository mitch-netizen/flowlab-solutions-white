import { NextResponse } from "next/server";

import { prisma } from "@flowlab/db";
import { getPlatformSession } from "../../../../../../lib/session";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getPlatformSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "superadmin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  const thread = await prisma.supportThread.findUnique({
    where: { id },
    include: {
      tenant: {
        select: {
          slug: true,
          profile: { select: { businessName: true } }
        }
      },
      messages: { orderBy: { createdAt: "asc" } }
    }
  });

  if (!thread) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ thread });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getPlatformSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "superadmin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as { status?: string } | null;

  if (!body?.status) return NextResponse.json({ error: "status required" }, { status: 400 });

  await prisma.supportThread.update({
    where: { id },
    data: { status: body.status }
  });

  return NextResponse.json({ ok: true });
}
