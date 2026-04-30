import { NextResponse } from "next/server";

import { acceptQuoteByToken, consumeRateLimit } from "@flowlab/db";
import { getClientIpFromRequest, publicRouteTokenSchema } from "@flowlab/contracts/server";

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const parsedParams = publicRouteTokenSchema.safeParse(await params);

  if (!parsedParams.success) {
    return NextResponse.redirect(new URL("/?error=invalid_quote", request.url), 303);
  }

  const { token } = parsedParams.data;
  const throttle = await consumeRateLimit({
    scope: "quote_accept",
    key: `quote_accept:${token}:${getClientIpFromRequest(request)}`,
    limit: 5,
    windowMs: 1000 * 60 * 10,
    blockMs: 1000 * 60 * 10
  });

  if (!throttle.allowed) {
    return NextResponse.redirect(new URL(`/quote/${token}?error=rate_limited`, request.url), 303);
  }

  try {
    await acceptQuoteByToken(token);
    return NextResponse.redirect(new URL(`/quote/${token}?accepted=1`, request.url), 303);
  } catch {
    return NextResponse.redirect(new URL(`/quote/${token}?error=expired`, request.url), 303);
  }
}
