"use client";

import { useRef, useState } from "react";

export function SubdomainForm({ root }: { root: string }) {
  const inputRef = useRef<HTMLInputElement>(null);

  function navigate() {
    const slug = inputRef.current?.value.trim();
    if (slug) {
      window.location.href = `https://${slug}.${root}/login`;
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") navigate();
  }

  return (
    <div className="subdomain-form">
      <input
        ref={inputRef}
        id="slug"
        type="text"
        placeholder="yourbusiness"
        onKeyDown={handleKeyDown}
      />
      <span className="muted" style={{ fontSize: 14, whiteSpace: "nowrap" }}>
        .{root}/login
      </span>
      <button
        type="button"
        onClick={navigate}
        className="cta ghost"
      >
        Go
      </button>
    </div>
  );
}

interface Portal {
  slug: string;
  businessName: string;
  status: string;
}

export function FindPortalForm({ root }: { root: string }) {
  const [email, setEmail] = useState("");
  const [portals, setPortals] = useState<Portal[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setPortals(null);
    setNotFound(false);
    try {
      const res = await fetch("/api/auth/find-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = (await res.json()) as { portals?: Portal[] };
      if (!data.portals || data.portals.length === 0) {
        setNotFound(true);
      } else if (data.portals.length === 1) {
        window.location.href = `https://${data.portals[0]!.slug}.${root}/login`;
      } else {
        setPortals(data.portals);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "0 0 20px" }} />
      <label style={{ display: "block", marginBottom: 8, fontSize: 14, color: "#94a3b8" }}>
        Don&apos;t know your subdomain? Find it by email
      </label>
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          style={{
            flex: 1, minWidth: 200,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 8, padding: "8px 12px",
            fontSize: 14, color: "#e2e8f0",
            outline: "none"
          }}
        />
        <button
          type="submit"
          disabled={loading}
          className="cta ghost"
          style={{ whiteSpace: "nowrap" }}
        >
          {loading ? "Searching…" : "Find portal"}
        </button>
      </form>

      {notFound && (
        <p style={{ marginTop: 10, fontSize: 13, color: "#f87171" }}>
          No portal found for that email. Double-check the address or{" "}
          <a href="mailto:hello@flowlabsolutions.au?subject=Can't find my login" style={{ color: "#f87171" }}>
            contact support
          </a>
          .
        </p>
      )}

      {portals && portals.length > 1 && (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>Multiple portals found — choose one:</p>
          {portals.map((p) => (
            <a
              key={p.slug}
              href={`https://${p.slug}.${root}/login`}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 14px", borderRadius: 8,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                textDecoration: "none", color: "#e2e8f0",
                fontSize: 14
              }}
            >
              <span style={{ fontWeight: 600 }}>{p.businessName}</span>
              <span style={{ fontSize: 12, color: "#64748b" }}>{p.slug}.{root}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
