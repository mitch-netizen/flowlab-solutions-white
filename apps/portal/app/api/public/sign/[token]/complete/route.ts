import { NextResponse } from "next/server";

import { consumeRateLimit, markAgreementSignedByToken } from "@flowlab/db";
import { getClientIpFromRequest, publicRouteTokenSchema } from "@flowlab/contracts/server";

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const parsedParams = publicRouteTokenSchema.safeParse(await params);

  if (!parsedParams.success) {
    return NextResponse.redirect(new URL("/?error=invalid_agreement", request.url), 303);
  }

  const { token } = parsedParams.data;
  const throttle = await consumeRateLimit({
    scope: "agreement_sign",
    key: `agreement_sign:${token}:${getClientIpFromRequest(request)}`,
    limit: 5,
    windowMs: 1000 * 60 * 10,
    blockMs: 1000 * 60 * 10
  });

  if (!throttle.allowed) {
    return NextResponse.redirect(new URL(`/sign/${token}?error=rate_limited`, request.url), 303);
  }

  try {
    await markAgreementSignedByToken(token);
    return NextResponse.redirect(new URL(`/sign/${token}?signed=1`, request.url), 303);
  } catch {
    return NextResponse.redirect(new URL(`/sign/${token}?error=expired`, request.url), 303);
  }
}
