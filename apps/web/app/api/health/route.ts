import { NextResponse } from "next/server";
import { prisma } from "@flowlab/db";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, db: "ok" }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    return NextResponse.json({ ok: false, db: "error", error: message }, { status: 503 });
  }
}
