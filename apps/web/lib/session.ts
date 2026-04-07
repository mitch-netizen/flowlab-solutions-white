import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { PLATFORM_SESSION_COOKIE, verifySessionToken } from "@flowlab/auth";

export async function getPlatformSession() {
  const store = await cookies();
  const token = store.get(PLATFORM_SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const session = verifySessionToken(token);
  return session?.scope === "platform" ? session : null;
}

export async function requirePlatformSession() {
  const session = await getPlatformSession();

  if (!session) {
    redirect("/admin/login");
  }

  return session;
}
