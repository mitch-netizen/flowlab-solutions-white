import { NextResponse } from "next/server";

import { processAutomationBatch } from "@flowlab/automation";
import { logWebhookFailure, markAgreementSignedByToken } from "@flowlab/db";
import { verifyDocuSealEventSecret } from "@flowlab/integrations";

export async function POST(request: Request) {
  const allowed = verifyDocuSealEventSecret({
    expectedHeaderName: process.env.DOCUSEAL_WEBHOOK_SECRET_KEY,
    expectedHeaderValue: process.env.DOCUSEAL_WEBHOOK_SECRET_VALUE,
    headers: request.headers
  });

  if (!allowed) {
    await logWebhookFailure({ service: "docuseal", errorMessage: "Invalid webhook secret", requestSummary: "DocuSeal webhook rejected — bad secret" });
    return NextResponse.json({ ok: false, error: "Invalid DocuSeal webhook secret" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    await logWebhookFailure({ service: "docuseal", errorMessage: "Invalid JSON body", requestSummary: "DocuSeal webhook rejected — unparseable body" });
    return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 });
  }

  const eventType = payload?.event_type ?? payload?.type ?? payload?.event;
  const token =
    (payload?.submission as Record<string, unknown>)?.external_id ??
    (payload?.data as Record<string, unknown>)?.external_id ??
    ((payload?.submission as Record<string, unknown>)?.submitters as Array<Record<string, unknown>>)?.[0]?.external_id ??
    payload?.external_id;

  if ((eventType === "submission.completed" || eventType === "form.completed" || eventType === "submission.created") && token) {
    if (String(eventType).includes("completed")) {
      try {
        await markAgreementSignedByToken(String(token));
        await processAutomationBatch(5);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await logWebhookFailure({ service: "docuseal", errorMessage: msg, requestSummary: `Failed to mark agreement signed for token ${String(token).slice(0, 8)}…` });
        console.error("[docuseal-webhook] processing error:", msg, { eventType, token });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
