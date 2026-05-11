"use client";

import { useRef, useState } from "react";
import SubmitButton from "./submit-button";
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
  const [channel, setChannel] = useState<"email" | "sms">("email");
  const [drafting, setDrafting] = useState(false);
  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  async function handleDraft() {
    setDrafting(true);
    try {
      const res = await fetch("/api/tenant/communications/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId, jobId, invoiceId, channel })
      });
      if (!res.ok) throw new Error("Draft request failed");
      const data = await res.json() as { subject?: string; body?: string };
      if (data.body && bodyRef.current) {
        bodyRef.current.value = data.body;
      }
      if (data.subject && subjectRef.current) {
        subjectRef.current.value = data.subject;
      }
    } catch {
      // Leave the form as-is if draft fails
    } finally {
      setDrafting(false);
    }
  }

  return (
    <form action="/api/tenant/communications/send" method="post" className="surface form-grid space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <h2 style={{ marginTop: 0, marginBottom: 0 }}>{title}</h2>
        <button
          type="button"
          disabled={drafting}
          onClick={handleDraft}
          className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-3 py-1.5 text-xs font-semibold"
          title="Let AI draft a message based on the customer, job, and invoice context"
        >
          {drafting ? "Drafting…" : "Draft with AI"}
        </button>
      </div>
      <Input type="hidden" name="customerId" value={customerId} />
      <Input type="hidden" name="returnTo" value={returnTo} />
      {jobId ? <Input type="hidden" name="jobId" value={jobId} /> : null}
      {invoiceId ? <Input type="hidden" name="invoiceId" value={invoiceId} /> : null}
      <div className="space-y-4">
        <Label htmlFor="channel">Channel</Label>
        <Select
          id="channel"
          name="channel"
          defaultValue="email"
          onChange={(e) => setChannel(e.target.value as "email" | "sms")}
        >
          <option value="email">Email</option>
          <option value="sms">SMS</option>
        </Select>
      </div>
      {channel === "email" ? (
        <div className="space-y-4">
          <Label htmlFor="subject">Subject</Label>
          <Input id="subject" name="subject" ref={subjectRef} placeholder="Optional for SMS" />
        </div>
      ) : null}
      <div className="space-y-4">
        <Label htmlFor="body">Message</Label>
        <Textarea id="body" name="body" ref={bodyRef} placeholder="Write the message the customer should receive, or use Draft with AI to generate a starting point." required />
      </div>
      <SubmitButton className="inline-flex items-center justify-center rounded-lg border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" loadingText="Sending...">Send now</SubmitButton>
    </form>
  );
}
