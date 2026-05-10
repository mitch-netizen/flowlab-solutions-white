"use client";

import { useRef, useState } from "react";
import { Turnstile } from "@marsidev/react-turnstile";
import { tradePresetOptions } from "@flowlab/contracts";

// Use NEXT_PUBLIC_TURNSTILE_SITE_KEY from env when available.
// Locally, set this to Cloudflare's always-pass test key (1x00000000000000000000AA)
// so the widget renders and submits without error.
const TURNSTILE_SITE_KEY =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "0x4AAAAAAC5e9PqgPNA4tJ2F";

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

interface Props {
  action: (formData: FormData) => Promise<void>;
  startedAt: number;
}

export default function SignupForm({ action, startedAt }: Props) {
  const [captchaToken, setCaptchaToken] = useState<string>("");
  const [captchaError, setCaptchaError] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(formData: FormData) {
    setValidationError(null);

    const businessName = formData.get("businessName")?.toString().trim() ?? "";
    const ownerName = formData.get("ownerName")?.toString().trim() ?? "";
    const email = formData.get("email")?.toString().trim() ?? "";
    const password = formData.get("password")?.toString() ?? "";

    if (businessName.length < 2) return setValidationError("Business name must be at least 2 characters.");
    if (ownerName.length < 2) return setValidationError("Your name must be at least 2 characters.");
    if (!email.includes("@")) return setValidationError("Please enter a valid email address.");
    if (password.length < 10) return setValidationError("Password must be at least 10 characters.");

    if (!captchaToken) {
      setCaptchaError(true);
      return;
    }
    formData.set("captchaToken", captchaToken);
    await action(formData);
  }

  return (
    <form ref={formRef} action={handleSubmit} className="flow-form">
      <label>
        Business name
        <input name="businessName" required />
      </label>
      <label>
        Your name
        <input name="ownerName" required />
      </label>
      <label>
        Email
        <input name="email" type="email" required />
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
        Password
        <input
          name="password"
          type="password"
          required
          minLength={10}
          autoComplete="new-password"
        />
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
          {["starter", "professional", "growth"].map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
      </label>

      {validationError && (
        <p style={{ color: "var(--color-danger, #ef4444)", fontSize: "0.875rem", margin: 0 }}>
          {validationError}
        </p>
      )}

      <Turnstile
        siteKey={TURNSTILE_SITE_KEY}
        onSuccess={(token) => {
          setCaptchaToken(token);
          setCaptchaError(false);
        }}
        onError={() => setCaptchaError(true)}
        onExpire={() => setCaptchaToken("")}
      />
      {captchaError && (
        <p style={{ color: "var(--color-danger, #ef4444)", fontSize: "0.875rem", margin: 0 }}>
          Please complete the security check.
        </p>
      )}

      <button className="marketing-button marketing-button--primary auth-button" type="submit" disabled={!captchaToken}>
        Start free 14-day trial
      </button>

      <input type="hidden" name="formStartedAt" value={startedAt} />
      {/* Honeypot — bots fill this, humans don't */}
      <input
        type="text"
        name="website"
        autoComplete="off"
        tabIndex={-1}
        style={{ position: "absolute", left: "-9999px", opacity: 0 }}
      />
    </form>
  );
}
