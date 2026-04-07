import { NextResponse } from "next/server";

import { acceptQuoteByToken } from "@flowlab/db";

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  await acceptQuoteByToken(token);
  return NextResponse.redirect(new URL(`/quote/${token}?accepted=1`, request.url), 303);
}
