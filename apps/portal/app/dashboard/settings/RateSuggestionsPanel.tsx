"use client";

import { useState } from "react";
import type { RateSuggestion } from "@flowlab/db";

interface Props {
  suggestions: RateSuggestion[];
}

export default function RateSuggestionsPanel({ suggestions }: Props) {
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [resolved, setResolved] = useState(false);

  const resolve = async (action: "apply" | "dismiss") => {
    setStatus("loading");
    try {
      await fetch("/api/tenant/settings/rate-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      setResolved(true);
    } finally {
      setStatus("done");
    }
  };

  if (resolved) {
    return (
      <div className="surface" style={{ borderLeft: "3px solid #16a34a" }}>
        <p style={{ margin: 0, color: "#16a34a", fontWeight: 600 }}>
          ✅ Rate suggestions resolved.
        </p>
      </div>
    );
  }

  return (
    <div className="surface" style={{ borderLeft: "3px solid #3b82f6" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="eyebrow">AI Suggestions</div>
          <h2 style={{ margin: "4px 0 8px" }}>Pricing rate updates</h2>
          <p className="muted" style={{ margin: 0 }}>
            Based on your job history, the AI suggests these rate adjustments.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            className="cta"
            onClick={() => resolve("apply")}
            disabled={status === "loading"}
            style={{ opacity: status === "loading" ? 0.6 : 1 }}
          >
            Apply all
          </button>
          <button
            className="cta"
            onClick={() => resolve("dismiss")}
            disabled={status === "loading"}
            style={{ background: "#1e293b", opacity: status === "loading" ? 0.6 : 1 }}
          >
            Dismiss
          </button>
        </div>
      </div>
      <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        {suggestions.map((s, i) => (
          <div key={i} className="panel-soft" style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <strong>{s.label}</strong>
              <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>{s.reason}</p>
            </div>
            <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
              <span style={{ color: "#64748b" }}>${s.current}</span>
              <span style={{ color: "#64748b" }}> → </span>
              <span style={{ color: s.suggested > s.current ? "#16a34a" : "#dc2626", fontWeight: 700 }}>
                ${s.suggested}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
