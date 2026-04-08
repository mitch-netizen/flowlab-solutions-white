import { notFound } from "next/navigation";

import { getInvoiceByToken } from "@flowlab/db";

export default async function InvoicePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invoice = await getInvoiceByToken(token);

  if (!invoice) {
    notFound();
  }

  return (
    <main>
      <section className="surface">
        <div className="eyebrow">{invoice.tenant.profile?.businessName}</div>
        <h1>Invoice {invoice.number}</h1>
        <div style={{ fontSize: 40, fontWeight: 700 }}>${invoice.amount}</div>
        <p style={{ color: "#cbd5e1" }}>Due: {invoice.dueAt ? new Date(invoice.dueAt).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" }) : "On receipt"}</p>
        {invoice.status !== "paid" ? (
          <form action={`/api/public/invoice/${invoice.accessToken}/pay`} method="post" style={{ marginTop: 24 }}>
            <button className="cta" type="submit">
              Proceed to secure payment
            </button>
          </form>
        ) : (
          <div style={{ color: "#86efac", marginTop: 24 }}>Payment received — thanks for that! See you next time.</div>
        )}
      </section>
    </main>
  );
}
