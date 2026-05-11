"use client";

import { useState } from "react";

import SubmitButton from "../../../components/submit-button";

type Suggestion = {
  name: string;
  defaultPrice: number;
  defaultDuration: number;
  reason: string;
};

export default function ServiceTemplateSuggestions() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSuggest() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/tenant/settings/services/suggest", { method: "POST" });
      if (!res.ok) throw new Error("Suggestion failed");
      const data = await res.json() as { suggestions: Suggestion[] };
      setSuggestions(data.suggestions);
      setDone(true);
    } catch {
      setError("Could not generate suggestions. Try again or add templates manually.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4 border-t pt-4 mt-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">FlowLab can suggest service templates based on your recent job history.</p>
        {!done ? (
          <button
            type="button"
            disabled={loading}
            onClick={() => void handleSuggest()}
            className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold"
          >
            {loading ? "Thinking…" : "Suggest templates from job history"}
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="text-sm text-red-400">{error}</p>
      ) : null}

      {suggestions.length > 0 ? (
        <div className="space-y-3">
          {suggestions.map((suggestion, i) => (
            <div key={i} className="grid gap-4 border rounded-lg p-4 md:grid-cols-[minmax(0,1fr)_auto]">
              <div className="space-y-1">
                <div className="font-medium text-sm">{suggestion.name}</div>
                <div className="text-sm text-muted-foreground">
                  ${suggestion.defaultPrice} · {suggestion.defaultDuration} min
                </div>
                <div className="text-xs text-muted-foreground">{suggestion.reason}</div>
              </div>
              <div className="flex items-center">
                <form action="/api/tenant/settings/services" method="post">
                  <input type="hidden" name="name" value={suggestion.name} />
                  <input type="hidden" name="defaultPrice" value={suggestion.defaultPrice} />
                  <input type="hidden" name="defaultDuration" value={suggestion.defaultDuration} />
                  <SubmitButton
                    className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-3 py-1.5 text-xs font-semibold"
                    loadingText="Adding…"
                  >
                    Add
                  </SubmitButton>
                </form>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
