import { NextResponse } from "next/server";

import { prisma } from "@flowlab/db";
import { getPlatformSession } from "../../../../../../lib/session";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getPlatformSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "superadmin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id: tenantId } = await params;
  const body = (await request.json().catch(() => null)) as { note?: string; kind?: "note" | "task" } | null;
  const note = body?.note?.trim();
  if (!note) return NextResponse.json({ error: "note required" }, { status: 400 });

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true } });
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  await prisma.platformEventLog.create({
    data: {
      tenantId,
      eventType: body?.kind === "task" ? "warning" : "info",
      service: "worker",
      direction: "inbound",
      status: "pending",
      requestSummary: body?.kind === "task" ? `Support task: ${note}` : `Support note: ${note}`,
      responseSummary: `Created by ${session.email}`,
      triggeredBy: `superadmin_${session.email}`
    }
  });

  return NextResponse.json({ ok: true });
}
