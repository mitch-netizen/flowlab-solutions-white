import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set("x-flowlab-host", request.headers.get("host") ?? "");
  return NextResponse.next({
    request: {
      headers
    }
  });
}

export const config = {
  matcher: ["/((?!_next|favicon.ico).*)"]
};
