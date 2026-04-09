import { NextResponse } from "next/server";

import { consumeRateLimit, getInvoicePaymentContextByToken, markInvoicePaidByToken } from "@flowlab/db";
import { getClientIpFromRequest, publicRouteTokenSchema } from "@flowlab/contracts/server";

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const parsedParams = publicRouteTokenSchema.safeParse(await params);

  if (!parsedParams.success) {
    return NextResponse.redirect(new URL("/?error=invalid_invoice", request.url), 303);
  }

  const { token } = parsedParams.data;
  const throttle = await consumeRateLimit({
    scope: "invoice_pay",
    key: `invoice_pay:${token}:${getClientIpFromRequest(request)}`,
    limit: 8,
    windowMs: 1000 * 60 * 10,
    blockMs: 1000 * 60 * 10
  });

  if (!throttle.allowed) {
    return NextResponse.redirect(new URL(`/invoice/${token}?error=rate_limited`, request.url), 303);
  }

  const invoice = await getInvoicePaymentContextByToken(token);

  if (!invoice) {
    return NextResponse.redirect(new URL(`/invoice/${token}?error=expired`, request.url), 303);
  }

  if (invoice.paymentLink) {
    return NextResponse.redirect(invoice.paymentLink, 303);
  }

  if (process.env.ALLOW_FAKE_PAYMENTS === "true") {
    await markInvoicePaidByToken(token);
    return NextResponse.redirect(new URL(`/invoice/${token}?paid=1`, request.url), 303);
  }

  return NextResponse.redirect(new URL(`/invoice/${token}?error=unavailable`, request.url), 303);
}
