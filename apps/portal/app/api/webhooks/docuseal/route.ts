import { NextResponse } from "next/server";

import { markAgreementSignedByToken } from "@flowlab/db";
import { verifyDocuSealEventSecret } from "@flowlab/integrations";

export async function POST(request: Request) {
  const allowed = verifyDocuSealEventSecret({
    expectedHeaderName: process.env.DOCUSEAL_WEBHOOK_SECRET_KEY,
    expectedHeaderValue: process.env.DOCUSEAL_WEBHOOK_SECRET_VALUE,
    headers: request.headers
  });

  if (!allowed) {
    return NextResponse.json({ ok: false, error: "Invalid DocuSeal webhook secret" }, { status: 401 });
  }

  const payload = await request.json();
  const eventType = payload?.event_type ?? payload?.type ?? payload?.event;
  const token =
    payload?.submission?.external_id ??
    payload?.data?.external_id ??
    payload?.submission?.submitters?.[0]?.external_id ??
    payload?.external_id;

  if ((eventType === "submission.completed" || eventType === "form.completed" || eventType === "submission.created") && token) {
    if (String(eventType).includes("completed")) {
      await markAgreementSignedByToken(String(token));
    }
  }

  return NextResponse.json({ ok: true });
}
