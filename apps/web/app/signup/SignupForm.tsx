"use client";

import { useRef, useState } from "react";
import { Turnstile } from "@marsidev/react-turnstile";

const TURNSTILE_SITE_KEY = "0x4AAAAAAC5e9PqgPNA4tJ2F";

interface Props {
  action: (formData: FormData) => Promise<void>;
  startedAt: number;
}

export default function SignupForm({ action, startedAt }: Props) {
  const [captchaToken, setCaptchaToken] = useState<string>("");
  const [captchaError, setCaptchaError] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(formData: FormData) {
    if (!captchaToken) {
      setCaptchaError(true);
      return;
    }
    formData.set("captchaToken", captchaToken);
    await action(formData);
  }

  return (
    <form ref={formRef} action={handleSubmit} className="form-grid">
      <label className="label">
        Business name
        <input className="input" name="businessName" required />
      </label>
      <label className="label">
        Your name
        <input className="input" name="ownerName" required />
      </label>
      <label className="label">
        Email
        <input className="input" name="email" type="email" required />
      </label>
      <label className="label">
        Phone
        <input className="input" name="phone" />
      </label>
      <label className="label">
        Suburb
        <input className="input" name="suburb" />
      </label>
      <label className="label">
        Password
        <input
          className="input"
          name="password"
          type="password"
          required
          minLength={10}
          autoComplete="new-password"
        />
      </label>
      <label className="label">
        Business type
        <select className="select" name="businessType" defaultValue="lawn_mowing">
          {["lawn_mowing","cleaning","pest_control","gardening","handyman","pool_service","other"].map((v) => (
            <option key={v} value={v}>{v.replaceAll("_", " ")}</option>
          ))}
        </select>
      </label>
      <label className="label">
        Plan
        <select className="select" name="plan" defaultValue="professional">
          {["starter", "professional", "growth"].map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
      </label>

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

      <button className="cta" type="submit" disabled={!captchaToken}>
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
