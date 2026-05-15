"use client";

import { useState } from "react";

type Props = {
  plan: string;
  label: string;
  highlight: boolean;
  disabled?: boolean;
};

export function CheckoutButton({ plan, label, highlight, disabled }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleClick() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/tenant/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan })
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? "Could not start checkout. Please try again.");
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleClick}
        disabled={loading || disabled}
        className={
          highlight
            ? "inline-flex items-center justify-center rounded-lg border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            : "inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold disabled:opacity-50"
        }
      >
        {loading ? "Redirecting to Stripe…" : label}
      </button>
      {error && (
        <span style={{ fontSize: 12, color: "#f87171", maxWidth: 220, textAlign: "right" }}>
          {error}
        </span>
      )}
    </div>
  );
}
