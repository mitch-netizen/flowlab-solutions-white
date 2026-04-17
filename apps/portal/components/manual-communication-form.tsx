import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select } from "./ui/select";
import { Textarea } from "./ui/textarea";

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
    <form action="/api/tenant/communications/send" method="post" className="surface form-grid space-y-4">
      <h2 style={{ marginTop: 0 }}>{title}</h2>
      <Input type="hidden" name="customerId" value={customerId} />
      <Input type="hidden" name="returnTo" value={returnTo} />
      {jobId ? <Input type="hidden" name="jobId" value={jobId} /> : null}
      {invoiceId ? <Input type="hidden" name="invoiceId" value={invoiceId} /> : null}
      <div className="space-y-4">
        <Label htmlFor="channel">Channel</Label>
        <Select id="channel" name="channel" defaultValue="email">
          <option value="email">Email</option>
          <option value="sms">SMS</option>
        </Select>
      </div>
      <div className="space-y-4">
        <Label htmlFor="subject">Subject</Label>
        <Input id="subject" name="subject" placeholder="Optional for SMS" />
      </div>
      <div className="space-y-4">
        <Label htmlFor="body">Message</Label>
        <Textarea id="body" name="body" placeholder="Write the message the customer should receive." required />
      </div>
      <Button type="submit">Send now</Button>
    </form>
  );
}
