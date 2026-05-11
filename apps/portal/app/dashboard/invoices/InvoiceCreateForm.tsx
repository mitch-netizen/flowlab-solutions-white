"use client";

import { useRef, useState } from "react";

import SubmitButton from "../../../components/submit-button";

type Customer = { id: string; firstName: string; lastName: string };
type InvoiceableJob = { id: string; summary: string; customer: { id: string; firstName: string; lastName: string } };

export default function InvoiceCreateForm({
  customers,
  invoiceableJobs,
  prefilledCustomerId,
  prefilledJobId
}: {
  customers: Customer[];
  invoiceableJobs: InvoiceableJob[];
  prefilledCustomerId: string;
  prefilledJobId: string;
}) {
  const [hint, setHint] = useState<{ amount: number; count: number } | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);
  const noteRef = useRef<HTMLInputElement>(null);

  async function handleCustomerChange(customerId: string) {
    if (!customerId) { setHint(null); return; }
    setSuggesting(true);
    try {
      const res = await fetch(`/api/tenant/invoices/suggest?customerId=${encodeURIComponent(customerId)}`);
      if (!res.ok) return;
      const data = await res.json() as { suggestedAmount: number | null; count: number };
      if (data.suggestedAmount != null && amountRef.current) {
        amountRef.current.value = String(data.suggestedAmount);
      }
      setHint(data.suggestedAmount != null ? { amount: data.suggestedAmount, count: data.count } : null);
    } catch {
      // Leave form as-is on failure
    } finally {
      setSuggesting(false);
    }
  }

  function handleJobChange(jobId: string) {
    const job = invoiceableJobs.find(j => j.id === jobId);
    if (job && noteRef.current) {
      noteRef.current.value = job.summary;
    }
  }

  return (
    <form className="rounded-lg border bg-card p-4 space-y-4" action="/api/tenant/invoices/create" method="post">
      <input type="hidden" name="returnTo" value="/dashboard/invoices" />
      <h2>Create invoice</h2>
      <label className="flex flex-col gap-2 text-sm text-muted-foreground">
        Customer
        <select
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          name="customerId"
          required
          defaultValue={prefilledCustomerId}
          onChange={(e) => void handleCustomerChange(e.target.value)}
        >
          <option value="" disabled>Select a customer</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.firstName} {customer.lastName}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-2 text-sm text-muted-foreground">
        Related job
        <select
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          name="jobId"
          defaultValue={prefilledJobId}
          onChange={(e) => handleJobChange(e.target.value)}
        >
          <option value="">No linked job</option>
          {invoiceableJobs.map((job) => (
            <option key={job.id} value={job.id}>
              {job.summary} · {job.customer.firstName} {job.customer.lastName}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-2 text-sm text-muted-foreground">
        Amount (AUD)
        <input
          ref={amountRef}
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          name="amount"
          type="number"
          min="1"
          step="0.01"
          placeholder="e.g. 350.00"
          required
        />
        {suggesting ? (
          <span className="text-xs text-muted-foreground">Looking up past invoices…</span>
        ) : hint ? (
          <span className="text-xs text-muted-foreground">
            Based on {hint.count} past invoice{hint.count === 1 ? "" : "s"} — adjust as needed.
          </span>
        ) : null}
      </label>
      <label className="flex flex-col gap-2 text-sm text-muted-foreground">
        Internal note <span className="text-xs">(not shown to customer)</span>
        <input
          ref={noteRef}
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          name="note"
          placeholder="e.g. Lawn mow + hedge trim — 14 May"
          title="Kept on the FlowLab record only — not sent to Xero or visible to the customer."
        />
      </label>
      <SubmitButton
        className="inline-flex items-center justify-center rounded-lg border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        loadingText="Creating..."
      >
        Create invoice
      </SubmitButton>
    </form>
  );
}
