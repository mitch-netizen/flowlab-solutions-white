import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@flowlab/auth";
import { prisma } from "@flowlab/db";
import type { PlatformSession } from "@flowlab/contracts";

export async function getPlatformSession(): Promise<PlatformSession | null> {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) return null;

  // Verify this Supabase auth user is actually a PlatformUser
  const platformUser = await prisma.platformUser.findFirst({
    where: { authUserId: user.id },
  });

  if (!platformUser) return null;

  return {
    sub: platformUser.id,
    authUserId: user.id,
    email: platformUser.email,
    scope: "platform",
    role: platformUser.role,
  } satisfies PlatformSession;
}

export async function requirePlatformSession() {
  const session = await getPlatformSession();
  if (!session) redirect("/admin/login");
  return session;
}
