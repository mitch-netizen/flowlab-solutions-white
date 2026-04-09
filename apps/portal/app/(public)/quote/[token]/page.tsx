import { notFound } from "next/navigation";

import { getQuoteByToken } from "@flowlab/db";

export default async function QuotePage({
  params,
  searchParams
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ accepted?: string; error?: string }>;
}) {
  const { token } = await params;
  const query = await searchParams;
  const quote = await getQuoteByToken(token);

  if (!quote) {
    notFound();
  }

  return (
    <main>
      <section className="surface">
        <div className="eyebrow">{quote.tenant.profile?.businessName}</div>
        <h1>{quote.title}</h1>
        <p style={{ color: "#cbd5e1" }}>{quote.description}</p>
        <div style={{ fontSize: 40, fontWeight: 700 }}>${quote.amount}</div>
        {query.error ? (
          <div className="surface-soft" style={{ marginTop: 24, color: "#fca5a5" }}>
            {query.error === "rate_limited"
              ? "Too many acceptance attempts were made. Please wait a moment and try again."
              : "This quote is no longer available to accept."}
          </div>
        ) : null}
        {quote.status !== "accepted" ? (
          <form action={`/api/public/quote/${quote.accessToken}/accept`} method="post" style={{ marginTop: 24 }}>
            <button className="cta" type="submit">
              Accept quote
            </button>
          </form>
        ) : (
          <div style={{ color: "#86efac", marginTop: 24 }}>
            <strong>You&apos;re locked in!</strong> We&apos;ll be in touch shortly to sort out the next steps.
          </div>
        )}
      </section>
    </main>
  );
}
