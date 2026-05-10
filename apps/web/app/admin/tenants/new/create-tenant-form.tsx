"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { tradePresetOptions } from "@flowlab/contracts";

const PLANS = ["starter", "professional", "growth"];
const groupLabels: Record<string, string> = {
  home_services: "Home services",
  outdoor_property: "Outdoor/property",
  cleaning_compliance: "Cleaning/compliance",
  mobile_other: "Mobile/other"
};
const groupedTrades = tradePresetOptions.reduce<Record<string, typeof tradePresetOptions>>((groups, option) => {
  groups[option.group] = [...(groups[option.group] ?? []), option];
  return groups;
}, {});

export function CreateTenantForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setSaving(true);
    try {
      const response = await fetch("/api/admin/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(formData.entries()))
      });
      const data = (await response.json()) as { tenant?: { id: string }; error?: string };
      if (!response.ok || !data.tenant?.id) {
        setError(data.error ?? "Could not create tenant.");
        return;
      }
      router.push(`/admin/tenant/${data.tenant.id}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form action={handleSubmit} className="flow-form">
      <label>
        Business name
        <input name="businessName" required minLength={2} />
      </label>
      <label>
        Owner name
        <input name="ownerName" required minLength={2} />
      </label>
      <label>
        Owner email
        <input name="email" type="email" required />
      </label>
      <label>
        Temporary password
        <input name="password" type="password" required minLength={10} />
      </label>
      <label>
        Phone
        <input name="phone" />
      </label>
      <label>
        Suburb
        <input name="suburb" />
      </label>
      <label>
        Business type
        <select name="businessType" defaultValue="plumbing">
          {Object.entries(groupedTrades).map(([group, options]) => (
            <optgroup key={group} label={groupLabels[group] ?? group}>
              {options.map((option) => (
                <option key={option.businessType} value={option.businessType}>{option.label}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      <label>
        Plan
        <select name="plan" defaultValue="professional">
          {PLANS.map((plan) => (
            <option key={plan} value={plan}>{plan}</option>
          ))}
        </select>
      </label>
      {error ? <p style={{ color: "#dc2626", margin: 0 }}>{error}</p> : null}
      <button className="marketing-button marketing-button--primary auth-button" type="submit" disabled={saving}>
        {saving ? "Creating..." : "Create tenant"}
      </button>
    </form>
  );
}
