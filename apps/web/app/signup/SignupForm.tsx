"use client";

import { useRef, useState } from "react";
import { Turnstile } from "@marsidev/react-turnstile";

// Use NEXT_PUBLIC_TURNSTILE_SITE_KEY from env when available.
// Locally, set this to Cloudflare's always-pass test key (1x00000000000000000000AA)
// so the widget renders and submits without error.
const TURNSTILE_SITE_KEY =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "0x4AAAAAAC5e9PqgPNA4tJ2F";

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
    <form ref={formRef} action={handleSubmit} className="space-y-4">
      <label className="flex flex-col gap-2 text-sm text-muted-foreground">
        Business name
        <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm" name="businessName" required />
      </label>
      <label className="flex flex-col gap-2 text-sm text-muted-foreground">
        Your name
        <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm" name="ownerName" required />
      </label>
      <label className="flex flex-col gap-2 text-sm text-muted-foreground">
        Email
        <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm" name="email" type="email" required />
      </label>
      <label className="flex flex-col gap-2 text-sm text-muted-foreground">
        Phone
        <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm" name="phone" />
      </label>
      <label className="flex flex-col gap-2 text-sm text-muted-foreground">
        Suburb
        <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm" name="suburb" />
      </label>
      <label className="flex flex-col gap-2 text-sm text-muted-foreground">
        Password
        <input
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          name="password"
          type="password"
          required
          minLength={10}
          autoComplete="new-password"
        />
      </label>
      <label className="flex flex-col gap-2 text-sm text-muted-foreground">
        Business type
        <select className="w-full rounded-lg border bg-background px-3 py-2 text-sm" name="businessType" defaultValue="lawn_mowing">
          {["lawn_mowing","cleaning","pest_control","gardening","handyman","pool_service","other"].map((v) => (
            <option key={v} value={v}>{v.replaceAll("_", " ")}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-2 text-sm text-muted-foreground">
        Plan
        <select className="w-full rounded-lg border bg-background px-3 py-2 text-sm" name="plan" defaultValue="professional">
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

      <button className="inline-flex items-center justify-center rounded-lg border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" type="submit" disabled={!captchaToken}>
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
