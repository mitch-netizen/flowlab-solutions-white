export function getCustomerRecordHref(customerId: string) {
  return `/dashboard/crm/${customerId}`;
}

export function getInvoiceRecordHref(invoiceId: string) {
  return `/dashboard/invoices/${invoiceId}`;
}

export function getJobRecordHref(jobId: string) {
  return `/dashboard/jobs/${jobId}`;
}

export function getJobPrimaryHref(
  job: { id: string; status: string; invoiceId?: string | null }
) {
  if ((job.status === "invoiced" || job.status === "paid") && job.invoiceId) {
    return getInvoiceRecordHref(job.invoiceId);
  }

  return getJobRecordHref(job.id);
}
