type ManualCommunicationFormProps = {
  customerId: string;
  returnTo: string;
  jobId?: string | null;
  invoiceId?: string | null;
  title?: string;
};

export default function ManualCommunicationForm({
  customerId,
  returnTo,
  jobId,
  invoiceId,
  title = "Send message"
}: ManualCommunicationFormProps) {
  return (
    <form action="/api/tenant/communications/send" method="post" className="rounded-lg border bg-card p-4 space-y-4">
      <h2 style={{ marginTop: 0 }}>{title}</h2>
      <input type="hidden" name="customerId" value={customerId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      {jobId ? <input type="hidden" name="jobId" value={jobId} /> : null}
      {invoiceId ? <input type="hidden" name="invoiceId" value={invoiceId} /> : null}
      <label className="flex flex-col gap-2 text-sm text-muted-foreground">
        Channel
        <select className="w-full rounded-lg border bg-background px-3 py-2 text-sm" name="channel" defaultValue="email">
          <option value="email">Email</option>
          <option value="sms">SMS</option>
        </select>
      </label>
      <label className="flex flex-col gap-2 text-sm text-muted-foreground">
        Subject
        <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm" name="subject" placeholder="Optional for SMS" />
      </label>
      <label className="flex flex-col gap-2 text-sm text-muted-foreground">
        Message
        <textarea className="textarea" name="body" placeholder="Write the message the customer should receive." required />
      </label>
      <button className="inline-flex items-center justify-center rounded-lg border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" type="submit">Send now</button>
    </form>
  );
}
