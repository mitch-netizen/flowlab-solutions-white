import { NextResponse } from "next/server";
import { prisma } from "@flowlab/db";
import { createSupabaseAdminClient } from "@flowlab/auth";

export async function GET() {
  const checks: Record<string, "ok" | "error"> = {};

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.db = "ok";
  } catch {
    checks.db = "error";
  }

  try {
    const admin = createSupabaseAdminClient();
    // Lightweight check — list users with limit 1
    const { error } = await admin.auth.admin.listUsers({ perPage: 1 });
    checks.supabase = error ? "error" : "ok";
  } catch {
    checks.supabase = "error";
  }

  const allOk = Object.values(checks).every((v) => v === "ok");

  return NextResponse.json(
    { ok: allOk, ...checks },
    { status: allOk ? 200 : 503 }
  );
}
