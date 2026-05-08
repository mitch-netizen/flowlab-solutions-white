"use client";

import { useMemo, useState } from "react";

type BusinessType =
  | "lawn_mowing"
  | "cleaning"
  | "pest_control"
  | "gardening"
  | "handyman"
  | "pool_service"
  | "other";

const TRADES = [
  { key: "plumber", label: "Plumber", value: "other" },
  { key: "electrician", label: "Electrician", value: "other" },
  { key: "builder", label: "Builder", value: "handyman" },
  { key: "hvac", label: "HVAC", value: "other" },
  { key: "pest_control", label: "Pest control", value: "pest_control" },
  { key: "cleaner", label: "Cleaner", value: "cleaning" },
  { key: "landscaper", label: "Landscaper", value: "gardening" },
  { key: "mechanic", label: "Mechanic", value: "other" },
  { key: "painter", label: "Painter", value: "handyman" },
  { key: "locksmith", label: "Locksmith", value: "other" },
  { key: "other", label: "Other", value: "other" }
] as const;

interface Props {
  initialStep: number;
  isCompleted: boolean;
  enquiryUrl: string;
  initialProfile: {
    businessName: string;
    phone: string;
    businessType: BusinessType;
    serviceAreaSuburbs: string[];
  };
}

const DEFAULT_WORK_SCHEDULE = [1, 2, 3, 4, 5].map((dayOfWeek) => ({ dayOfWeek, startTime: "07:00", endTime: "17:00" }));

function getInitialTradeKey(businessType: BusinessType) {
  return TRADES.find((trade) => trade.value === businessType)?.key ?? "other";
}

