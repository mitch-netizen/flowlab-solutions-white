import { notFound } from "next/navigation";

import { getQuoteByToken } from "@flowlab/db";

export default async function QuotePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
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
        <div style={{ color: "#cbd5e1", marginTop: 10 }}>Status: {quote.status}</div>
        {quote.status !== "accepted" ? (
          <form action={`/api/public/quote/${quote.accessToken}/accept`} method="post" style={{ marginTop: 24 }}>
            <button className="cta" type="submit">
              Accept quote
            </button>
          </form>
        ) : (
          <div style={{ color: "#86efac", marginTop: 24 }}>Quote accepted. The agreement handoff is ready.</div>
        )}
      </section>
    </main>
  );
}
