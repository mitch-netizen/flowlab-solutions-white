import Link from "next/link";

import DashboardPageScaffold from "../../../../components/dashboard/page-scaffold";

const errorMessages: Record<string, string> = {
  customer_name: "Please add the customer name.",
  contact: "Please add a mobile number or email.",
  location: "Please add the job suburb or location.",
  description: "Please add a short job description.",
  amount: "Please add a quote amount greater than 0.",
  new_customer_email: "For a new customer, please add an email address as well.",
  customer_conflict: "Email and mobile match different customers. Please resolve in CRM before creating the quote."
};

export default async function NewQuotePage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const query = await searchParams;
  const errorMessage = query.error ? errorMessages[query.error] : null;

  return (
    <DashboardPageScaffold
      eyebrow="Quotes"
      title="Create a quote"
      description="Fill in the basics and save your quote in under two minutes."
      section="revenue"
      actions={<Link className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold" href="/dashboard/quotes">Back to quotes</Link>}
    >
      <div className="mx-auto w-full max-w-xl rounded-lg border bg-card p-4 sm:p-5">
        {errorMessage ? (
          <div className="mb-4 rounded-lg border border-red-400 bg-red-50 p-3 text-sm text-red-800">{errorMessage}</div>
        ) : null}

        <form action="/api/tenant/quotes/create" method="post" className="space-y-4">
          <label className="flex flex-col gap-2 text-sm">
            Customer name
            <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm" name="customerName" required />
          </label>

          <div className="grid gap-4">
            <label className="flex flex-col gap-2 text-sm">
              Customer mobile
              <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm" name="customerMobile" placeholder="04xx xxx xxx" />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              Customer email
              <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm" name="customerEmail" type="email" placeholder="name@example.com" />
            </label>
          </div>

          <label className="flex flex-col gap-2 text-sm">
            Job suburb or location
            <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm" name="jobLocation" required />
          </label>

          <label className="flex flex-col gap-2 text-sm">
            Short job description
            <textarea className="w-full min-h-24 rounded-lg border bg-background px-3 py-2 text-sm" name="jobDescription" required />
          </label>

          <label className="flex flex-col gap-2 text-sm">
            Quote amount (AUD)
            <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm" name="quoteAmount" type="number" min="0.01" step="0.01" required />
          </label>

          <button className="inline-flex w-full items-center justify-center rounded-lg border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" type="submit">
            Save quote
          </button>
        </form>
      </div>
    </DashboardPageScaffold>
  );
}