export default function OnboardingWizard({ initialStep, isCompleted, enquiryUrl, initialProfile }: Props) {
  const [step, setStep] = useState(Math.min(Math.max(initialStep, 1), 3));
  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState(isCompleted);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const [businessName, setBusinessName] = useState(initialProfile.businessName);
  const [selectedTradeKey, setSelectedTradeKey] = useState<string>(() => getInitialTradeKey(initialProfile.businessType));
  const [mobile, setMobile] = useState(initialProfile.phone);
  const [suburbOrPostcode, setSuburbOrPostcode] = useState(initialProfile.serviceAreaSuburbs[0] ?? "");

  const bookingLink = useMemo(() => enquiryUrl || "Your booking link will appear here after setup.", [enquiryUrl]);

  const post = async (url: string, body: unknown) => {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    if (!data.ok) throw new Error(data.error ?? "Something went wrong. Please try again.");
    return data;
  };

  const handleCopy = () => {
    if (!enquiryUrl) return;
    navigator.clipboard.writeText(enquiryUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const saveAndContinue = async (targetStep: number, saveAction?: () => Promise<void>, complete?: boolean) => {
    setSaving(true);
    setError("");
    try {
      if (saveAction) await saveAction();
      await post("/api/tenant/onboarding/step", { step: complete ? 3 : targetStep, completed: complete ?? false });
      if (complete) {
        setCompleted(true);
        window.location.href = "/dashboard";
        return;
      }
      setStep(targetStep);
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't save that. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (completed) {
    return (
      <div className="rounded-lg border bg-card p-4">
        <h2>You&apos;re all set</h2>
        <p className="muted">You&apos;re set. Let&apos;s send your first quote.</p>
        <a href="/dashboard" className="inline-flex items-center justify-center rounded-lg border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Go to dashboard</a>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-4" style={{ maxWidth: 520 }}>
      {step === 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <h1 style={{ margin: 0 }}>Tell us about your business</h1>
          <p className="muted" style={{ marginTop: -4 }}>Just a few things — takes about 30 seconds.</p>

          <label>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>What&apos;s your business called?</div>
            <input className="w-full rounded-lg border bg-background px-3 py-3 text-sm" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Joe’s Plumbing" />
          </label>

          <div>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>What do you do?</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
              {TRADES.map((trade) => (
                <button
                  key={trade.label}
                  type="button"
                  onClick={() => setSelectedTradeKey(trade.key)}
                  style={{
                    minHeight: 44,
                    borderRadius: 10,
                    border: selectedTradeKey === trade.key ? "2px solid #3b82f6" : "1px solid #334155",
                    background: selectedTradeKey === trade.key ? "#1e3a8a" : "#0f172a",
                    color: "#e2e8f0",
                    textAlign: "left",
                    padding: "10px 12px"
                  }}
                >
                  {trade.label}
                </button>
              ))}
            </div>
          </div>

          <label>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>Best number to reach you</div>
            <input className="w-full rounded-lg border bg-background px-3 py-3 text-sm" value={mobile} onChange={(e) => setMobile(e.target.value)} />
          </label>

          {error && <p style={{ color: "#f87171", margin: 0 }}>{error}</p>}
          <button
            className="inline-flex items-center justify-center rounded-lg border bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
            disabled={saving}
            onClick={() => {
              if (!businessName.trim()) return setError("Please enter your business name.");
              if (!mobile.trim()) return setError("Please enter your mobile number.");
              void saveAndContinue(2, () =>
                post("/api/tenant/settings/profile-json", {
                  businessName,
                  phone: mobile,
                  businessType: (TRADES.find((trade) => trade.key === selectedTradeKey)?.value ?? "other")
                }).then(() => Promise.resolve())
              );
            }}
          >
            {saving ? "Saving..." : "Continue"}
          </button>
        </div>
      )}

      {step === 2 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <h1 style={{ margin: 0 }}>Where do you work?</h1>
          <label>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>Your main suburb or postcode</div>
            <input className="w-full rounded-lg border bg-background px-3 py-3 text-sm" value={suburbOrPostcode} onChange={(e) => setSuburbOrPostcode(e.target.value)} />
          </label>
          <p className="muted" style={{ marginTop: -8 }}>We’ll cover 25 km around it — change anytime.</p>
          {error && <p style={{ color: "#f87171", margin: 0 }}>{error}</p>}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button type="button" className="inline-flex items-center justify-center rounded-lg border bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground" style={{ background: "#1e293b" }} onClick={() => setStep(1)}>Back</button>
            <button
              className="inline-flex items-center justify-center rounded-lg border bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
              disabled={saving}
              onClick={() => {
                if (!businessName.trim()) return setError("Please enter your business name.");
                if (!selectedTradeKey) return setError("Please choose your trade.");
                if (!mobile.trim()) return setError("Please enter your mobile number.");
                if (!suburbOrPostcode.trim()) return setError("Please enter your suburb or postcode.");
                void saveAndContinue(3, async () => {
                  await post("/api/tenant/settings/profile-json", {
                    businessName,
                    phone: mobile,
                    businessType: (TRADES.find((trade) => trade.key === selectedTradeKey)?.value ?? "other"),
                    serviceAreaSuburbs: [suburbOrPostcode.trim()]
                  });
                  await post("/api/tenant/settings/schedule", {
                    workSchedule: DEFAULT_WORK_SCHEDULE,
                    personalCommitments: [],
                    onlyIfEmpty: true
                  });
                });
              }}
            >
              {saving ? "Saving..." : "Continue"}
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <h1 style={{ margin: 0 }}>Here’s your booking link</h1>
          <p className="muted">Share this with customers and they can request a job directly.</p>
          <div className="panel-soft" style={{ wordBreak: "break-all" }}>{bookingLink}</div>
          {error && <p style={{ color: "#f87171", margin: 0 }}>{error}</p>}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button type="button" className="inline-flex items-center justify-center rounded-lg border bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground" onClick={handleCopy}>
              {copied ? "Copied!" : "Copy link"}
            </button>
            <button
              className="inline-flex items-center justify-center rounded-lg border bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
              style={{ background: "#16a34a" }}
              disabled={saving}
              onClick={() => void saveAndContinue(3, undefined, true)}
            >
              {saving ? "Finishing..." : "Finish setup"}
            </button>
          </div>
          <p className="muted" style={{ margin: 0 }}>You’re set. Let’s send your first quote.</p>
        </div>
      )}
    </div>
  );
}
