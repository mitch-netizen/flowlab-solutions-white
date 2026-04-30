import { NextResponse } from "next/server";

import { consumeRateLimit, submitFeedbackByToken } from "@flowlab/db";
import { feedbackSubmissionSchema, getClientIpFromRequest, publicRouteTokenSchema } from "@flowlab/contracts/server";

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const parsedParams = publicRouteTokenSchema.safeParse(await params);

  if (!parsedParams.success) {
    return NextResponse.redirect(new URL("/?error=invalid_feedback", request.url), 303);
  }

  const { token } = parsedParams.data;
  const throttle = await consumeRateLimit({
    scope: "feedback_submit",
    key: `feedback_submit:${token}:${getClientIpFromRequest(request)}`,
    limit: 6,
    windowMs: 1000 * 60 * 30,
    blockMs: 1000 * 60 * 30
  });

  if (!throttle.allowed) {
    return NextResponse.redirect(new URL(`/feedback/${token}?error=rate_limited`, request.url), 303);
  }

  const formData = await request.formData();
  const parsed = feedbackSubmissionSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!parsed.success) {
    return NextResponse.redirect(new URL(`/feedback/${token}?error=rating`, request.url), 303);
  }

  try {
    await submitFeedbackByToken(token, parsed.data);

    return NextResponse.redirect(new URL(`/feedback/${token}?submitted=1&rating=${parsed.data.rating}`, request.url), 303);
  } catch {
    return NextResponse.redirect(new URL(`/feedback/${token}?error=expired`, request.url), 303);
  }
}
