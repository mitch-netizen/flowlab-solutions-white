import Link from "next/link";
import { prisma } from "@flowlab/db";

import DashboardPageScaffold from "../../../../components/dashboard/page-scaffold";
import SubmitButton from "../../../../components/submit-button";
import { requireTenantSession } from "../../../../lib/session";

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
  searchParams: Promise<{ error?: string; customerId?: string; enquiryId?: string }>;
}) {
  const session = await requireTenantSession();
  const query = await searchParams;
  const errorMessage = query.error ? errorMessages[query.error] : null;
  const customerId = query.customerId?.trim() ?? "";
  const enquiryId = query.enquiryId?.trim() ?? "";

  const [customer, enquiry] = await Promise.all([
    customerId
      ? prisma.customer.findFirst({
          where: {
            id: customerId,
            tenantId: session.tenantId
          },
          select: {
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            suburb: true,
            address: true
          }
        })
      : Promise.resolve(null),
    enquiryId
      ? prisma.enquiry.findFirst({
          where: {
            id: enquiryId,
            tenantId: session.tenantId,
            ...(customerId ? { customerId } : {})
          },
          select: {
            serviceRequest: true,
            customer: {
              select: {
                firstName: true,
                lastName: true,
                phone: true,
                email: true,
                suburb: true,
                address: true
              }
            }
          }
        })
      : Promise.resolve(null)
  ]);

  const prefillCustomer = customer ?? enquiry?.customer ?? null;
  const customerMissingFromParam = customerId.length > 0 && customer == null;
  const prefilledCustomerName = prefillCustomer ? `${prefillCustomer.firstName} ${prefillCustomer.lastName}`.trim() : "";
  const prefilledCustomerMobile = prefillCustomer?.phone ?? "";
  const prefilledCustomerEmail = prefillCustomer?.email ?? "";
  const prefilledJobLocation = prefillCustomer?.suburb ?? prefillCustomer?.address ?? "";
  const prefilledJobDescription = enquiry?.serviceRequest ?? "";
  const crmReturnTo = `/dashboard/quotes/new${enquiryId ? `?enquiryId=${encodeURIComponent(enquiryId)}` : ""}`;
  const createCustomerHref = `/dashboard/crm?returnTo=${encodeURIComponent(crmReturnTo)}#manual-add`;

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

        {customerMissingFromParam ? (
          <div className="mb-4 rounded-lg border border-amber-400 bg-amber-50 p-3 text-sm text-amber-900">
            Selected customer was not found. <Link href={createCustomerHref} className="underline font-semibold">Create a customer in CRM</Link> and return here.
          </div>
        ) : null}

        {!prefilledCustomerName ? (
          <div className="mb-4 text-sm text-muted-foreground">
            Need to add a customer first? <Link href={createCustomerHref} className="underline">Create customer in CRM</Link>.
          </div>
        ) : null}

        <form action="/api/tenant/quotes/create" method="post" className="space-y-4">
          <label className="flex flex-col gap-2 text-sm">
            Customer name
            <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm" name="customerName" required defaultValue={prefilledCustomerName} />
          </label>

          <div className="grid gap-4">
            <label className="flex flex-col gap-2 text-sm">
              Customer mobile
              <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm" name="customerMobile" placeholder="04xx xxx xxx" defaultValue={prefilledCustomerMobile} />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              Customer email
              <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm" name="customerEmail" type="email" placeholder="name@example.com" defaultValue={prefilledCustomerEmail} />
            </label>
            <p className="text-xs text-muted-foreground">Add at least one: mobile or email.</p>
          </div>

          <label className="flex flex-col gap-2 text-sm">
            Job suburb or location
            <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm" name="jobLocation" required defaultValue={prefilledJobLocation} />
          </label>

          <label className="flex flex-col gap-2 text-sm">
            What needs to be done?
            <textarea className="w-full min-h-24 rounded-lg border bg-background px-3 py-2 text-sm" name="jobDescription" required defaultValue={prefilledJobDescription} />
            <span className="text-xs text-muted-foreground">Include task, property type, and any access notes.</span>
          </label>

          <label className="flex flex-col gap-2 text-sm">
            Quote total (AUD)
            <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm" name="quoteAmount" type="number" min="0.01" step="0.01" required />
            <span className="text-xs text-muted-foreground">Total amount the customer will see.</span>
          </label>

          <div className="space-y-2">
            <SubmitButton className="inline-flex w-full items-center justify-center rounded-lg border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" loadingText="Creating quote...">
              Create quote
            </SubmitButton>
            <p className="text-xs text-muted-foreground">You&apos;ll get a shareable link to send directly to your customer.</p>
          </div>
        </form>
      </div>
    </DashboardPageScaffold>
  );
}
