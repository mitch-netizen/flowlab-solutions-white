"use client";

import { useMemo, useState } from "react";

import type { BusinessType } from "@flowlab/contracts";
import { getTradePreset, tradePresetOptions } from "@flowlab/contracts";

type PlaceSuggestion = {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
};

const groupLabels: Record<string, string> = {
  home_services: "Home services",
  outdoor_property: "Outdoor/property",
  cleaning_compliance: "Cleaning/compliance",
  mobile_other: "Mobile/other"
};

type XeroImportResult = { imported: number; skipped: number; noEmail: number };

interface Props {
  initialStep: number;
  isCompleted: boolean;
  enquiryUrl: string;
  xeroConnected: boolean;
  initialProfile: {
    businessName: string;
    phone: string;
    businessType: BusinessType;
    serviceAreaSuburbs: string[];
    serviceBaseAddress: string;
    serviceBasePlaceId: string;
    serviceBaseLat: number | null;
    serviceBaseLng: number | null;
    serviceRadiusKm: number | null;
  };
}

export default function OnboardingWizard({ initialStep, isCompleted, enquiryUrl, xeroConnected, initialProfile }: Props) {
  const [step, setStep] = useState(Math.min(Math.max(initialStep, 1), 3));
  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState(isCompleted);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<XeroImportResult | null>(null);

  const [businessName, setBusinessName] = useState(initialProfile.businessName);
  const [selectedBusinessType, setSelectedBusinessType] = useState<BusinessType>(initialProfile.businessType);
  const [mobile, setMobile] = useState(initialProfile.phone);
  const [serviceBaseAddress, setServiceBaseAddress] = useState(initialProfile.serviceBaseAddress || initialProfile.serviceAreaSuburbs[0] || "");
  const [serviceBasePlaceId, setServiceBasePlaceId] = useState(initialProfile.serviceBasePlaceId);
  const [serviceBaseLat, setServiceBaseLat] = useState<number | null>(initialProfile.serviceBaseLat);
  const [serviceBaseLng, setServiceBaseLng] = useState<number | null>(initialProfile.serviceBaseLng);
  const [serviceRadiusKm, setServiceRadiusKm] = useState(initialProfile.serviceRadiusKm ?? getTradePreset(initialProfile.businessType).scheduleDefaults.serviceRadiusKm);
  const [manualSuburbs, setManualSuburbs] = useState(initialProfile.serviceAreaSuburbs.join(", "));
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [mapsPreviewUrl, setMapsPreviewUrl] = useState("");

  const bookingLink = useMemo(() => enquiryUrl || "Your booking link will appear here after setup.", [enquiryUrl]);
  const selectedPreset = useMemo(() => getTradePreset(selectedBusinessType), [selectedBusinessType]);
  const groupedTrades = useMemo(() => {
    return tradePresetOptions.reduce<Record<string, typeof tradePresetOptions>>((groups, option) => {
      groups[option.group] = [...(groups[option.group] ?? []), option];
      return groups;
    }, {});
  }, []);

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

  const searchPlaces = async (value: string) => {
    setServiceBaseAddress(value);
    setServiceBasePlaceId("");
    if (value.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    const res = await fetch(`/api/tenant/maps/autocomplete?q=${encodeURIComponent(value)}`);
    if (!res.ok) return;
    const data = (await res.json()) as { suggestions?: PlaceSuggestion[] };
    setSuggestions(data.suggestions ?? []);
  };

  const confirmPlace = async (place: PlaceSuggestion | null = null) => {
    const manual = manualSuburbs.split(",").map((item) => item.trim()).filter(Boolean);
    const res = await fetch("/api/tenant/maps/geocode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        placeId: place?.placeId || serviceBasePlaceId || undefined,
        address: place ? undefined : serviceBaseAddress,
        radiusKm: serviceRadiusKm,
        manualSuburbs: manual
      })
    });
    if (!res.ok) {
      setError("We couldn't confirm that location. You can still type your service suburbs manually.");
      return;
    }
    const data = (await res.json()) as {
      place: { placeId: string; formattedAddress: string; lat: number; lng: number };
      suggestedSuburbs: string[];
      previewUrl: string | null;
    };
    setServiceBaseAddress(data.place.formattedAddress);
    setServiceBasePlaceId(data.place.placeId);
    setServiceBaseLat(data.place.lat);
    setServiceBaseLng(data.place.lng);
    setManualSuburbs(data.suggestedSuburbs.join(", "));
    setMapsPreviewUrl(data.previewUrl ?? "");
    setSuggestions([]);
    setError("");
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
    <div className="rounded-lg border bg-card p-4" style={{ maxWidth: 760 }}>
      {step === 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <h1 style={{ margin: 0 }}>Tell us about your business</h1>
          <p className="muted" style={{ marginTop: -4 }}>Choose your trade and FlowLab pre-fills pricing, service templates, and schedule defaults. Everything is editable — these are starting points, not locked-in settings.</p>

          <label>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>What&apos;s your business called?</div>
            <input className="w-full rounded-lg border bg-background px-3 py-3 text-sm" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Joe's Plumbing" />
          </label>

          <div style={{ display: "grid", gap: 12 }}>
            <div className="muted" style={{ fontSize: 13 }}>What do you do?</div>
            {Object.entries(groupedTrades).map(([group, options]) => (
              <div key={group} style={{ display: "grid", gap: 8 }}>
                <div className="muted" style={{ fontSize: 12 }}>{groupLabels[group] ?? group}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8 }}>
                  {options.map((trade) => (
                    <button
                      key={trade.businessType}
                      type="button"
                      onClick={() => {
                        setSelectedBusinessType(trade.businessType);
                        setServiceRadiusKm(getTradePreset(trade.businessType).scheduleDefaults.serviceRadiusKm);
                      }}
                      style={{
                        minHeight: 44,
                        borderRadius: 10,
                        border: selectedBusinessType === trade.businessType ? "2px solid #3b82f6" : "1px solid #334155",
                        background: selectedBusinessType === trade.businessType ? "#1e3a8a" : "#0f172a",
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
            ))}
          </div>

          <div className="panel-soft">
            <strong>{selectedPreset.label}</strong> — FlowLab will set a ${selectedPreset.pricingRate.minimumCharge} minimum charge, {selectedPreset.serviceTemplates.length} service templates, {selectedPreset.defaultDurationMins} min default duration, and a {selectedPreset.scheduleDefaults.serviceRadiusKm} km service radius. You can adjust any of these in Settings after setup.
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
                  businessType: selectedBusinessType,
                  serviceBaseAddress: serviceBaseAddress || undefined,
                  serviceBasePlaceId: serviceBasePlaceId || undefined,
                  serviceBaseLat,
                  serviceBaseLng,
                  serviceRadiusKm,
                  serviceAreaSuburbs: manualSuburbs ? manualSuburbs.split(",").map(s => s.trim()).filter(Boolean) : undefined
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
          <h1 style={{ margin: 0 }}>Map your service area</h1>
          <label>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>Business base or main suburb</div>
            <input className="w-full rounded-lg border bg-background px-3 py-3 text-sm" value={serviceBaseAddress} onChange={(e) => void searchPlaces(e.target.value)} />
          </label>
          {suggestions.length > 0 ? (
            <div className="rounded-lg border bg-card/60 p-2" style={{ display: "grid", gap: 6 }}>
              {suggestions.map((item) => (
                <button key={item.placeId} type="button" className="rounded-lg border bg-secondary/40 px-3 py-2 text-left text-sm" onClick={() => void confirmPlace(item)}>
                  <strong>{item.mainText}</strong>
                  <span className="muted"> {item.secondaryText}</span>
                </button>
              ))}
            </div>
          ) : null}
          <label>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>Service radius ({serviceRadiusKm} km) — affects booking page filtering and travel-time checks</div>
            <input className="w-full" type="range" min="5" max="80" step="5" value={serviceRadiusKm} onChange={(e) => setServiceRadiusKm(Number(e.target.value))} />
          </label>
          <label>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>Service suburbs — used on the booking page and quote cover. Drag the radius or type suburbs below, separated by commas.</div>
            <input className="w-full rounded-lg border bg-background px-3 py-3 text-sm" value={manualSuburbs} onChange={(e) => setManualSuburbs(e.target.value)} placeholder="Tannum Sands, Boyne Island, Gladstone" />
          </label>
          <button type="button" className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold" style={{ width: "fit-content" }} onClick={() => void confirmPlace(null)}>Confirm on map</button>
          {mapsPreviewUrl ? (
            <div
              aria-label="Service area map preview"
              className="rounded-lg border"
              role="img"
              style={{ width: "100%", height: 220, backgroundImage: `url(${mapsPreviewUrl})`, backgroundSize: "cover", backgroundPosition: "center" }}
            />
          ) : null}
          <p className="muted" style={{ marginTop: -8 }}>This sets your service area on the booking page and helps FlowLab estimate travel time and schedule jobs. You can update it anytime in Settings.</p>
          {error && <p style={{ color: "#f87171", margin: 0 }}>{error}</p>}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button type="button" className="inline-flex items-center justify-center rounded-lg border bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground" style={{ background: "#1e293b" }} onClick={() => setStep(1)}>Back</button>
            <button
              className="inline-flex items-center justify-center rounded-lg border bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
              disabled={saving}
              onClick={() => {
                if (!businessName.trim()) return setError("Please enter your business name.");
                if (!mobile.trim()) return setError("Please enter your mobile number.");
                if (!serviceBaseAddress.trim() && !manualSuburbs.trim()) return setError("Please enter your service area.");
                void saveAndContinue(3, async () => {
                  const suburbs = manualSuburbs.split(",").map((item) => item.trim()).filter(Boolean);
                  await post("/api/tenant/settings/profile-json", {
                    businessName,
                    phone: mobile,
                    businessType: selectedBusinessType,
                    serviceAreaSuburbs: suburbs,
                    serviceBaseAddress,
                    serviceBasePlaceId,
                    serviceBaseLat,
                    serviceBaseLng,
                    serviceRadiusKm
                  });
                  await post("/api/tenant/settings/schedule", {
                    workSchedule: selectedPreset.scheduleDefaults.workSchedule,
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
          <h1 style={{ margin: 0 }}>You&apos;re ready to take bookings</h1>

          {xeroConnected && (
            <div className="rounded-lg border bg-card/60 p-4" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <strong style={{ fontSize: 14 }}>Import your Xero customers first</strong>
                <p className="muted" style={{ margin: "4px 0 0" }}>
                  Bring all your Xero contacts into FlowLab&apos;s CRM in one go — saves re-entering every client. Contacts already in the CRM are skipped — nothing is overwritten.
                </p>
              </div>
              {importResult ? (
                <p style={{ margin: 0, fontSize: 13, color: "#86efac" }}>
                  Done — {importResult.imported} imported, {importResult.skipped} already existed
                  {importResult.noEmail > 0 ? `, ${importResult.noEmail} skipped (no email)` : ""}.
                </p>
              ) : (
                <button
                  type="button"
                  disabled={importing}
                  className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold"
                  style={{ width: "fit-content" }}
                  onClick={async () => {
                    setImporting(true);
                    try {
                      const res = await fetch("/api/tenant/crm/import/xero", { method: "POST" });
                      if (!res.ok) throw new Error("Import failed");
                      const data = await res.json() as XeroImportResult;
                      setImportResult(data);
                    } catch {
                      setError("Xero import failed. Check your connection and try again.");
                    } finally {
                      setImporting(false);
                    }
                  }}
                >
                  {importing ? "Importing..." : "Import customers from Xero"}
                </button>
              )}
            </div>
          )}

          <p className="muted">Share this link and customers can submit a job request directly. It&apos;ll land in your CRM as an enquiry.</p>
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

          <p className="muted" style={{ margin: 0 }}>You&apos;re set. Let&apos;s send your first quote.</p>
        </div>
      )}
    </div>
  );
}
