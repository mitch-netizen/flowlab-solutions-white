import { NextResponse } from "next/server";

import { markAgreementSignedByToken } from "@flowlab/db";

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  await markAgreementSignedByToken(token);
  return NextResponse.redirect(new URL(`/sign/${token}?signed=1`, request.url), 303);
}
