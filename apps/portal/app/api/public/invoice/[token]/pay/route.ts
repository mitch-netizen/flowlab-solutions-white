import { NextResponse } from "next/server";

import { getInvoicePaymentContextByToken, markInvoicePaidByToken } from "@flowlab/db";

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invoice = await getInvoicePaymentContextByToken(token);

  if (!invoice) {
    return NextResponse.json({ ok: false, error: "Invoice not found" }, { status: 404 });
  }

  if (invoice.paymentLink) {
    return NextResponse.redirect(invoice.paymentLink, 303);
  }

  if (process.env.ALLOW_FAKE_PAYMENTS === "true") {
    await markInvoicePaidByToken(token);
    return NextResponse.redirect(new URL(`/invoice/${token}?paid=1`, request.url), 303);
  }

  return NextResponse.json({ ok: false, error: "Payment link unavailable" }, { status: 400 });
}
