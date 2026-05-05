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
    <div className="flex flex-col gap-3">
      <Link href="/dashboard/quotes/new" className="inline-flex items-center justify-center rounded-lg border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Create your first quote</Link>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        {bookingLink ? (
          <button type="button" onClick={copyBookingLink} className="underline text-muted-foreground hover:text-foreground">
            {copied ? "Booking link copied" : "Copy booking link"}
          </button>
        ) : null}
        <Link href="/dashboard/crm" className="underline text-muted-foreground hover:text-foreground">View requests</Link>
        <Link href="/dashboard/settings" className="underline text-muted-foreground hover:text-foreground">Edit settings</Link>
      </div>
    </div>
  );
}
