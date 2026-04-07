import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const dbUrl = process.env.DATABASE_URL ?? "NOT_SET";
  const masked = dbUrl.replace(/:([^:@]+)@/, ":***@");

  try {
    const { prisma } = await import("@flowlab/db");
    const count = await prisma.tenant.count();
    return NextResponse.json({ ok: true, tenantCount: count, dbUrl: masked });
  } catch (e: unknown) {
    const err = e as Error;
    return NextResponse.json(
      { ok: false, error: err.message, dbUrl: masked },
      { status: 500 }
    );
  }
}
