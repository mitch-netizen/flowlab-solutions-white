import { notFound } from "next/navigation";

import { getInvoiceByToken } from "@flowlab/db";

export default async function InvoicePage({
  params,
  searchParams
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string; paid?: string }>;
}) {
  const { token } = await params;
  const query = await searchParams;
  const invoice = await getInvoiceByToken(token);

  if (!invoice) {
    notFound();
  }

  return (
    <main>
      <section className="rounded-lg border bg-card p-4">
        <div className="eyebrow">{invoice.tenant.profile?.businessName}</div>
        <h1>Invoice {invoice.number}</h1>
        <div style={{ fontSize: 40, fontWeight: 700 }}>${invoice.amount}</div>
        <p style={{ color: "#cbd5e1" }}>Due: {invoice.dueAt ? new Date(invoice.dueAt).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" }) : "On receipt"}</p>
        {query.error ? (
          <div className="rounded-lg border bg-card/60 p-4" style={{ marginTop: 24, color: "#fca5a5" }}>
            {query.error === "rate_limited"
              ? "Too many payment attempts were made. Please wait a moment and try again."
              : query.error === "unavailable"
                ? "An online invoice link is not available right now. Please contact the business for help."
                : "This invoice link is no longer available."}
          </div>
        ) : null}
        {invoice.status !== "paid" ? (
          <form action={`/api/public/invoice/${invoice.accessToken}/pay`} method="post" style={{ marginTop: 24 }}>
            <button className="inline-flex items-center justify-center rounded-lg border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" type="submit">
              Open online invoice
            </button>
          </form>
        ) : (
          <div style={{ color: "#86efac", marginTop: 24 }}>Payment received — thanks for that! See you next time.</div>
        )}
      </section>
    </main>
  );
}
