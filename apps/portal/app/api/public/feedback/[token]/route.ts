import { NextResponse } from "next/server";

import { processAutomationBatch } from "@flowlab/automation";
import { submitFeedbackByToken } from "@flowlab/db";

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const formData = await request.formData();
  const rating = Number(formData.get("rating"));
  const comment = String(formData.get("comment") ?? "");

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.redirect(new URL(`/feedback/${token}?error=rating`, request.url), 303);
  }

  try {
    const result = await submitFeedbackByToken(token, { rating, comment });

    if (result.reviewRequestQueued) {
      await processAutomationBatch(5);
    }

    return NextResponse.redirect(new URL(`/feedback/${token}?submitted=1&rating=${rating}`, request.url), 303);
  } catch {
    return NextResponse.redirect(new URL(`/feedback/${token}?error=expired`, request.url), 303);
  }
}
