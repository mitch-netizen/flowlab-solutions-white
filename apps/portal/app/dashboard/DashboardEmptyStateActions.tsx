"use client";

import Link from "next/link";
import { useState } from "react";

type Props = {
  bookingLink: string | null;
};

export default function DashboardEmptyStateActions({ bookingLink }: Props) {
  const [copied, setCopied] = useState(false);

  const copyBookingLink = async () => {
    if (!bookingLink) return;
    await navigator.clipboard.writeText(bookingLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      <Link href="/dashboard/quotes/new" className="inline-flex items-center justify-center rounded-lg border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Create your first quote</Link>
      {bookingLink ? (
        <button type="button" onClick={copyBookingLink} className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold">
          {copied ? "Copied!" : "Copy booking link"}
        </button>
      ) : null}
      <Link href="/dashboard/crm" className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold">View requests</Link>
      <Link href="/dashboard/settings" className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold">Edit settings</Link>
    </div>
  );
}
