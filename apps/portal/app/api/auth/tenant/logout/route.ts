import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { createSupabaseServerClient, TENANT_SESSION_COOKIE } from "@flowlab/auth";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  // Clean up any legacy cookie from before the Supabase Auth migration
  const store = await cookies();
  store.delete(TENANT_SESSION_COOKIE);

  redirect("/login");
}
