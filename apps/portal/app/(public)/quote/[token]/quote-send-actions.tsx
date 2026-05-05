"use client";

import { useState } from "react";

type QuoteSendActionsProps = {
  quoteTitle: string;
  quoteUrl: string;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
};

function normalizePhone(phone: string) {
  return phone.replace(/\D+/g, "");
}

export function QuoteSendActions({ quoteTitle, quoteUrl, customerName, customerPhone, customerEmail }: QuoteSendActionsProps) {
  const [message, setMessage] = useState<string | null>(null);

  async function copyQuoteLink() {
    try {
      await navigator.clipboard.writeText(quoteUrl);
      setMessage("Quote link copied. Paste it into SMS or email.");
    } catch {
      setMessage("Could not copy automatically. Use the link shown below.");
    }
  }

  async function sendQuote() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: quoteTitle,
          text: `Hi ${customerName}, here is your quote from FlowLab.`,
          url: quoteUrl
        });
        setMessage("Quote ready to send.");
        return;
      } catch {
        // Fall back to copy when share is cancelled or unavailable.
      }
    }

    await copyQuoteLink();
  }

  const normalizedCustomerPhone = customerPhone ? normalizePhone(customerPhone) : "";
  const smsHref = normalizedCustomerPhone
    ? `sms:${normalizedCustomerPhone}?body=${encodeURIComponent(`Hi ${customerName}, here is your quote from FlowLab: ${quoteUrl}`)}`
    : null;
  const emailHref = customerEmail
    ? `mailto:${customerEmail}?subject=${encodeURIComponent(`Quote: ${quoteTitle}`)}&body=${encodeURIComponent(`Hi ${customerName},\n\nHere is your quote: ${quoteUrl}`)}`
    : null;

  return (
    <div className="space-y-3">
      <button
        className="inline-flex w-full items-center justify-center rounded-lg border bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
        type="button"
        onClick={sendQuote}
      >
        Send quote
      </button>
      <p className="text-xs text-muted-foreground">Opens your phone share options, or copies the quote link.</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {smsHref ? (
          <a className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold" href={smsHref}>
            Send via SMS
          </a>
        ) : (
          <p className="text-xs text-muted-foreground">No customer mobile/phone saved for this quote. SMS unavailable.</p>
        )}
        {emailHref ? (
          <a className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold" href={emailHref}>
            Send via email
          </a>
        ) : null}
      </div>
      <button
        className="inline-flex w-full items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold"
        type="button"
        onClick={copyQuoteLink}
      >
        Copy quote link
      </button>
      {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
      <p className="text-xs text-muted-foreground break-all">{quoteUrl}</p>
    </div>
  );
}
