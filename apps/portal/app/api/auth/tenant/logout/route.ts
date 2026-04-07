import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { TENANT_SESSION_COOKIE } from "@flowlab/auth";

export async function GET() {
  const store = await cookies();
  store.delete(TENANT_SESSION_COOKIE);
  redirect("/login");
}
