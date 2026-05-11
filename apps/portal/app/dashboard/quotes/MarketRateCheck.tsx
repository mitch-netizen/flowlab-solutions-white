"use client";

import { useRef, useState } from "react";

type Verdict = "competitive" | "above_market" | "below_market" | "unclear";

const verdictLabel: Record<Verdict, string> = {
  competitive: "Competitive",
  above_market: "Above market",
  below_market: "Below market",
  unclear: "Unclear"
};

const verdictClass: Record<Verdict, string> = {
  competitive: "text-emerald-400",
  above_market: "text-amber-400",
  below_market: "text-blue-400",
  unclear: "text-muted-foreground"
};

export default function MarketRateCheck() {
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<{ verdict: Verdict; commentary: string } | null>(null);
  const [error, setError] = useState("");
  const amountRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);

  async function handleCheck() {
    const amount = Number(amountRef.current?.value ?? 0);
    const jobDescription = descRef.current?.value?.trim() ?? "";
    if (!amount || !jobDescription) {
      setError("Enter an amount and job description to check.");
      return;
    }
    setChecking(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/tenant/quotes/rate-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, jobDescription })
      });
      if (!res.ok) throw new Error("Check failed");
      const data = await res.json() as { verdict: Verdict; commentary: string };
      setResult(data);
    } catch {
      setError("Rate check failed. Try again.");
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="grid gap-4 border-t pt-4">
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span className="status-pill is-off" title="Uses Claude to assess your proposed price against typical Australian market rates for this trade.">Market rate check</span>
        </div>
        <h3>Is this price competitive?</h3>
        <p className="text-sm text-muted-foreground">Enter a proposed amount and job description — FlowLab will give you a market-rate read.</p>
        <div className="space-y-2 mt-2">
          <input
            ref={amountRef}
            type="number"
            min="1"
            step="0.01"
            placeholder="Proposed amount ($)"
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          />
          <textarea
            ref={descRef}
            placeholder="Describe the work (e.g. standard lawn mow, 600m² block, Gladstone)"
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            rows={2}
          />
          <button
            type="button"
            disabled={checking}
            onClick={() => void handleCheck()}
            className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold"
          >
            {checking ? "Checking…" : "Check market rate"}
          </button>
        </div>
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        {result ? (
          <div className="space-y-1 mt-2">
            <p className={`text-sm font-semibold ${verdictClass[result.verdict]}`}>
              {verdictLabel[result.verdict]}
            </p>
            <p className="text-sm text-muted-foreground">{result.commentary}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
