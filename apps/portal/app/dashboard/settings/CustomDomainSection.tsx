"use client";

import { useState } from "react";

interface Props {
  currentDomain: string | null;
  isVerified: boolean;
  tenantSlug: string;
}

const CANONICAL_ROOT_DOMAIN = "flowlabsolutions.au";

export default function CustomDomainSection({ currentDomain, isVerified: initialVerified, tenantSlug }: Props) {
  const [domain, setDomain] = useState(currentDomain ?? "");
  const [status, setStatus] = useState<"idle" | "checking" | "done">("idle");
  const [verified, setVerified] = useState(initialVerified);
  const [cnameTarget, setCnameTarget] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const expectedCname = `${tenantSlug}.${CANONICAL_ROOT_DOMAIN}`;

  const handleVerify = async () => {
    if (!domain) return;
    setStatus("checking");
    setVerifyError(null);
    setCnameTarget(null);

    try {
      const res = await fetch("/api/tenant/settings/verify-domain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain })
      });
      const data = await res.json() as {
        verified: boolean;
        cnameTarget: string | null;
        expectedCname: string;
        error: string | null;
      };
      setVerified(data.verified);
      setCnameTarget(data.cnameTarget);
      if (data.error) setVerifyError(data.error);
    } catch {
      setVerifyError("Request failed. Please try again.");
    } finally {
      setStatus("done");
    }
  };

  const statusBadge = () => {
    if (!currentDomain && !domain) return null;
    if (verified) {
      return (
        <span style={{ background: "#166534", color: "#bbf7d0", padding: "2px 10px", borderRadius: 99, fontSize: 12, fontWeight: 600 }}>
          Verified
        </span>
      );
    }
    return (
      <span style={{ background: "#7c2d12", color: "#fed7aa", padding: "2px 10px", borderRadius: 99, fontSize: 12, fontWeight: 600 }}>
        Not verified
      </span>
    );
  };

  return (
    <div className="surface" style={{ borderLeft: "3px solid #7c3aed" }}>
      <div style={{ marginBottom: 16 }}>
        <div className="eyebrow">Custom Domain</div>
        <h2 style={{ margin: "4px 0 8px" }}>White-label domain</h2>
        <p className="muted" style={{ margin: 0 }}>
          Point a CNAME record from your domain to <code style={{ background: "#1e293b", padding: "2px 6px", borderRadius: 4, fontSize: 13 }}>{expectedCname}</code> then verify below.
        </p>
      </div>

      <div className="panel-soft" style={{ marginBottom: 16 }}>
        <div className="eyebrow" style={{ marginBottom: 8 }}>DNS setup instructions</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ color: "#94a3b8" }}>
              <th style={{ textAlign: "left", paddingBottom: 6, fontWeight: 600 }}>Type</th>
              <th style={{ textAlign: "left", paddingBottom: 6, fontWeight: 600 }}>Name / Host</th>
              <th style={{ textAlign: "left", paddingBottom: 6, fontWeight: 600 }}>Value / Target</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ paddingBottom: 4, color: "#e2e8f0" }}>CNAME</td>
              <td style={{ paddingBottom: 4, color: "#e2e8f0" }}>{domain || "service"}</td>
              <td style={{ paddingBottom: 4 }}>
                <code style={{ background: "#0f172a", padding: "2px 6px", borderRadius: 4, color: "#a78bfa" }}>
                  {expectedCname}
                </code>
              </td>
            </tr>
          </tbody>
        </table>
        <p className="muted" style={{ margin: "10px 0 0", fontSize: 12 }}>
          DNS changes can take up to 48 hours to propagate. Use your domain registrar&apos;s DNS management panel to add this record.
        </p>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
        <label className="label" style={{ flex: 1, minWidth: 200 }}>
          Custom domain
          <input
            className="input"
            value={domain}
            onChange={e => setDomain(e.target.value)}
            placeholder="service.yourdomain.com"
          />
        </label>
        <button
          className="cta"
          onClick={handleVerify}
          disabled={!domain || status === "checking"}
          style={{ opacity: status === "checking" ? 0.6 : 1, whiteSpace: "nowrap" }}
        >
          {status === "checking" ? "Checking…" : "Verify DNS"}
        </button>
        {statusBadge()}
      </div>

      {status === "done" && (
        <div style={{ marginTop: 14 }}>
          {verified ? (
            <div style={{ color: "#86efac", fontSize: 13 }}>
              DNS verified successfully. Your portal is accessible at{" "}
              <strong>https://{domain}</strong>.
            </div>
          ) : (
            <div style={{ color: "#fca5a5", fontSize: 13 }}>
              {verifyError ?? "CNAME not pointing to the expected target."}
              {cnameTarget && (
                <span style={{ color: "#94a3b8" }}>
                  {" "}Found: <code style={{ background: "#1e293b", padding: "1px 5px", borderRadius: 3 }}>{cnameTarget}</code>
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
