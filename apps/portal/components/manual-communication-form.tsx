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
    <form action="/api/tenant/communications/send" method="post" className="surface form-grid">
      <h2 style={{ marginTop: 0 }}>{title}</h2>
      <input type="hidden" name="customerId" value={customerId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      {jobId ? <input type="hidden" name="jobId" value={jobId} /> : null}
      {invoiceId ? <input type="hidden" name="invoiceId" value={invoiceId} /> : null}
      <label className="label">
        Channel
        <select className="select" name="channel" defaultValue="email">
          <option value="email">Email</option>
          <option value="sms">SMS</option>
        </select>
      </label>
      <label className="label">
        Subject
        <input className="input" name="subject" placeholder="Optional for SMS" />
      </label>
      <label className="label">
        Message
        <textarea className="textarea" name="body" placeholder="Write the message the customer should receive." required />
      </label>
      <button className="cta" type="submit">Send now</button>
    </form>
  );
}
