"use client";

import { useState } from "react";

import { getPricingModel } from "@flowlab/contracts";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface WorkScheduleEntry {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface ServiceTemplate {
  serviceName: string;
  defaultPrice: number;
  defaultDuration: number;
}

interface Props {
  initialStep: number;
  isCompleted: boolean;
  enquiryUrl: string;
  tenantSlug: string;
  initialProfile: {
    businessName: string;
    tagline: string;
    phone: string;
    email: string;
    primaryColour: string;
    secondaryColour: string;
    accentColour: string;
    serviceAreaSuburbs: string[];
    businessType: string;
  };
  initialPricing: {
    label: string;
    baseRatePerSquareM?: number | null;
    overgrownRate?: number | null;
    heavilyOvergrownRate?: number | null;
    hourlyRate?: number | null;
    calloutFee?: number | null;
    minimumCharge: number;
    gstEnabled: boolean;
  } | null;
  initialServiceTemplates: ServiceTemplate[];
  initialWorkSchedule: WorkScheduleEntry[];
}

export default function OnboardingWizard({
  initialStep,
  isCompleted,
  enquiryUrl,
  tenantSlug,
  initialProfile,
  initialPricing,
  initialServiceTemplates,
  initialWorkSchedule
}: Props) {
  const [step, setStep] = useState(initialStep);
  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState(isCompleted);
  const [copied, setCopied] = useState(false);

  // Step 1 — business details
  const [profile, setProfile] = useState(initialProfile);

  // Step 3 — pricing
  const [pricing, setPricing] = useState(
    initialPricing ?? {
      label: "Standard rates",
      baseRatePerSquareM: 2.2 as number | null,
      overgrownRate: 3.1 as number | null,
      heavilyOvergrownRate: 4.2 as number | null,
      hourlyRate: 65 as number | null,
      calloutFee: 80 as number | null,
      minimumCharge: 55,
      gstEnabled: true
    }
  );
  const [serviceTemplates, setServiceTemplates] = useState<ServiceTemplate[]>(
    initialServiceTemplates.length > 0
      ? initialServiceTemplates
      : [
          { serviceName: "Standard service", defaultPrice: 80, defaultDuration: 60 },
          { serviceName: "Premium service", defaultPrice: 120, defaultDuration: 90 }
        ]
  );

  // Step 4 — schedule (checkboxes for work days)
  const [workDays, setWorkDays] = useState<WorkScheduleEntry[]>(
    initialWorkSchedule.length > 0
      ? initialWorkSchedule
      : [1, 2, 3, 4, 5].map((d) => ({ dayOfWeek: d, startTime: "07:00", endTime: "17:00" }))
  );

  const post = async (url: string, body: unknown) => {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    if (!data.ok) throw new Error(data.error ?? `POST ${url} failed`);
    return data;
  };

  const advanceTo = async (nextStep: number, saveAction?: () => Promise<void>) => {
    setSaving(true);
    try {
      if (saveAction) await saveAction();
      const isLast = nextStep > 6;
      await post("/api/tenant/onboarding/step", { step: isLast ? 6 : nextStep, completed: isLast });
      if (isLast) {
        setCompleted(true);
        setStep(7); // "complete" state
      } else {
        setStep(nextStep);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Save failed — check your data and try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(enquiryUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const toggleDay = (dayOfWeek: number) => {
    setWorkDays((prev) => {
      const exists = prev.find((d) => d.dayOfWeek === dayOfWeek);
      if (exists) return prev.filter((d) => d.dayOfWeek !== dayOfWeek);
      return [...prev, { dayOfWeek, startTime: "07:00", endTime: "17:00" }].sort(
        (a, b) => a.dayOfWeek - b.dayOfWeek
      );
    });
  };

  const updateDayTime = (dayOfWeek: number, field: "startTime" | "endTime", value: string) => {
    setWorkDays((prev) => prev.map((d) => (d.dayOfWeek === dayOfWeek ? { ...d, [field]: value } : d)));
  };

  const updateTemplate = (index: number, field: keyof ServiceTemplate, value: string | number) => {
    setServiceTemplates((prev) => prev.map((t, i) => (i === index ? { ...t, [field]: value } : t)));
  };

  const addTemplate = () =>
    setServiceTemplates((prev) => [
      ...prev,
      { serviceName: "", defaultPrice: 80, defaultDuration: 60 }
    ]);

  const removeTemplate = (index: number) =>
    setServiceTemplates((prev) => prev.filter((_, i) => i !== index));

  const progressWidth = `${Math.min(100, Math.round(((Math.min(step, 6) - 1) / 5) * 100))}%`;

  // Completion screen
  if (completed || step === 7) {
    return (
      <div className="stack">
        <div className="surface" style={{ textAlign: "center", padding: "48px 32px" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
          <h1>You&apos;re live!</h1>
          <p style={{ color: "#cbd5e1", marginBottom: 24 }}>
            Your business is set up and your automations are ready to activate.
          </p>
          <div className="panel-soft" style={{ marginBottom: 24, textAlign: "left" }}>
            <p style={{ margin: 0, fontWeight: 600 }}>Your customer enquiry link</p>
            <code style={{ fontSize: 13, color: "#94a3b8" }}>{enquiryUrl}</code>
            <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
              <button className="cta" onClick={handleCopy} style={{ fontSize: 13 }}>
                {copied ? "Copied!" : "Copy link"}
              </button>
              <a href={enquiryUrl} target="_blank" rel="noreferrer" className="cta" style={{ background: "#1e293b", fontSize: 13 }}>
                Open form
              </a>
            </div>
          </div>
          <a href="/dashboard" className="cta">
            Go to dashboard →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="stack">
      {/* Progress bar */}
      <div className="surface">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div>
            <div className="eyebrow">Onboarding wizard</div>
            <h1 style={{ margin: 0 }}>Complete your setup</h1>
          </div>
          <span style={{ color: "#94a3b8", fontSize: 13 }}>Step {step} of 6</span>
        </div>
        <div style={{ background: "#1e293b", borderRadius: 99, height: 6, overflow: "hidden" }}>
          <div style={{ background: "#3b82f6", width: progressWidth, height: "100%", transition: "width 0.3s" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
          {["Business", "Branding", "Pricing", "Schedule", "Tools", "Go live"].map((label, i) => (
            <span
              key={label}
              style={{
                fontSize: 11,
                color: i + 1 === step ? "#3b82f6" : i + 1 < step ? "#16a34a" : "#475569",
                fontWeight: i + 1 === step ? 700 : 400
              }}
            >
              {i + 1 < step ? "✓" : `${i + 1}.`} {label}
            </span>
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="surface">
        {step === 1 && (
          <div>
            <h2>Your business</h2>
            <p className="muted">Basic details about your business — used throughout the platform.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 480 }}>
              {[
                { label: "Business name", field: "businessName" as const },
                { label: "Tagline", field: "tagline" as const },
                { label: "Phone", field: "phone" as const },
                { label: "Email", field: "email" as const }
              ].map(({ label, field }) => (
                <label key={field}>
                  <div className="muted" style={{ fontSize: 13, marginBottom: 4 }}>{label}</div>
                  <input
                    className="input"
                    value={profile[field]}
                    onChange={(e) => setProfile((p) => ({ ...p, [field]: e.target.value }))}
                  />
                </label>
              ))}
              <label>
                <div className="muted" style={{ fontSize: 13, marginBottom: 4 }}>Service area suburbs (comma separated)</div>
                <input
                  className="input"
                  value={profile.serviceAreaSuburbs.join(", ")}
                  onChange={(e) =>
                    setProfile((p) => ({
                      ...p,
                      serviceAreaSuburbs: e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                    }))
                  }
                  placeholder="Tannum Sands, Boyne Island, Calliope"
                />
              </label>
              <label>
                <div className="muted" style={{ fontSize: 13, marginBottom: 4 }}>Business type</div>
                <select
                  className="input"
                  value={profile.businessType}
                  onChange={(e) => setProfile((p) => ({ ...p, businessType: e.target.value }))}
                >
                  {[
                    ["lawn_mowing", "Lawn mowing"],
                    ["cleaning", "Cleaning"],
                    ["pest_control", "Pest control"],
                    ["gardening", "Gardening"],
                    ["handyman", "Handyman"],
                    ["pool_service", "Pool service"],
                    ["other", "Other"]
                  ].map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
              <button
                className="cta"
                disabled={saving}
                onClick={() =>
                  advanceTo(2, () =>
                    fetch("/api/tenant/settings/profile-json", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(profile)
                    }).then(() => {})
                  )
                }
              >
                {saving ? "Saving..." : "Save & continue →"}
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2>Branding</h2>
            <p className="muted">
              Your colours are applied to all customer-facing pages — quotes, invoices, agreements, and the public enquiry form.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 480 }}>
              <label>
                <div className="muted" style={{ fontSize: 13, marginBottom: 4 }}>Primary colour</div>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <input
                    type="color"
                    value={profile.primaryColour}
                    onChange={(e) => setProfile((p) => ({ ...p, primaryColour: e.target.value }))}
                    style={{ width: 44, height: 36, border: "none", background: "none", cursor: "pointer" }}
                  />
                  <input
                    className="input"
                    value={profile.primaryColour}
                    onChange={(e) => setProfile((p) => ({ ...p, primaryColour: e.target.value }))}
                    style={{ flex: 1 }}
                  />
                </div>
              </label>
              <label>
                <div className="muted" style={{ fontSize: 13, marginBottom: 4 }}>Accent colour</div>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <input
                    type="color"
                    value={profile.accentColour}
                    onChange={(e) => setProfile((p) => ({ ...p, accentColour: e.target.value }))}
                    style={{ width: 44, height: 36, border: "none", background: "none", cursor: "pointer" }}
                  />
                  <input
                    className="input"
                    value={profile.accentColour}
                    onChange={(e) => setProfile((p) => ({ ...p, accentColour: e.target.value }))}
                    style={{ flex: 1 }}
                  />
                </div>
              </label>
              {/* Live preview */}
              <div
                style={{
                  background: profile.primaryColour,
                  borderRadius: 8,
                  padding: "20px 24px",
                  color: "#fff",
                  marginTop: 8
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 18 }}>{profile.businessName || "Your Business"}</div>
                <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>
                  {profile.tagline || "Your tagline here"}
                </div>
                <button
                  style={{
                    background: profile.accentColour,
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    padding: "8px 20px",
                    marginTop: 12,
                    fontWeight: 600,
                    cursor: "default"
                  }}
                >
                  Get a quote
                </button>
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
              <button className="cta" style={{ background: "#1e293b" }} onClick={() => setStep(1)}>
                ← Back
              </button>
              <button
                className="cta"
                disabled={saving}
                onClick={() =>
                  advanceTo(3, () =>
                    fetch("/api/tenant/settings/profile-json", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        primaryColour: profile.primaryColour,
                        accentColour: profile.accentColour,
                        secondaryColour: profile.secondaryColour,
                        businessName: profile.businessName
                      })
                    }).then(() => {})
                  )
                }
              >
                {saving ? "Saving..." : "Save & continue →"}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2>Services & pricing</h2>
            <p className="muted">Set your pricing rates and the services you offer. The AI uses these to generate quotes.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 520 }}>
              <h3 style={{ margin: "4px 0" }}>Pricing rates</h3>
              {getPricingModel(profile.businessType) === "area_based" && (
                <>
                  {[
                    { label: "Standard rate ($/m²)", field: "baseRatePerSquareM" as const },
                    { label: "Overgrown rate ($/m²)", field: "overgrownRate" as const },
                    { label: "Heavily overgrown rate ($/m²)", field: "heavilyOvergrownRate" as const }
                  ].map(({ label, field }) => (
                    <label key={field}>
                      <div className="muted" style={{ fontSize: 13, marginBottom: 4 }}>{label}</div>
                      <input
                        className="input"
                        type="number"
                        step="0.1"
                        value={pricing[field] ?? ""}
                        onChange={(e) => setPricing((p) => ({ ...p, [field]: parseFloat(e.target.value) }))}
                      />
                    </label>
                  ))}
                </>
              )}
              {getPricingModel(profile.businessType) === "hourly" && (
                <label>
                  <div className="muted" style={{ fontSize: 13, marginBottom: 4 }}>Hourly rate ($/hr)</div>
                  <input
                    className="input"
                    type="number"
                    step="1"
                    value={pricing.hourlyRate ?? ""}
                    onChange={(e) => setPricing((p) => ({ ...p, hourlyRate: parseFloat(e.target.value) }))}
                  />
                </label>
              )}
              {getPricingModel(profile.businessType) === "flat_rate" && (
                <label>
                  <div className="muted" style={{ fontSize: 13, marginBottom: 4 }}>Call-out fee ($)</div>
                  <input
                    className="input"
                    type="number"
                    step="1"
                    value={pricing.calloutFee ?? ""}
                    onChange={(e) => setPricing((p) => ({ ...p, calloutFee: parseFloat(e.target.value) }))}
                  />
                </label>
              )}
              <label>
                <div className="muted" style={{ fontSize: 13, marginBottom: 4 }}>Minimum charge ($)</div>
                <input
                  className="input"
                  type="number"
                  step="1"
                  value={pricing.minimumCharge}
                  onChange={(e) => setPricing((p) => ({ ...p, minimumCharge: parseFloat(e.target.value) }))}
                />
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={pricing.gstEnabled}
                  onChange={(e) => setPricing((p) => ({ ...p, gstEnabled: e.target.checked }))}
                />
                <span>GST enabled (adds 10% to invoices)</span>
              </label>

              <h3 style={{ margin: "12px 0 4px" }}>Service templates</h3>
              {serviceTemplates.map((t, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                  <label style={{ flex: 2 }}>
                    <div className="muted" style={{ fontSize: 12, marginBottom: 2 }}>Service name</div>
                    <input
                      className="input"
                      value={t.serviceName}
                      onChange={(e) => updateTemplate(i, "serviceName", e.target.value)}
                    />
                  </label>
                  <label style={{ flex: 1 }}>
                    <div className="muted" style={{ fontSize: 12, marginBottom: 2 }}>Price ($)</div>
                    <input
                      className="input"
                      type="number"
                      value={t.defaultPrice}
                      onChange={(e) => updateTemplate(i, "defaultPrice", parseInt(e.target.value))}
                    />
                  </label>
                  <label style={{ flex: 1 }}>
                    <div className="muted" style={{ fontSize: 12, marginBottom: 2 }}>Duration (min)</div>
                    <input
                      className="input"
                      type="number"
                      value={t.defaultDuration}
                      onChange={(e) => updateTemplate(i, "defaultDuration", parseInt(e.target.value))}
                    />
                  </label>
                  <button
                    onClick={() => removeTemplate(i)}
                    style={{ background: "none", border: "1px solid #334155", borderRadius: 6, padding: "8px 12px", color: "#dc2626", cursor: "pointer", marginBottom: 0 }}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button onClick={addTemplate} className="cta" style={{ background: "#1e293b", alignSelf: "flex-start" }}>
                + Add service
              </button>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
              <button className="cta" style={{ background: "#1e293b" }} onClick={() => setStep(2)}>
                ← Back
              </button>
              <button
                className="cta"
                disabled={saving}
                onClick={() =>
                  advanceTo(4, () =>
                    fetch("/api/tenant/settings/pricing", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ pricingRate: pricing, serviceTemplates })
                    }).then(() => {})
                  )
                }
              >
                {saving ? "Saving..." : "Save & continue →"}
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h2>Your schedule</h2>
            <p className="muted">
              Set the days and hours you work. Personal commitments help the AI route your jobs around your life.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 520 }}>
              <h3 style={{ margin: "4px 0" }}>Work days</h3>
              {DAYS.map((dayName, i) => {
                const entry = workDays.find((d) => d.dayOfWeek === i);
                return (
                  <div key={i} style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, width: 120 }}>
                      <input
                        type="checkbox"
                        checked={!!entry}
                        onChange={() => toggleDay(i)}
                      />
                      <span>{dayName}</span>
                    </label>
                    {entry && (
                      <>
                        <input
                          className="input"
                          type="time"
                          value={entry.startTime}
                          onChange={(e) => updateDayTime(i, "startTime", e.target.value)}
                          style={{ width: 110 }}
                        />
                        <span className="muted">to</span>
                        <input
                          className="input"
                          type="time"
                          value={entry.endTime}
                          onChange={(e) => updateDayTime(i, "endTime", e.target.value)}
                          style={{ width: 110 }}
                        />
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
              <button className="cta" style={{ background: "#1e293b" }} onClick={() => setStep(3)}>
                ← Back
              </button>
              <button
                className="cta"
                disabled={saving}
                onClick={() =>
                  advanceTo(5, () =>
                    fetch("/api/tenant/settings/schedule", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ workSchedule: workDays, personalCommitments: [] })
                    }).then(() => {})
                  )
                }
              >
                {saving ? "Saving..." : "Save & continue →"}
              </button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div>
            <h2>Connect your tools</h2>
            <p className="muted">
              Connect Xero, Brevo SMS, Brevo Email, DocuSeal, and the rest of your stack to activate every automation. You can skip any and come back later.
            </p>
            <div className="panel-soft" style={{ marginBottom: 20 }}>
              <p style={{ margin: 0 }}>
                Head to <strong>Integrations</strong> in the sidebar to connect each service. Each card has a test button so you can verify your credentials before going live.
              </p>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
              <button className="cta" style={{ background: "#1e293b" }} onClick={() => setStep(4)}>
                ← Back
              </button>
              <a href="/dashboard/integrations" className="cta" style={{ background: "#1e293b" }}>
                Open integrations →
              </a>
              <button className="cta" disabled={saving} onClick={() => advanceTo(6)}>
                {saving ? "Saving..." : "Continue →"}
              </button>
            </div>
          </div>
        )}

        {step === 6 && (
          <div>
            <h2>Your enquiry link</h2>
            <p className="muted">
              Share this link on your website, Facebook, and flyers. Customers submit enquiries here — the AI handles everything from there.
            </p>
            <div className="panel-soft" style={{ marginBottom: 20 }}>
              <code style={{ fontSize: 14, color: "#94a3b8", wordBreak: "break-all" }}>{enquiryUrl}</code>
              <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
                <button className="cta" onClick={handleCopy} style={{ fontSize: 13 }}>
                  {copied ? "Copied!" : "Copy link"}
                </button>
                <a href={enquiryUrl} target="_blank" rel="noreferrer" className="cta" style={{ background: "#1e293b", fontSize: 13 }}>
                  Preview form
                </a>
              </div>
            </div>
            <p className="muted" style={{ fontSize: 13 }}>
              Want your own domain? Go to <strong>Settings → Custom domain</strong> after completing setup.
            </p>
            <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
              <button className="cta" style={{ background: "#1e293b" }} onClick={() => setStep(5)}>
                ← Back
              </button>
              <button
                className="cta"
                disabled={saving}
                onClick={() => advanceTo(7)}
                style={{ background: "#16a34a" }}
              >
                {saving ? "Finishing up..." : "Complete setup 🎉"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
