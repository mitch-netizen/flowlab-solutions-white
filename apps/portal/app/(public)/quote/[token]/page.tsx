import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { getQuoteByToken } from "@flowlab/db";

import { QuoteSendActions } from "./quote-send-actions";

export default async function QuotePage({
  params,
  searchParams
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ accepted?: string; created?: string; error?: string }>;
}) {
  const { token } = await params;
  const query = await searchParams;
  const quote = await getQuoteByToken(token);

  if (!quote) {
    notFound();
  }

  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "";
  const forwardedProtocol = requestHeaders.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProtocol || (host.includes("localhost") ? "http" : "https");
  const quoteUrl = `${protocol}://${host}/quote/${quote.accessToken}`;
  const isAccepted = quote.status === "accepted";
  const showSendActions = query.created === "1" && !isAccepted;

  return (
    <main>
      <section className="rounded-lg border bg-card p-4">
        <div className="eyebrow">{quote.tenant.profile?.businessName}</div>
        <h1>{quote.title}</h1>
        <p style={{ color: "#cbd5e1" }}>{quote.description}</p>
        <div style={{ fontSize: 40, fontWeight: 700 }}>${quote.amount}</div>
        {query.created === "1" && !isAccepted ? (
          <div className="rounded-lg border bg-card/60 p-4" style={{ marginTop: 24 }}>
            <strong>Quote saved.</strong> Send it to your customer now.
          </div>
        ) : null}
        {query.error ? (
          <div className="rounded-lg border bg-card/60 p-4" style={{ marginTop: 24, color: "#fca5a5" }}>
            {query.error === "rate_limited"
              ? "Too many acceptance attempts were made. Please wait a moment and try again."
              : "This quote is no longer available to accept."}
          </div>
        ) : null}
        {!isAccepted ? (
          showSendActions ? (
            <div style={{ marginTop: 24 }} className="space-y-4">
              <QuoteSendActions
                quoteTitle={quote.title}
                quoteUrl={quoteUrl}
                customerName={`${quote.customer.firstName} ${quote.customer.lastName}`.trim()}
                customerPhone={quote.customer.phone ?? null}
                customerEmail={quote.customer.email ?? null}
              />
            </div>
          ) : (
            <form action={`/api/public/quote/${quote.accessToken}/accept`} method="post" style={{ marginTop: 24 }}>
              <button className="inline-flex items-center justify-center rounded-lg border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" type="submit">
                Accept quote
              </button>
            </form>
          )
        ) : (
          <div style={{ color: "#86efac", marginTop: 24 }}>
            <strong>You&apos;re locked in!</strong> We&apos;ll be in touch shortly to sort out the next steps.
          </div>
        )}
      </section>
    </main>
  );
}
