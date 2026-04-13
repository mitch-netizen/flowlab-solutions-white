import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const DEV_TENANT_COOKIE = "__flowlab_dev_tenant";

export async function middleware(request: NextRequest) {
  // Resolve the effective host for tenant resolution.
  // In dev (NODE_ENV !== production), subdomain routing doesn't work on plain
  // localhost. We support two mechanisms so devs don't need *.localhost DNS:
  //   1. ?tenant=slug query param (sets a session cookie for subsequent requests)
  //   2. __flowlab_dev_tenant cookie (persisted from a prior ?tenant= visit)
  // e.g. opening http://localhost:3001?tenant=lawnorder once is enough —
  // the cookie carries the tenant for the rest of the session.
  const host = request.headers.get("host") ?? "";
  const rootDomain = process.env.DEFAULT_ROOT_DOMAIN ?? "localhost";
  const isDev = process.env.NODE_ENV !== "production";
  const tenantParam = isDev ? request.nextUrl.searchParams.get("tenant") : null;
  const tenantCookie = isDev ? request.cookies.get(DEV_TENANT_COOKIE)?.value : null;
  const devTenantSlug = tenantParam ?? tenantCookie ?? null;
  const effectiveHost =
    isDev && devTenantSlug ? `${devTenantSlug}.${rootDomain}` : host;

  // Inject x-flowlab-host as a request header so that Server Components and
  // Route Handlers can read it via headers(). The NextResponse.next() request
  // override is the Next.js-documented way to forward custom request headers.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-flowlab-host", effectiveHost);

  // Start with a response that passes the augmented headers through
  let supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } });

  // Persist the dev tenant cookie so the param isn't needed on every URL
  if (isDev && tenantParam) {
    supabaseResponse.cookies.set(DEV_TENANT_COOKIE, tenantParam, {
      path: "/",
      sameSite: "lax",
      httpOnly: false, // readable by JS for debugging
    });
  }

  // @supabase/ssr requires the middleware to refresh the session on every
  // request so the access-token cookie is kept alive.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Write cookies into the request (for downstream Server Components)
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // Rebuild response so Set-Cookie headers are forwarded to the browser
          supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
          // Re-apply the dev tenant cookie after response rebuild
          if (isDev && tenantParam) {
            supabaseResponse.cookies.set(DEV_TENANT_COOKIE, tenantParam, {
              path: "/",
              sameSite: "lax",
              httpOnly: false,
            });
          }
        },
      },
    }
  );

  // IMPORTANT: call getUser() to trigger the token refresh — do not remove
  await supabase.auth.getUser();

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
